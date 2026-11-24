import { Share2, Ticket } from "lucide-react"
import type { CostComparison } from "../lib/fare.mjs"
import { yuan } from "../lib/stations.ts"

interface ResultPanelProps {
  comparison: CostComparison | null
  discountApplies: boolean
  canShare: boolean
  shareGenerating: boolean
  onShare: () => void
}

function formatCoverage(rides: number, capacity: number): string {
  const difference = rides - capacity
  if (difference > 0) return `${difference} 次另付`
  if (difference < 0) return `剩 ${Math.abs(difference)} 次`
  return "刚好用完"
}

export function ResultPanel({
  comparison,
  discountApplies,
  canShare,
  shareGenerating,
  onShare,
}: ResultPanelProps) {
  if (!comparison) {
    return (
      <section className="panel result-panel">
        <h2 id="passes-title" className="sr-only">
          优惠对比
        </h2>
        <div className="cost-empty" role="status">
          <Ticket size={24} strokeWidth={1.65} className="cost-empty-icon" aria-hidden="true" />
          <p>填好站点和次数后显示结果</p>
        </div>
      </section>
    )
  }

  const best = comparison.recommended
  const bestCost = best?.cost ?? comparison.payPerRide
  const discounted = comparison.undiscounted - comparison.payPerRide

  const recommendationTitle =
    comparison.rides === 0
      ? "无需购票"
      : best
        ? `最省：${best.capacity} 次计次票`
        : "最省：逐次付费"

  const recommendationDetail =
    comparison.rides === 0
      ? "本期共 0 次乘车。"
      : best
        ? `比新价逐次付省 ${yuan(best.savings)}`
        : "计次票都不划算"

  const discountText = !discountApplies
    ? "未启用"
    : discounted > 0
      ? `省 ${yuan(discounted)}`
      : "本期未达门槛"

  return (
    <section className="panel result-panel">
      <h2 id="passes-title" className="sr-only">
        优惠对比
      </h2>

      <article className="best-hero" aria-live="polite" aria-atomic="true">
        <div className="best-label-row">
          <h3>{recommendationTitle}</h3>
          {comparison.rides > 0 && (
            <span className="best-rides-pill">{`共 ${comparison.rides} 次`}</span>
          )}
        </div>
        <div className="best-figure">
          <p className="best-cost num">{yuan(bestCost)}</p>
          <p className="best-detail">{recommendationDetail}</p>
        </div>
      </article>

      <dl className="compare-grid">
        <div className="compare-item">
          <dt>调价前逐次付</dt>
          <dd className="num quiet-num">{yuan(comparison.previous)}</dd>
        </div>
        <div className="compare-item">
          <dt>调价后逐次付</dt>
          <dd className="num">{yuan(comparison.payPerRide)}</dd>
        </div>
        <div className="compare-item">
          <dt>满额优惠</dt>
          <dd className={`num ${discounted > 0 && discountApplies ? "saving-num" : "muted-num"}`}>
            {discountText}
          </dd>
        </div>
      </dl>

      <div className="plans-section">
        <h3 className="plans-title">计次票</h3>
        <ul className="plans" aria-label="四档计次票预计花费">
          {comparison.passes.map((plan) => {
            const isBest = best === plan
            const savingsText =
              plan.savings === 0
                ? "持平"
                : `${plan.savings > 0 ? "省 " : "多 "}${yuan(Math.abs(plan.savings))}`

            return (
              <li
                key={plan.capacity}
                className={`plan-row${isBest ? " is-best" : ""}`}
              >
                <div className="plan-info">
                  <h4>
                    <span>{`${plan.capacity} 次票`}</span>
                    {isBest && <span className="plan-badge">最省</span>}
                  </h4>
                  <p className="plan-use">
                    {`${yuan(plan.price * 100)} · ${formatCoverage(comparison.rides, plan.capacity)}`}
                  </p>
                </div>
                <div className="plan-num num">
                  <strong>{yuan(plan.cost)}</strong>
                  <p
                    className={`plan-savings${
                      plan.savings > 0 ? " saving" : plan.savings < 0 ? " extra" : ""
                    }`}
                  >
                    {savingsText}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
        <p className="hint plans-hint">
          每档按买一张估算，优先抵扣票价较高的行程，其余按所选方式付费。
        </p>
      </div>

      <div className="share-bar">
        <button
          type="button"
          className="share-btn"
          disabled={!canShare || shareGenerating}
          onClick={onShare}
        >
          <Share2 size={15} strokeWidth={2.1} aria-hidden="true" />
          <span>{shareGenerating ? "正在生成…" : "生成分享图"}</span>
        </button>
      </div>
    </section>
  )
}
