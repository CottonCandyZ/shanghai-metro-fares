import { readFileSync } from "node:fs"
import { parseArgs } from "node:util"
import { fareForDistance, fareForRoute, shortestPathsFrom } from "../src/lib/fare.mjs"
import { stations } from "../src/lib/network.mjs"
import { closeFareBounds, newFareBounds, oldFareBounds, resolvedByQuote } from "./new-fare-bounds.mjs"

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { "allowance-meters": { type: "string", default: "50" } },
})
const [oldFile, newFile, validationFile] = positionals
if (!oldFile || positionals.length > 3) {
  console.error("用法  node scripts/infer-new-fares.mjs 旧价.ndjson [新价约束.ndjson] [独立验证.ndjson] [--allowance-meters 50]")
  process.exit(2)
}

const size = stations.length
const names = stations.map(({ name }) => name)
const ids = new Map(names.map((name, id) => [name, id]))
const allowance = Number(values["allowance-meters"])
if (!/^\d+$/.test(values["allowance-meters"]) || !Number.isSafeInteger(allowance)) {
  throw new Error("里程余量须为非负整数米")
}

function readReferences(file, key) {
  const rows = new Map()
  if (!file) return rows
  readFileSync(file, "utf8").split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) return
    const row = JSON.parse(line)
    const from = ids.get(row?.from), to = ids.get(row?.to)
    const price = row?.[key]
    if (from === undefined || to === undefined || from === to || !Number.isSafeInteger(price) || price < 3) {
      throw new Error(`${file} 第 ${i + 1} 行的站名或票价无效`)
    }
    const pair = Math.min(from, to) * size + Math.max(from, to)
    if (rows.has(pair) && rows.get(pair) !== price) throw new Error(`${file} 第 ${i + 1} 行的票价与已有报价冲突`)
    rows.set(pair, price)
  })
  return rows
}

function endpoints(pair) {
  return { from: Math.floor(pair / size), to: pair % size }
}

function namedPair(pair) {
  const { from, to } = endpoints(pair)
  return { from: names[from], to: names[to], oldFare: oldReferences.get(pair) }
}

const oldReferences = readReferences(oldFile, "oldFare")
if (!oldReferences.size) throw new Error("缺少旧价参考数据")
const newReferences = readReferences(newFile, "newFare")
const validation = readReferences(validationFile, "newFare")
for (const pair of validation.keys()) {
  if (newReferences.has(pair)) throw new Error("独立验证的站对与推算输入有重叠")
}
const constraints = []
for (const [pair, price] of oldReferences) {
  const [minimum, maximum] = oldFareBounds(price, allowance)
  constraints.push({ ...endpoints(pair), minimum, maximum })
}
for (const [pair, price] of newReferences) {
  const [minimum, maximum] = newFareBounds(price)
  constraints.push({ ...endpoints(pair), minimum, maximum })
}
const model = closeFareBounds(size, constraints)
if (model.conflicting) {
  const { from, to, minimum } = model.conflicting
  throw new Error(`${names[from]} 到 ${names[to]} 的里程约束冲突（下限 ${minimum} 米，上限 ${model.upper[from * size + to]} 米）`)
}

const maximumDistance = model.upper.reduce((max, upper) => Number.isFinite(upper) ? Math.max(max, upper) : max, 0)
const prices = Uint8Array.from({length: maximumDistance + 1}, (_, meters) => fareForDistance(meters).new)
const ambiguous = []
const priceDifferences = []
const validationResults = []
const directEvidence = new Set([...newReferences.keys(), ...validation.keys()])
let directInference = 0
let bounded = 0
let inferred = 0
let singleWithoutOldQuote = 0

for (let from = 0; from < size; from++) {
  const distances = shortestPathsFrom(from).distance
  for (let to = from + 1; to < size; to++) {
    const pair = from * size + to
    const oldPrice = oldReferences.get(pair)
    if (oldPrice !== undefined) {
      const [minimum, maximum] = oldFareBounds(oldPrice, 0)
      if (fareForDistance(minimum).new === fareForDistance(maximum).new) {
        directInference++
        directEvidence.add(pair)
      }
    }
    const minimum = model.lower[pair], maximum = model.upper[pair]
    if (!Number.isFinite(maximum)) continue
    bounded++
    const low = prices[minimum], high = prices[maximum]
    const current = fareForRoute(names[from], names[to], distances[to]).new
    if (low === high) {
      inferred++
      if (oldPrice === undefined) singleWithoutOldQuote++
      if (low !== current && !newReferences.has(pair)) {
        priceDifferences.push({ pair, ...namedPair(pair), meters: [minimum, maximum], current, inferred: low })
      }
    } else {
      ambiguous.push(pair)
    }
    if (validation.has(pair)) {
      const actual = validation.get(pair)
      validationResults.push({ ...namedPair(pair), range: [low, high], current, actual, fits: actual >= low && actual <= high })
    }
  }
}

function shuffledSubset(values, count) {
  const copies = values.slice()
  let seed = 20261123
  for (let i = 0; i < Math.min(count, copies.length); i++) {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0
    const index = i + Math.floor(seed / 2 ** 32 * (copies.length - i))
    const selected = copies[index]
    copies[index] = copies[i]
    copies[i] = selected
  }
  return copies.slice(0, count)
}

function score(pair, targets) {
  const { from, to } = endpoints(pair)
  const first = prices[model.lower[pair]]
  const last = prices[model.upper[pair]]
  const outcomes = []
  for (let price = first; price <= last; price++) {
    outcomes.push({price, resolved: resolvedByQuote(model, from, to, price, targets, prices)})
  }
  const counts = outcomes.map(({ resolved }) => resolved)
  return { pair, outcomes, guaranteed: Math.min(...counts), average: counts.reduce((sum, count) => sum + count, 0) / counts.length }
}

const compareScores = (a, b) => b.guaranteed - a.guaranteed || b.average - a.average || a.pair - b.pair
const targets = shuffledSubset(ambiguous, 2048)
const shortlist = ambiguous.filter(pair => !validation.has(pair)).map(pair => score(pair, targets))
  .sort(compareScores).slice(0, 64)
const samples = shortlist.map(({ pair }) => score(pair, ambiguous)).sort(compareScores).slice(0, 8)
  .map(({ pair, outcomes, guaranteed }) => ({ ...namedPair(pair), outcomes, guaranteed }))

const pairs = size * (size - 1) / 2
console.log(JSON.stringify({
  pairs,
  oldReferenceCount: oldReferences.size,
  directInference,
  newReferenceCount: newReferences.size,
  directOracleCount: newReferences.size + validation.size,
  directEvidenceCount: directEvidence.size,
  withoutDirectEvidence: pairs - directEvidence.size,
  allowanceMeters: allowance,
  bounded,
  inferred,
  singleWithoutOldQuote,
  ambiguousOrUnbounded: pairs - inferred,
  priceDifferences: priceDifferences.length,
  validationResults,
  samples,
  suggestedValidation: shuffledSubset(priceDifferences.filter(({ pair }) => !validation.has(pair)), 10)
    .map(({ pair, ...quote }) => quote),
}, null, 2))
