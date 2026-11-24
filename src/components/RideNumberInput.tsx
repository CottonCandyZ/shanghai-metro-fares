import { NumberField } from "@base-ui/react/number-field"
import { Minus, Plus } from "lucide-react"

interface RideNumberInputProps {
  id: string
  label: string
  value: number | null
  max?: number
  enterKeyHint: "next" | "done"
  invalid?: boolean
  describedBy?: string
  showStepper?: boolean
  className?: string
  inputRef: React.Ref<HTMLInputElement>
  onValueChange: (nextValue: number | null) => void
  onEnter: () => void
}

const NUMBER_FORMAT: Intl.NumberFormatOptions = { useGrouping: false }

/**
 * Numeric ride count control built on Base UI NumberField.
 * Supports empty/out-of-range editing for explicit validation feedback,
 * focus select-all, and Enter-to-advance.
 */
export function RideNumberInput({
  id,
  label,
  value,
  max = 9999,
  enterKeyHint,
  invalid = false,
  describedBy,
  showStepper = true,
  className = "ride-field",
  inputRef,
  onValueChange,
  onEnter,
}: RideNumberInputProps) {
  return (
    <div className={`field ${className}`}>
      <label htmlFor={id}>{label}</label>
      <NumberField.Root
        id={id}
        value={value}
        min={0}
        max={max}
        step={1}
        allowOutOfRange
        format={NUMBER_FORMAT}
        onValueChange={(nextValue) => onValueChange(nextValue)}
      >
        <NumberField.Group className={showStepper ? "count-control" : "count-control single"}>
          {showStepper && (
            <NumberField.Decrement
              className="count-step count-down"
              tabIndex={-1}
              aria-label="减少一次"
            >
              <Minus size={14} strokeWidth={2.25} aria-hidden="true" />
            </NumberField.Decrement>
          )}
          <NumberField.Input
            ref={inputRef}
            className="count-input"
            inputMode="numeric"
            enterKeyHint={enterKeyHint}
            required
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            onFocus={(event) => event.currentTarget.select()}
            onKeyDown={(event) => {
              if (event.key !== "Enter" || event.nativeEvent.isComposing) return
              event.preventDefault()
              onEnter()
            }}
          />
          {showStepper && (
            <NumberField.Increment
              className="count-step count-up"
              tabIndex={-1}
              aria-label="增加一次"
            >
              <Plus size={14} strokeWidth={2.25} aria-hidden="true" />
            </NumberField.Increment>
          )}
        </NumberField.Group>
      </NumberField.Root>
    </div>
  )
}
