import { stations } from "./network.mjs"
import type { StationEntry } from "../types.ts"

export function normalizeQuery(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s·•・()]/g, "")
    .replace(/站$/, "")
}

export const stationIndex: StationEntry[] = stations.map((station, id) => ({
  ...station,
  id,
  keys: [station.name, ...station.search].map(normalizeQuery),
}))

const alphabetical = new Intl.Collator("zh-CN-u-co-pinyin")
stationIndex.sort((a, b) => alphabetical.compare(a.name, b.name))

export const stationsByCode = new Map<number, StationEntry>(
  stationIndex.map((station) => [station.code, station])
)

const stationsByName = new Map<string, StationEntry>(
  stationIndex.map((station) => [station.keys[0], station])
)

const stationsByAlias = new Map<string, StationEntry | null>()
for (const station of stationIndex) {
  for (const key of station.keys) {
    if (!stationsByAlias.has(key)) {
      stationsByAlias.set(key, station)
    } else if (stationsByAlias.get(key) !== station) {
      stationsByAlias.set(key, null)
    }
  }
}

export function findStation(query: string): StationEntry | undefined {
  const key = normalizeQuery(query)
  if (!key) return undefined
  return stationsByName.get(key) ?? stationsByAlias.get(key) ?? undefined
}

export function findMatches(query: string): StationEntry[] {
  const key = normalizeQuery(query)
  const matches: [StationEntry[], StationEntry[], StationEntry[]] = [[], [], []]
  for (const station of stationIndex) {
    if (station.keys.includes(key)) {
      matches[0].push(station)
    } else if (station.keys.some((name) => name.startsWith(key))) {
      matches[1].push(station)
    } else if (station.keys.some((name) => name.includes(key))) {
      matches[2].push(station)
    }
  }
  return matches.flat().slice(0, 12)
}

export function lineNames(lines: number[]): string {
  return lines.map((line) => (line === 41 ? "浦江线" : `${line} 号线`)).join(" · ")
}

export function yuan(cents: number): string {
  return (
    "¥" +
    (cents / 100).toLocaleString("zh-CN", {
      minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    })
  )
}
