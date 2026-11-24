import { useEffect, useState } from "react"
import { ArrowDown, Share2 } from "lucide-react"
import type { CostComparison } from "../lib/fare.mjs"
import { yuan } from "../lib/stations.ts"

interface MobileSummaryBarProps {
  comparison: CostComparison | null
  canShare: boolean
  shareGenerating: boolean
  onShare: () => void
}

function scrollToPasses() {
  const target = document.getElementById("passes")
  if (!target) return
  const reduceMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  target.focus({ preventScroll: true })
  target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" })
}

/**
 * Sticky bottom summary for narrow viewports (shown via CSS at <= 56rem).
 * Surfaces the best plan, its cost and savings without scrolling.
 */
export function MobileSummaryBar({
  comparison,
  canShare,
  shareGenerating,
  onShare,
}: MobileSummaryBarProps) {
  const [detailsReached, setDetailsReached] = useState(false)
  const hasComparison = comparison !== null

  useEffect(() => {
    const target = document.getElementById("passes")
    if (!hasComparison || !target || typeof IntersectionObserver !== "function") return

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry) return
      setDetailsReached(entry.intersectionRatio >= 0.2 || entry.boundingClientRect.top < 0)
    }, { rootMargin: "0px 0px -72px 0px", threshold: [0, 0.2] })
    observer.observe(target)
    return () => observer.disconnect()
  }, [hasComparison])

  if (!comparison) return null

  const best = comparison.recommended
  const bestCost = best?.cost ?? comparison.payPerRide
  const planName =
    comparison.rides === 0
      ? "无需购票"
      : best
        ? `${best.capacity} 次计次票`
        : "逐次付费"
  const savingsText =
    comparison.rides === 0
      ? "共 0 次"
      : best && best.savings > 0
        ? `省 ${yuan(best.savings)}`
        : "计次票不划算"

  return (
    <div className="mobile-summary" role="region" aria-label="最省方案摘要">
      <div className="mobile-summary-info" aria-live="polite" aria-atomic="true">
        <span className="mobile-summary-label">{`最省 · ${planName}`}</span>
        <span className="mobile-summary-values">
          <strong className="mobile-summary-cost num">{yuan(bestCost)}</strong>
          <span className="mobile-summary-saving num">{savingsText}</span>
        </span>
      </div>
      {!detailsReached && (
        <button
          type="button"
          className="mobile-summary-detail"
          aria-label="查看票价详情"
          title="查看票价详情"
          onClick={scrollToPasses}
        >
          <ArrowDown size={19} strokeWidth={2.2} aria-hidden="true" />
        </button>
      )}
      <button
        type="button"
        className="mobile-summary-share"
        aria-label={shareGenerating ? "正在生成分享图" : "生成分享图"}
        title="生成分享图"
        disabled={!canShare || shareGenerating}
        onClick={onShare}
      >
        <Share2 size={17} strokeWidth={2.1} aria-hidden="true" />
      </button>
    </div>
  )
}
