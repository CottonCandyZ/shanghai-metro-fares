import type { PaymentMode } from "./fare.mjs"

export interface SavedTripDraft {
  from: number
  to: number
  rides: number | null
  nextMonthRides: number | null
}

export interface SavedPlan {
  payment: PaymentMode
  spansMonths: boolean
  initialSpend: number | null
  trips: SavedTripDraft[]
}

export declare const planParam: string
export declare const planStorageKey: string
export declare function encodePlan(plan: SavedPlan): string
export declare function decodePlan(value: string | null | undefined): SavedPlan | null
