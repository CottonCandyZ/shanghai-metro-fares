export interface FareEstimateGap {
  fareDifference: number
  metersApart: number
  fareBoundary: number
}

export declare function newFareEstimateGap(
  from: number,
  to: number,
  meters: number,
  displayedFare: number
): FareEstimateGap | undefined
