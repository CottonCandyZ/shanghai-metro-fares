export const planParam = "p"
export const planStorageKey = "shanghai-metro-fare-plan"

const paymentModes = ["card", "new-only", "ticket"]
const version = "1"

function encodeNumber(value) {
  return value === null ? "_" : value.toString(36)
}

function decodeNumber(token, max, optional = false) {
  if (optional && token === "_") return null
  if (!/^[0-9a-z]+$/.test(token ?? "")) return undefined
  const value = Number.parseInt(token, 36)
  return Number.isSafeInteger(value) && value <= max ? value : undefined
}

export function encodePlan({ payment, spansMonths, initialSpend, trips }) {
  const options = paymentModes.indexOf(payment) * 2 + Number(spansMonths)
  const rows = trips.map(({ from, to, rides, nextMonthRides }) =>
    [from, to, rides, nextMonthRides].map(encodeNumber).join("-")
  )
  return [version, encodeNumber(options), encodeNumber(initialSpend), ...rows].join(".")
}

export function decodePlan(value) {
  if (!value) return null
  const [format, mode, spend, ...rows] = value.split(".")
  if (format !== version || !rows.length) return null

  const options = decodeNumber(mode, paymentModes.length * 2 - 1)
  const initialSpend = decodeNumber(spend, 9_999_900, true)
  if (options === undefined || initialSpend === undefined) return null

  const trips = []
  for (const row of rows) {
    const fields = row.split("-")
    if (fields.length !== 4) return null

    const from = decodeNumber(fields[0], Number.MAX_SAFE_INTEGER)
    const to = decodeNumber(fields[1], Number.MAX_SAFE_INTEGER)
    const rides = decodeNumber(fields[2], 9_999, true)
    const nextMonthRides = decodeNumber(fields[3], 9_999, true)
    if (from === undefined || to === undefined || rides === undefined || nextMonthRides === undefined) return null
    trips.push({ from, to, rides, nextMonthRides })
  }

  return {
    payment: paymentModes[Math.floor(options / 2)],
    spansMonths: options % 2 === 1,
    initialSpend,
    trips,
  }
}
