import type { CostComparison } from "./fare.mjs"

export interface ShareRouteDetail {
  from: string
  to: string
  rides: number
  oldFare: number
  newFare: number
  meters: number
}

export interface ShareCardData {
  routes: ShareRouteDetail[]
  comparison: CostComparison
  paymentLabel: string
  discountApplies: boolean
  initialSpend: number
  spansMonths: boolean
}

export declare function renderShareCanvas(data: ShareCardData, pageUrl?: string): HTMLCanvasElement
export declare function renderShareBlob(data: ShareCardData, pageUrl?: string): Promise<Blob>
