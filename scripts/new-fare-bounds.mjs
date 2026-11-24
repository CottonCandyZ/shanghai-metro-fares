import { newFareLimits } from "../src/lib/fare.mjs"

export function oldFareBounds(price, allowance) {
  const upper = 6000 + (price - 3) * 10000
  return [price === 3 ? 0 : Math.max(0, upper - 10000 + 1 - allowance), upper + allowance]
}

export function newFareBounds(price) {
  const upper = price => price <= 10 ? newFareLimits[price - 3] : 50000 + (price - 10) * 15000
  return [price === 3 ? 0 : upper(price - 1) + 1, upper(price)]
}

export function closeFareBounds(size, constraints) {
  const upper = new Float64Array(size * size).fill(Infinity)
  const lower = new Float64Array(size * size)
  for (let i = 0; i < size; i++) upper[i * size + i] = 0

  for (const { from, to, minimum, maximum } of constraints) {
    const forward = from * size + to
    const reverse = to * size + from
    upper[forward] = upper[reverse] = Math.min(upper[forward], maximum)
    lower[forward] = lower[reverse] = Math.max(lower[forward], minimum)
  }

  // Any itinerary supplies an upper bound for the shortest fare distance.
  for (let via = 0; via < size; via++) {
    const viaRow = via * size
    for (let from = 0; from < size; from++) {
      const row = from * size
      const toVia = upper[row + via]
      for (let to = 0; to < size; to++) {
        upper[row + to] = Math.min(upper[row + to], toVia + upper[viaRow + to])
      }
    }
  }

  const conflicting = constraints.find(({ from, to, minimum }) => minimum > upper[from * size + to])
  if (conflicting) return { upper, conflicting }

  // Subtract the upper bounds on either end from every fare's lower bound.
  const oneSide = new Float64Array(size * size)
  for (let from = 0; from < size; from++) {
    const row = from * size
    for (let anchor = 0; anchor < size; anchor++) {
      const anchorRow = anchor * size
      const connection = upper[row + anchor]
      for (let to = 0; to < size; to++) {
        oneSide[row + to] = Math.max(oneSide[row + to], lower[anchorRow + to] - connection)
      }
    }
  }
  const tightened = new Float64Array(size * size)
  for (let from = 0; from < size; from++) {
    const row = from * size
    for (let anchor = 0; anchor < size; anchor++) {
      const anchorRow = anchor * size
      for (let to = 0; to < size; to++) {
        tightened[row + to] = Math.max(tightened[row + to], oneSide[row + anchor] - upper[anchorRow + to])
      }
    }
  }
  return { size, lower: tightened, upper }
}

export function resolvedByQuote(model, from, to, quote, targets, prices) {
  const { size, lower, upper } = model
  const origin = from * size
  const destination = to * size
  const [quotedMinimum, quotedMaximum] = newFareBounds(quote)
  const minimum = Math.max(quotedMinimum, lower[origin + to])
  const maximum = Math.min(quotedMaximum, upper[origin + to])
  let resolved = 0

  for (const index of targets) {
    const start = Math.floor(index / size)
    const end = index % size
    const originToStart = upper[origin + start]
    const originToEnd = upper[origin + end]
    const destinationToStart = upper[destination + start]
    const destinationToEnd = upper[destination + end]

    // A new upper-bound edge can appear at most once in a shortest path.
    const newUpper = Math.min(
      upper[index],
      originToStart + maximum + destinationToEnd,
      destinationToStart + maximum + originToEnd,
    )
    // A lower bound can be transmitted along either side of the new edge.
    const newLower = Math.max(
      lower[index],
      lower[origin + end] - maximum - destinationToStart,
      lower[destination + end] - maximum - originToStart,
      lower[origin + start] - maximum - destinationToEnd,
      lower[destination + start] - maximum - originToEnd,
      minimum - originToStart - destinationToEnd,
      minimum - destinationToStart - originToEnd,
    )
    if (prices[newLower] === prices[newUpper]) resolved++
  }
  return resolved
}
