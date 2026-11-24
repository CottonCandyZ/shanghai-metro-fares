import { Checkbox } from "@base-ui/react/checkbox"
import { Collapsible } from "@base-ui/react/collapsible"
import { Select } from "@base-ui/react/select"
import { Check, ChevronDown, ChevronRight } from "lucide-react"
import type { PaymentMode } from "../lib/fare.mjs"

export const PAYMENT_OPTIONS: Array<{ value: PaymentMode; label: string; help: string }> = [
  {
    value: "card",
    label: "交通卡／随申码",
    help: "旧规满 ¥70、新规满 ¥90，符合条件的乘次享 9 折。",
  },
  {
    value: "new-only",
    label: "新增渠道（如银联卡）",
    help: "新规同一支付渠道累计满 ¥90，后续乘次享 9 折。",
  },
  {
    value: "ticket",
    label: "原价（无满额优惠）",
    help: "逐次按单程基准票价计入。",
  },
]

const PAYMENT_SELECT_ITEMS = PAYMENT_OPTIONS.map(({ value, label }) => ({ value, label }))

interface SettingsPanelProps {
  payment: PaymentMode
  monthSpendText: string
  spendValid: boolean
  spansMonths: boolean
  monthlyOpen: boolean
  onMonthlyOpenChange: (open: boolean) => void
  onChangePayment: (payment: PaymentMode) => void
  onChangeMonthSpendText: (text: string) => void
  onChangeSpansMonths: (checked: boolean) => void
}

/**
 * Billing settings panel using Base UI Select, Collapsible, and Checkbox.
 */
export function SettingsPanel({
  payment,
  monthSpendText,
  spendValid,
  spansMonths,
  monthlyOpen,
  onMonthlyOpenChange,
  onChangePayment,
  onChangeMonthSpendText,
  onChangeSpansMonths,
}: SettingsPanelProps) {
  const discountApplies = payment !== "ticket"
  const activeOption = PAYMENT_OPTIONS.find((item) => item.value === payment) ?? PAYMENT_OPTIONS[0]

  return (
    <section className="panel settings-panel" aria-label="计费设置">
      <div className="settings-row">
        <label id="payment-label" htmlFor="payment-trigger">
          付款方式
        </label>
        <Select.Root<PaymentMode>
          items={PAYMENT_SELECT_ITEMS}
          value={payment}
          onValueChange={(nextValue) => {
            if (nextValue) onChangePayment(nextValue)
          }}
        >
          <Select.Trigger
            id="payment-trigger"
            className="select-trigger"
            aria-labelledby="payment-label"
            aria-describedby="payment-help"
          >
            <Select.Value className="select-value" />
            <Select.Icon className="select-icon">
              <ChevronDown size={16} strokeWidth={2} aria-hidden="true" />
            </Select.Icon>
          </Select.Trigger>
          <Select.Portal>
            <Select.Positioner
              className="select-positioner"
              sideOffset={6}
              align="start"
              alignItemWithTrigger={false}
            >
              <Select.Popup className="select-popup">
                <Select.List className="select-list">
                  {PAYMENT_OPTIONS.map((option) => (
                    <Select.Item
                      key={option.value}
                      value={option.value}
                      className="select-item"
                    >
                      <Select.ItemText>{option.label}</Select.ItemText>
                      <Select.ItemIndicator className="select-item-indicator">
                        <Check size={15} strokeWidth={2.25} aria-hidden="true" />
                      </Select.ItemIndicator>
                    </Select.Item>
                  ))}
                </Select.List>
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
      </div>

      <small id="payment-help" className="hint">
        {activeOption.help}
      </small>

      <Collapsible.Root
        open={monthlyOpen}
        onOpenChange={onMonthlyOpenChange}
        className="monthly"
      >
        <Collapsible.Trigger className="collapsible-trigger">
          <ChevronRight size={15} strokeWidth={2.2} className="collapsible-chevron" aria-hidden="true" />
          <span>已累计票款 / 跨月</span>
        </Collapsible.Trigger>

        <Collapsible.Panel className="collapsible-panel">
          <div className="monthly-fields">
            <div className="field">
              <label htmlFor="month-spend">本月已累计</label>
              <div className="amount-control">
                <span aria-hidden="true">¥</span>
                <input
                  id="month-spend"
                  type="number"
                  min={0}
                  max={99999}
                  step={0.01}
                  inputMode="decimal"
                  required
                  disabled={!discountApplies}
                  value={monthSpendText}
                  aria-invalid={!spendValid || undefined}
                  aria-describedby={!spendValid ? "usage-error" : undefined}
                  onFocus={(event) => event.currentTarget.select()}
                  onChange={(event) => onChangeMonthSpendText(event.currentTarget.value)}
                />
              </div>
            </div>

            <label className="checkbox-field" htmlFor="spans-months">
              <Checkbox.Root
                id="spans-months"
                className="checkbox-root"
                checked={spansMonths}
                onCheckedChange={(checked) => onChangeSpansMonths(Boolean(checked))}
              >
                <Checkbox.Indicator className="checkbox-indicator">
                  <Check size={13} strokeWidth={2.75} aria-hidden="true" />
                </Checkbox.Indicator>
              </Checkbox.Root>
              <span>行程跨两个自然月</span>
            </label>
          </div>

          <p className="hint" id="month-help">
            {spansMonths
              ? "请在上方每组填入下月次数。下个月从 ¥0 重新累计。"
              : "同一个支付渠道的票款累计到月末，下个月从 ¥0 开始。"}
          </p>
        </Collapsible.Panel>
      </Collapsible.Root>

      {!spendValid && (
        <p id="usage-error" className="error" role="alert">
          已累计票款请输入 0 至 99,999 元，最多两位小数。
        </p>
      )}
    </section>
  )
}
