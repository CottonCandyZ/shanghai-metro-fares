import assert from "node:assert/strict"
import test from "node:test"
import { fareForDistance } from "../src/lib/fare.mjs"
import { closeFareBounds, newFareBounds, resolvedByQuote } from "../scripts/new-fare-bounds.mjs"

test("抽样增益与加入候选报价后的完整回算一致", () => {
  const size = 4
  const observations = [
    { from: 0, to: 1, minimum: 3001, maximum: 6000 },
    { from: 1, to: 2, minimum: 3000, maximum: 4000 },
    { from: 2, to: 3, minimum: 4000, maximum: 5000 },
    { from: 0, to: 2, minimum: 6001, maximum: 16000 },
    { from: 0, to: 3, minimum: 9000, maximum: 16000 },
  ]
  const before = closeFareBounds(size, observations)
  const prices = Uint8Array.from({ length: 16001 }, (_, meters) => fareForDistance(meters).new)
  const ambiguous = []
  for (let from = 0; from < size; from++) {
    for (let to = from + 1; to < size; to++) {
      const index = from * size + to
      if (prices[before.lower[index]] !== prices[before.upper[index]]) ambiguous.push(index)
    }
  }

  for (const quote of [3, 4]) {
    const [minimum, maximum] = newFareBounds(quote)
    const after = closeFareBounds(size, [...observations, { from: 0, to: 1, minimum, maximum }])
    const actualGain = ambiguous.filter(index => prices[after.lower[index]] === prices[after.upper[index]]).length
    const predictedGain = resolvedByQuote(before, 0, 1, quote, ambiguous, prices)
    assert(actualGain > 0)
    assert.equal(predictedGain, actualGain)
  }
})

test("判断新价与旧价里程约束是否冲突", () => {
  const competing = [
    { from: 0, to: 1, minimum: 0, maximum: 6000 },
    { from: 1, to: 2, minimum: 0, maximum: 6000 },
    { from: 0, to: 2, minimum: 12001, maximum: 16000 },
  ]
  const model = closeFareBounds(3, competing)
  assert.equal(model.conflicting, competing[2])
  assert.equal(model.upper[2], 12000)
})
