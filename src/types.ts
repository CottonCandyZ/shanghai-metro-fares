import type { FareEstimateGap } from "./lib/new-fare-estimates.mjs"
import type { RouteFare, TripGroupInput } from "./lib/fare.mjs"
import type { SavedTripDraft } from "./lib/plan-state.mjs"
import type { ShareRouteDetail } from "./lib/share.mjs"

export interface StationEntry {
  id: number
  name: string
  label?: string
  lines: number[]
  search: string[]
  code: number
  keys: string[]
}

export interface TripState {
  key: number
  fromText: string
  toText: string
  rides: number | null
  nextMonthRides: number | null
}

export interface EvaluatedTrip {
  key: number
  fromStation: StationEntry | undefined
  toStation: StationEntry | undefined
  meters: number
  fares: RouteFare | undefined
  gap: FareEstimateGap | undefined
  count: number | null
  nextMonthValid: boolean
  complete: boolean
  errorMessage: string
  invalidField: "from" | "to" | "rides" | "next-month" | null
  draft: SavedTripDraft
  value: TripGroupInput | null
  detail: ShareRouteDetail | null
}

export interface TripInputRefs {
  from: HTMLInputElement | null
  to: HTMLInputElement | null
  rides: HTMLInputElement | null
  nextMonth: HTMLInputElement | null
}
