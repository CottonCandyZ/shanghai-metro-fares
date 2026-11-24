import { createReadStream } from "node:fs"
import { createInterface } from "node:readline"
import { fareForDistance, fareForRoute, shortestPathsFrom } from "../src/lib/fare.mjs"
import { stations } from "../src/lib/network.mjs"

const [file, mode] = process.argv.slice(2)
if (!file || process.argv.length > 4 || (mode !== undefined && mode !== "--published")) {
  console.error("用法  node scripts/audit-fares.mjs <站对数据.ndjson | -> [--published]")
  process.exit(2)
}

const input = file === "-" ? process.stdin : createReadStream(file, { encoding: "utf8" })
const rows = createInterface({ input, crlfDelay: Infinity })
const stationIds = new Map(stations.map(({ name }, id) => [name, id]))
const fields = ["meters", "oldFare", "newFare"]
const checked = Object.fromEntries(fields.map(field => [field, { total: 0, matched: 0 }]))
const pathsByOrigin = new Map()
let lineNumber = 0
let pairs = 0
let mismatches = 0

for await (const line of rows) {
  lineNumber++
  if (!line.trim()) continue

  let row
  try {
    row = JSON.parse(line)
  } catch {
    throw new Error(`第 ${lineNumber} 行的 JSON 格式有误`)
  }

  const from = stationIds.get(row?.from)
  const to = stationIds.get(row?.to)
  if (from === undefined || to === undefined || from === to) {
    throw new Error(`第 ${lineNumber} 行需要两个不同的有效站名`)
  }

  const comparable = fields.filter(field => Object.hasOwn(row, field))
  if (!comparable.length || comparable.some(field => !Number.isSafeInteger(row[field]) || row[field] <= 0)) {
    throw new Error(`第 ${lineNumber} 行需要正整数计费里程（米）或票价（元）`)
  }

  if (!pathsByOrigin.has(from)) pathsByOrigin.set(from, shortestPathsFrom(from))
  const { distance, previous } = pathsByOrigin.get(from)
  const meters = distance[to]
  const fare = mode === "--published"
    ? fareForRoute(row.from, row.to, meters)
    : fareForDistance(meters)
  const actual = { meters, oldFare: fare.old, newFare: fare.new }
  const differences = {}

  for (const field of comparable) {
    checked[field].total++
    if (row[field] === actual[field]) {
      checked[field].matched++
    } else {
      differences[field] = { expected: row[field], actual: actual[field] }
    }
  }

  pairs++
  if (Object.keys(differences).length > 0) {
    mismatches++
    const path = []
    for (let station = to; station !== -1; station = previous[station]) {
      path.push(stations[station].name)
    }
    console.log(JSON.stringify({ from: row.from, to: row.to, meters, path: path.reverse(), differences }))
  }
}

if (pairs === 0) throw new Error("输入没有可核对的站对")
console.error(JSON.stringify({ pairs, mismatches, checked }))
process.exitCode = mismatches > 0 ? 1 : 0
