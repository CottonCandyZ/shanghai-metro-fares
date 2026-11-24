import { useMemo, useRef, useState } from "react"
import { Autocomplete } from "@base-ui/react/autocomplete"
import { findMatches, findStation, lineNames, stationIndex } from "../lib/stations.ts"
import type { StationEntry } from "../types.ts"

interface StationComboboxProps {
  id: string
  label: string
  roleKind: "from" | "to"
  value: string
  invalid?: boolean
  describedBy?: string
  inputRef: React.Ref<HTMLInputElement>
  onChangeText: (text: string) => void
  onSelectStation: (station: StationEntry) => void
  onFocusChange: (focused: boolean) => void
}

/**
 * Station search combobox backed by Base UI Autocomplete.
 * Preserves IME composition safety, Enter-to-select-and-advance,
 * focus select-all, and blur alias normalization.
 */
export function StationCombobox({
  id,
  label,
  roleKind,
  value,
  invalid = false,
  describedBy,
  inputRef,
  onChangeText,
  onSelectStation,
  onFocusChange,
}: StationComboboxProps) {
  const [open, setOpen] = useState(false)
  const composingRef = useRef(false)
  const highlightedRef = useRef<StationEntry | undefined>(undefined)
  const justSelectedRef = useRef(false)

  const matches = useMemo(() => findMatches(value), [value])

  const commitStation = (station: StationEntry) => {
    justSelectedRef.current = true
    setOpen(false)
    highlightedRef.current = undefined
    onSelectStation(station)
  }

  return (
    <div className={`station-field ${roleKind === "from" ? "origin-field" : "destination-field"}`}>
      <label htmlFor={id}>{label}</label>
      <Autocomplete.Root<StationEntry>
        items={stationIndex}
        filteredItems={matches}
        filter={null}
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen)
          if (!nextOpen) {
            highlightedRef.current = undefined
          }
        }}
        value={value}
        openOnInputClick
        itemToStringValue={(station) => station.name}
        onItemHighlighted={(item) => {
          highlightedRef.current = item
        }}
        onValueChange={(nextValue, details) => {
          if (details.reason === "item-press") {
            const matched =
              findStation(nextValue) ??
              matches.find((station) => station.name === nextValue)
            if (matched) {
              commitStation(matched)
              return
            }
          }
          onChangeText(nextValue)
        }}
      >
        <div className="station-control">
          <span
            className={`stop ${roleKind === "from" ? "origin-stop" : "destination-stop"}`}
            aria-hidden="true"
          />
          <Autocomplete.Input
            ref={inputRef}
            id={id}
            className="station-input"
            type="text"
            placeholder="站名或拼音"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="next"
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            onFocus={(event) => {
              justSelectedRef.current = false
              event.currentTarget.select()
              onFocusChange(true)
            }}
            onBlur={(event) => {
              onFocusChange(false)
              if (justSelectedRef.current) {
                justSelectedRef.current = false
                return
              }
              const currentText = event.currentTarget.value
              const station = findStation(currentText)
              if (station && station.name !== currentText) {
                onChangeText(station.name)
              }
            }}
            onCompositionStart={() => {
              composingRef.current = true
            }}
            onCompositionEnd={() => {
              composingRef.current = false
            }}
            onKeyDown={(event) => {
              if (
                composingRef.current ||
                event.nativeEvent.isComposing ||
                event.keyCode === 229
              ) {
                return
              }
              if (event.key === "Tab") {
                setOpen(false)
                return
              }
              if (event.key === "Enter") {
                // When an item is highlighted inside the open popup, Base UI's
                // ComboboxInput clicks it and fires `item-press` via onValueChange.
                if (open && highlightedRef.current) {
                  return
                }
                const station =
                  findStation(value) ??
                  (open && value.trim() ? matches[0] : undefined)
                if (station) {
                  event.preventDefault()
                  commitStation(station)
                }
              }
            }}
          />
        </div>

        <Autocomplete.Portal>
          <Autocomplete.Positioner
            className="autocomplete-positioner"
            sideOffset={6}
            align="start"
          >
            <Autocomplete.Popup className="autocomplete-popup" finalFocus={false}>
              <Autocomplete.Empty className="autocomplete-empty">
                未找到车站
              </Autocomplete.Empty>
              <Autocomplete.List
                className="autocomplete-list"
                aria-label={`${label}站建议`}
              >
                {(station: StationEntry) => (
                  <Autocomplete.Item
                    key={station.code}
                    value={station}
                    className="autocomplete-item"
                  >
                    <span className="autocomplete-station-name">
                      {station.label ?? station.name}
                    </span>
                    <span className="autocomplete-station-lines">
                      {lineNames(station.lines)}
                    </span>
                  </Autocomplete.Item>
                )}
              </Autocomplete.List>
            </Autocomplete.Popup>
          </Autocomplete.Positioner>
        </Autocomplete.Portal>
      </Autocomplete.Root>
    </div>
  )
}
