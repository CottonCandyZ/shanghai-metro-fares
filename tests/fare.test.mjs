import assert from "node:assert/strict"
import test from "node:test"
import { fareForDistance, fareForRoute, shortestDistance } from "../src/lib/fare.mjs"
import { newFareEstimateGap } from "../src/lib/new-fare-estimates.mjs"
import { stations } from "../src/lib/network.mjs"

const stationId = name => stations.findIndex(station => station.name === name)

test("国家会展中心的两座同名车站经虹桥火车站联程", () => {
  const line2 = stationId("国家会展中心（2号线）")
  const line17 = stationId("国家会展中心（17号线）")
  const hongqiao = stationId("虹桥火车站")
  const line2Neighbor = stationId("蟠祥路·国家会计学院")
  const line17Neighbor = stationId("蟠龙路")

  assert.equal(shortestDistance(line2Neighbor, line2), 1640)
  assert.equal(shortestDistance(line17, line17Neighbor), 1500)
  assert.equal(
    shortestDistance(line2, line17),
    shortestDistance(line2, hongqiao) + shortestDistance(hongqiao, line17),
  )
  assert.equal(shortestDistance(line2Neighbor, line17Neighbor), 7505)
  assert.equal(shortestDistance(line17Neighbor, line2Neighbor), 7505)
  assert.equal(fareForDistance(shortestDistance(line2Neighbor, line17Neighbor)).old, 4)
})

test("基准里程跨过旧价边界时使用已核对的旧票价", () => {
  const origin = "四平路"
  const destination = "翔殷路"
  const meters = shortestDistance(stationId(origin), stationId(destination))

  assert.equal(fareForDistance(meters).old, 4)
  assert.deepEqual(fareForRoute(origin, destination, meters), { old: 3, new: 4 })
  assert.deepEqual(fareForRoute(destination, origin, meters), { old: 3, new: 4 })
})

test("基隆路到高桥西按官方新价计费", () => {
  const origin = "基隆路"
  const destination = "高桥西"
  const meters = shortestDistance(stationId(origin), stationId(destination))

  assert.equal(fareForDistance(meters).new, 4)
  assert.deepEqual(fareForRoute(origin, destination, meters), { old: 3, new: 3 })
  assert.deepEqual(fareForRoute(destination, origin, meters), { old: 3, new: 3 })
})

test("已核对的报价覆盖新旧临界站对的估算", () => {
  const oldPair = ["国家会展中心（17号线）", "蟠祥路·国家会计学院"]
  const newPair = ["上海南站", "闵行开发区"]
  const distance = pair => shortestDistance(...pair.map(stationId))

  assert.equal(fareForDistance(distance(oldPair)).old, 4)
  assert.equal(fareForRoute(...oldPair, distance(oldPair)).old, 3)
  assert.equal(fareForDistance(distance(newPair)).new, 8)
  assert.equal(fareForRoute(...newPair, distance(newPair)).new, 7)
})

test("沿轨道抽查确认的新价适用于往返行程", () => {
  const quotes = [
    ["耀华路", "芦恒路", 4, 4, 5],
    ["凌兆新村", "西藏南路", 4, 4, 5],
    ["交通大学", "桂林路", 3, 4, 3],
    ["徐家汇", "桂林公园", 3, 4, 3],
    ["上海火车站", "世纪大道", 4, 4, 5],
    ["嘉定北", "真北路", 6, 9, 8],
    ["大华三路", "马陆", 5, 8, 7],
    ["南京西路", "鞍山新村", 4, 5, 4],
    ["世博大道", "漕溪路", 4, 5, 4],
    ["古浪路", "李子园", 3, 4, 3],
  ]

  for (const [from, to, old, estimated, price] of quotes) {
    const meters = shortestDistance(stationId(from), stationId(to))
    assert.equal(fareForDistance(meters).new, estimated)
    assert.deepEqual(fareForRoute(from, to, meters), { old, new: price })
    assert.deepEqual(fareForRoute(to, from, meters), { old, new: price })
  }
})

test("有分歧的新价按站对提示单程偏差方向、里程差和计价线", () => {
  const cases = [
    ["虹桥火车站", "蟠龙路", { fareDifference: 1, metersApart: 60, fareBoundary: 4000 }],
    ["长清路", "静安寺", { fareDifference: -1, metersApart: 9, fareBoundary: 8000 }],
    ["洞泾", "滴水湖", { fareDifference: 1, metersApart: 179, fareBoundary: 95000 }],
    ["古浪路", "李子园", undefined],
    ["虹桥火车站", "南京东路", undefined],
  ]

  for (const [from, to, expected] of cases) {
    const origin = stationId(from)
    const destination = stationId(to)
    const meters = shortestDistance(origin, destination)
    const { new: fare } = fareForRoute(from, to, meters)
    const a = stations[origin].code
    const b = stations[destination].code
    assert.deepEqual(newFareEstimateGap(a, b, meters, fare), expected)
    assert.deepEqual(newFareEstimateGap(b, a, meters, fare), expected)
  }
})
