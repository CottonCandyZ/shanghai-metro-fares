import { stations, links } from "./network.mjs"
import { oldFareOverrides } from "./old-fare-overrides.mjs"

export const newFareLimits = [4000, 8000, 12000, 16000, 23000, 30000, 40000, 50000]
const lastNewFareLimit = newFareLimits.at(-1)
const lastNewFare = newFareLimits.length + 2
const additionalFareMeters = 15000

export const passes = [
  { rides: 35, price: 190 },
  { rides: 45, price: 210 },
  { rides: 60, price: 270 },
  { rides: 90, price: 390 },
]

// Verified historical fares from Shanghai Metro's public journey planner,
// sampled on 2026-11-23 where public mileage fell near the 2005 tariff boundary.
const historicalQuotes = [
  ["人民广场", "景洪路", 4],
  ["徐家汇", "爱国路", 4],
  ["顾村公园", "文井路", 7],
  ["顾村公园", "金吉路", 6],
  ["东方绿舟", "源深路", 9],
  ["嘉定北", "马当路", 6],
  ["航头", "中宁路", 7],
]
const routeKey = (from, to) => [from, to].sort().join("/")
const historicalByRoute = new Map(historicalQuotes.map(([from, to, price]) => [routeKey(from, to), price]))
const officialOldByRoute = new Map()
for (const [origin, quotes] of oldFareOverrides) {
  for (const [destination, price] of quotes) {
    officialOldByRoute.set(routeKey(origin, destination), price)
  }
}

// Ordinary urban-rail fares checked in the operator's browser on 2026-11-23 and 2026-11-24.
const officialNewByRoute = new Map([
  [routeKey("基隆路", "高桥西"), 3],
  [routeKey("人民广场", "景洪路"), 6],
  [routeKey("上海南站", "闵行开发区"), 7],
  [routeKey("耀华路", "芦恒路"), 5],
  [routeKey("凌兆新村", "西藏南路"), 5],
  [routeKey("交通大学", "桂林路"), 3],
  [routeKey("徐家汇", "桂林公园"), 3],
  [routeKey("上海火车站", "世纪大道"), 5],
  [routeKey("嘉定北", "真北路"), 8],
  [routeKey("大华三路", "马陆"), 7],
  [routeKey("南京西路", "鞍山新村"), 4],
  [routeKey("世博大道", "漕溪路"), 4],
  [routeKey("古浪路", "李子园"), 3],
])

const graph = stations.map(() => [])
for (const [from, to, meters] of links) {
  graph[from].push([to, meters])
  graph[to].push([from, meters])
}

export function shortestPathsFrom(from, stopAt) {
  const distance = graph.map(() => Infinity)
  const previous = graph.map(() => -1)
  const settled = graph.map(() => false)
  distance[from] = 0

  for (let step = 0; step < graph.length; step++) {
    let closest = -1
    for (let id = 0; id < graph.length; id++) {
      if (!settled[id] && distance[id] < (distance[closest] ?? Infinity)) {
        closest = id
      }
    }
    if (closest === -1 || closest === stopAt) break

    settled[closest] = true
    for (const [neighbor, meters] of graph[closest]) {
      const candidate = distance[closest] + meters
      if (candidate >= distance[neighbor]) continue
      distance[neighbor] = candidate
      previous[neighbor] = closest
    }
  }
  return { distance, previous }
}

export function shortestDistance(from, to) {
  return shortestPathsFrom(from, to).distance[to]
}

export function fareForDistance(meters) {
  const band = newFareLimits.findIndex((limit) => meters <= limit)
  return {
    old: 3 + Math.ceil(Math.max(0, meters - 6000) / 10000),
    new: band === -1 ? lastNewFare + Math.ceil((meters - lastNewFareLimit) / additionalFareMeters) : band + 3,
  }
}

export function maxDistanceForNewFare(price) {
  return newFareLimits[price - 3] ?? lastNewFareLimit + (price - lastNewFare) * additionalFareMeters
}

export function fareForRoute(from, to, meters) {
  const key = routeKey(from, to)
  const confirmedOld = historicalByRoute.get(key)
  let estimateMeters = meters
  if (confirmedOld !== undefined) {
    // Preserve the calibration for the original journey-planner samples.
    const minimum = confirmedOld === 3 ? 0 : 6001 + (confirmedOld - 4) * 10000
    const maximum = 6000 + (confirmedOld - 3) * 10000
    estimateMeters = Math.min(maximum, Math.max(minimum, meters))
  }

  const estimate = fareForDistance(estimateMeters)
  return {
    old: officialOldByRoute.get(key) ?? estimate.old,
    new: officialNewByRoute.get(key) ?? estimate.new,
  }
}

// Monetary calculations use integer cents, including the initial monthly spend.
const oldDiscount = { threshold: 7000, includeQualifyingRide: true }
const newDiscount = { threshold: 9000, includeQualifyingRide: false }

function interleaveRides(groups, countForMonth) {
  let active = groups.map(({ fares, ...counts }) => ({
    fares,
    remaining: countForMonth(counts),
  })).filter(({ remaining }) => remaining > 0)

  const rides = []
  while (active.length) {
    const nextRound = []
    for (const group of active) {
      rides.push({ fares: group.fares })
      group.remaining--
      if (group.remaining > 0) nextRound.push(group)
    }
    active = nextRound
  }
  return rides
}

function meteredCost(months, tariff, discount, initialSpend, covered) {
  let total = 0
  for (const [month, rides] of months.entries()) {
    let accumulated = month === 0 ? initialSpend : 0
    for (const ride of rides) {
      if (covered?.has(ride)) continue
      const cents = ride.fares[tariff] * 100
      const qualifies = discount &&
        accumulated + (discount.includeQualifyingRide ? cents : 0) >= discount.threshold
      total += qualifies ? cents * 9 / 10 : cents
      accumulated += cents
    }
  }
  return total
}

export function compareCosts(groups, { initialSpend, payment }) {
  const months = [
    interleaveRides(groups, ({ rides, nextMonthRides }) => rides - nextMonthRides),
    interleaveRides(groups, ({ nextMonthRides }) => nextMonthRides),
  ]
  const allRides = months.flat()
  const currentDiscount = payment === "ticket" ? null : newDiscount
  const oldRule = payment === "card" ? oldDiscount : null
  const payPerRide = meteredCost(months, "new", currentDiscount, initialSpend)

  // A pass covers the most expensive rides first. Ties retain chronological order.
  const byFare = allRides.slice().sort((a, b) => b.fares.new - a.fares.new)
  const passCosts = passes.map(({ rides: capacity, price }) => {
    const covered = new Set(byFare.slice(0, capacity))
    const cost = price * 100 + meteredCost(months, "new", currentDiscount, initialSpend, covered)
    return { capacity, price, cost, savings: payPerRide - cost }
  })

  const recommended = passCosts.reduce(
    (best, plan) => plan.cost < (best?.cost ?? payPerRide) ? plan : best,
    null,
  )
  return {
    rides: allRides.length,
    previous: meteredCost(months, "old", oldRule, initialSpend),
    payPerRide,
    undiscounted: allRides.reduce((total, ride) => total + ride.fares.new * 100, 0),
    passes: passCosts,
    recommended,
  }
}
