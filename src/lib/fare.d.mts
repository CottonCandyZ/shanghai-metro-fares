export type PaymentMode = "card" | "new-only" | "ticket"

export interface RouteFare {
  old: number
  new: number
}

export interface PassSpec {
  rides: number
  price: number
}

export interface PassCost extends PassSpec {
  capacity: number
  cost: number
  savings: number
}

export interface CostComparison {
  rides: number
  previous: number
  payPerRide: number
  undiscounted: number
  passes: PassCost[]
  recommended: PassCost | null
}

export interface TripGroupInput {
  fares: RouteFare
  rides: number
  nextMonthRides: number
}

export declare const newFareLimits: number[]
export declare const passes: PassSpec[]
export declare function shortestDistance(from: number, to: number): number
export declare function fareForDistance(meters: number): RouteFare
export declare function maxDistanceForNewFare(price: number): number
export declare function fareForRoute(from: string, to: string, meters: number): RouteFare
export declare function compareCosts(
  groups: TripGroupInput[],
  options: { initialSpend: number; payment: PaymentMode }
): CostComparison
