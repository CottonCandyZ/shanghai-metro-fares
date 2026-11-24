import { AlertTriangle, ArrowLeftRight, X } from "lucide-react"
import { yuan } from "../lib/stations.ts"
import type { EvaluatedTrip, StationEntry, TripInputRefs, TripState } from "../types.ts"
import { RideNumberInput } from "./RideNumberInput.tsx"
import { StationCombobox } from "./StationCombobox.tsx"

interface TripCardProps {
  index: number
  trip: TripState
  evaluated: EvaluatedTrip
  crossMonth: boolean
  hasNextTrip: boolean
  canRemove: boolean
  registerRefs: (key: number, patch: Partial<TripInputRefs>) => void
  onChangeFrom: (text: string) => void
  onChangeTo: (text: string) => void
  onSelectFrom: (station: StationEntry) => void
  onSelectTo: (station: StationEntry) => void
  onFocusStationField: (field: "from" | "to", focused: boolean) => void
  onChangeRides: (rides: number | null) => void
  onEnterRides: () => void
  onChangeNextMonth: (rides: number | null) => void
  onEnterNextMonth: () => void
  onSwap: () => void
  onRemove: () => void
}

export function TripCard({
  index,
  trip,
  evaluated,
  crossMonth,
  hasNextTrip,
  canRemove,
  registerRefs,
  onChangeFrom,
  onChangeTo,
  onSelectFrom,
  onSelectTo,
  onFocusStationField,
  onChangeRides,
  onEnterRides,
  onChangeNextMonth,
  onEnterNextMonth,
  onSwap,
  onRemove,
}: TripCardProps) {
  const tripId = `trip-${trip.key}`
  const errorId = `${tripId}-error`
  const hasError = Boolean(evaluated.errorMessage)
  const describedBy = (field: EvaluatedTrip["invalidField"]) =>
    hasError && evaluated.invalidField === field ? errorId : undefined

  const changeCents = evaluated.fares
    ? (evaluated.fares.new - evaluated.fares.old) * 100
    : 0

  return (
    <fieldset
      className={`route-row${crossMonth ? " has-next-month" : ""}`}
      aria-label={`行程 ${index + 1}`}
    >
      <legend className="sr-only">{`行程 ${index + 1}`}</legend>

      <div className="route-row-head">
        <span className="route-index">{`行程 ${index + 1}`}</span>
        {canRemove && (
          <button
            type="button"
            className="remove-route"
            aria-label={`删除行程 ${index + 1}`}
            onClick={onRemove}
          >
            <X size={14} strokeWidth={2.1} aria-hidden="true" />
            <span>删除</span>
          </button>
        )}
      </div>

      <div className="route-fields">
        <StationCombobox
          id={`${tripId}-from`}
          label="起点"
          roleKind="from"
          value={trip.fromText}
          invalid={evaluated.invalidField === "from"}
          describedBy={describedBy("from")}
          inputRef={(el) => registerRefs(trip.key, { from: el })}
          onChangeText={onChangeFrom}
          onSelectStation={onSelectFrom}
          onFocusChange={(focused) => onFocusStationField("from", focused)}
        />

        <button
          type="button"
          className="swap-btn"
          aria-label="互换起点站和终点站"
          title="互换起终点"
          onClick={onSwap}
        >
          <ArrowLeftRight size={14} strokeWidth={2} aria-hidden="true" />
        </button>

        <StationCombobox
          id={`${tripId}-to`}
          label="终点"
          roleKind="to"
          value={trip.toText}
          invalid={evaluated.invalidField === "to"}
          describedBy={describedBy("to")}
          inputRef={(el) => registerRefs(trip.key, { to: el })}
          onChangeText={onChangeTo}
          onSelectStation={onSelectTo}
          onFocusChange={(focused) => onFocusStationField("to", focused)}
        />

        <RideNumberInput
          id={`${tripId}-rides`}
          label="次数"
          value={trip.rides}
          max={9999}
          enterKeyHint={crossMonth || hasNextTrip ? "next" : "done"}
          invalid={evaluated.invalidField === "rides"}
          describedBy={describedBy("rides")}
          inputRef={(el) => registerRefs(trip.key, { rides: el })}
          onValueChange={onChangeRides}
          onEnter={onEnterRides}
        />

        {crossMonth && (
          <RideNumberInput
            id={`${tripId}-next-month`}
            label="其中下月"
            value={trip.nextMonthRides}
            max={evaluated.count ?? 9999}
            enterKeyHint={hasNextTrip ? "next" : "done"}
            invalid={evaluated.invalidField === "next-month"}
            describedBy={describedBy("next-month")}
            showStepper={false}
            className="month-count"
            inputRef={(el) => registerRefs(trip.key, { nextMonth: el })}
            onValueChange={onChangeNextMonth}
            onEnter={onEnterNextMonth}
          />
        )}
      </div>

      {hasError && (
        <p id={errorId} className="error" role="alert">
          {evaluated.errorMessage}
        </p>
      )}

      {evaluated.fares && (
        <div className="route-prices" aria-live="polite">
          <div className="route-prices-main">
            <span className="fare-old">
              旧 <strong>{yuan(evaluated.fares.old * 100)}</strong>
            </span>
            <span className="fare-arrow" aria-hidden="true">
              →
            </span>
            <span className="fare-new">
              新 <strong>{yuan(evaluated.fares.new * 100)}</strong>
            </span>
            <span
              className={`fare-diff${
                changeCents > 0 ? " extra" : changeCents < 0 ? " saving" : ""
              }`}
            >
              {changeCents === 0
                ? "持平"
                : `${changeCents > 0 ? "+" : "−"}${yuan(Math.abs(changeCents))}/程`}
            </span>
            <span className="route-distance">
              {`约 ${(evaluated.meters / 1000).toFixed(1)} km`}
            </span>
          </div>

          {evaluated.gap && (
            <p className="fare-estimate-note">
              <AlertTriangle size={14} strokeWidth={2} aria-hidden="true" />
              <span>
                {`置信度较低 · 新价可能${
                  evaluated.gap.fareDifference > 0 ? "多算" : "少算"
                } ¥1/程。两套里程估算相差约 ${evaluated.gap.metersApart.toLocaleString(
                  "zh-CN"
                )} 米，跨过 ${evaluated.gap.fareBoundary / 1000} 公里计价线。`}
              </span>
            </p>
          )}
        </div>
      )}
    </fieldset>
  )
}
