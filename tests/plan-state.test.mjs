import assert from "node:assert/strict"
import test from "node:test"
import { stations } from "../src/lib/network.mjs"
import { decodePlan, encodePlan } from "../src/lib/plan-state.mjs"

const code = (name) => stations.find((station) => station.name === name).code

test("行程链接保留同名站、去回程次数和付款设置", () => {
  const plan = {
    payment: "new-only",
    spansMonths: true,
    initialSpend: 8999,
    trips: [
      { from: code("国家会展中心（2号线）"), to: code("南京东路"), rides: 11, nextMonthRides: 2 },
      { from: code("南京东路"), to: code("国家会展中心（17号线）"), rides: 11, nextMonthRides: 4 },
    ],
  }
  const encoded = encodePlan(plan)

  assert.notEqual(plan.trips[0].from, plan.trips[1].to)
  assert.match(encoded, /^[0-9a-z.-]+$/)
  assert.deepEqual(decodePlan(encoded), plan)
})

test("保存草稿时保留未选择的站与尚未填写的次数", () => {
  const plan = {
    payment: "card",
    spansMonths: false,
    initialSpend: null,
    trips: [{ from: 0, to: 0, rides: null, nextMonthRides: 0 }],
  }

  assert.deepEqual(decodePlan(encodePlan(plan)), plan)
  assert.equal(decodePlan("1.9.0.0-0-1-0"), null)
  assert.equal(decodePlan("1.0.0.0-0-zzzz-0"), null)
  assert.equal(decodePlan("2.0.0.0-0-1-0"), null)
  assert.equal(decodePlan("1.0.0"), null)
})

test("线网的保存代号均为不同的正整数", () => {
  const codes = stations.map((station) => station.code)
  assert(codes.every((value) => Number.isSafeInteger(value) && value > 0))
  assert.equal(new Set(codes).size, stations.length)
})
