import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Plus } from "lucide-react"
import { compareCosts, fareForRoute, shortestDistance } from "./lib/fare.mjs"
import type { PaymentMode } from "./lib/fare.mjs"
import { newFareEstimateGap } from "./lib/new-fare-estimates.mjs"
import { decodePlan, encodePlan, planParam, planStorageKey } from "./lib/plan-state.mjs"
import { renderShareBlob } from "./lib/share.mjs"
import type { ShareCardData } from "./lib/share.mjs"
import { findStation, stationsByCode } from "./lib/stations.ts"
import { Footer } from "./components/Footer.tsx"
import { Header } from "./components/Header.tsx"
import { MobileSummaryBar } from "./components/MobileSummaryBar.tsx"
import { ResultPanel } from "./components/ResultPanel.tsx"
import { PAYMENT_OPTIONS, SettingsPanel } from "./components/SettingsPanel.tsx"
import { ShareDialog } from "./components/ShareDialog.tsx"
import { TripCard } from "./components/TripCard.tsx"
import type { EvaluatedTrip, StationEntry, TripInputRefs, TripState } from "./types.ts"

function restorePlan() {
  const urlPlan = decodePlan(new URL(location.href).searchParams.get(planParam))
  if (urlPlan) return urlPlan
  try {
    return decodePlan(localStorage.getItem(planStorageKey))
  } catch {
    return null
  }
}

function parseSpendCents(text: string): number | null {
  const trimmed = text.trim()
  if (!trimmed || !/^(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/.test(trimmed)) return null
  const amount = Number(trimmed)
  if (!Number.isFinite(amount) || amount < 0 || amount > 99999) return null
  return Math.round(amount * 100)
}

function evaluateTrip(
  trip: TripState,
  crossMonth: boolean,
  focusedField: "from" | "to" | null
): EvaluatedTrip {
  const origin = findStation(trip.fromText)
  const destination = findStation(trip.toText)
  const validPair = Boolean(origin && destination && origin.id !== destination.id)
  const meters =
    validPair && origin && destination
      ? shortestDistance(origin.id, destination.id)
      : Infinity
  const fares =
    Number.isFinite(meters) && origin && destination
      ? fareForRoute(origin.name, destination.name, meters)
      : undefined
  const gap =
    fares && origin && destination
      ? newFareEstimateGap(origin.code, destination.code, meters, fares.new)
      : undefined

  const count =
    trip.rides !== null &&
    Number.isInteger(trip.rides) &&
    trip.rides >= 0 &&
    trip.rides <= 9999
      ? trip.rides
      : null

  const nextMonthValid =
    !crossMonth ||
    (trip.nextMonthRides !== null &&
      Number.isInteger(trip.nextMonthRides) &&
      trip.nextMonthRides >= 0 &&
      trip.nextMonthRides <= (count ?? 9999))

  const savedMonthCount =
    trip.nextMonthRides !== null &&
    Number.isInteger(trip.nextMonthRides) &&
    trip.nextMonthRides >= 0 &&
    trip.nextMonthRides <= 9999
      ? trip.nextMonthRides
      : null

  let unknownField: "from" | "to" | null = null
  if (!origin && trip.fromText.trim() && focusedField !== "from") {
    unknownField = "from"
  } else if (!destination && trip.toText.trim() && focusedField !== "to") {
    unknownField = "to"
  }

  let errorMessage = ""
  let invalidField: EvaluatedTrip["invalidField"] = null
  if (count === null) {
    errorMessage = "单程次数请输入 0 至 9,999 的整数。"
    invalidField = "rides"
  } else if (!nextMonthValid) {
    errorMessage = "下月次数须为整数，且在本组总次数以内。"
    invalidField = "next-month"
  } else if (unknownField) {
    errorMessage = "请在建议列表中选择车站。"
    invalidField = unknownField
  } else if (origin && destination && origin.id === destination.id) {
    errorMessage = "起点站和终点站需为不同车站。"
    invalidField = "to"
  }

  const complete = count !== null && nextMonthValid && (count === 0 || Boolean(fares))

  return {
    key: trip.key,
    fromStation: origin,
    toStation: destination,
    meters,
    fares,
    gap,
    count,
    nextMonthValid,
    complete,
    errorMessage,
    invalidField,
    draft: {
      from: origin?.code ?? 0,
      to: destination?.code ?? 0,
      rides: count,
      nextMonthRides: savedMonthCount,
    },
    value:
      complete && count !== null && count > 0 && fares
        ? {
            fares,
            rides: count,
            nextMonthRides: crossMonth ? (trip.nextMonthRides ?? 0) : 0,
          }
        : null,
    detail:
      complete && count !== null && count > 0 && fares && origin && destination
        ? {
            from: origin.name,
            to: destination.name,
            rides: count,
            oldFare: fares.old,
            newFare: fares.new,
            meters,
          }
        : null,
  }
}

function createInitialState() {
  const saved = restorePlan()
  let keySeq = 0
  const demoTrips: TripState[] = [
    {
      key: ++keySeq,
      fromText: findStation("虹桥火车站")?.name ?? "虹桥火车站",
      toText: findStation("南京东路")?.name ?? "南京东路",
      rides: 44,
      nextMonthRides: 0,
    },
  ]

  const trips: TripState[] = saved
    ? saved.trips.map((draft) => ({
        key: ++keySeq,
        fromText: stationsByCode.get(draft.from)?.name ?? "",
        toText: stationsByCode.get(draft.to)?.name ?? "",
        rides: draft.rides,
        nextMonthRides: draft.nextMonthRides,
      }))
    : demoTrips

  return {
    keySeq,
    payment: (saved?.payment ?? "card") as PaymentMode,
    spansMonths: saved?.spansMonths ?? false,
    monthSpendText: saved
      ? saved.initialSpend === null
        ? ""
        : String(saved.initialSpend / 100)
      : "0",
    monthlyOpen: saved ? saved.spansMonths || saved.initialSpend !== 0 : false,
    trips,
  }
}

export function App() {
  const [initial] = useState(createInitialState)
  const nextKeyRef = useRef(initial.keySeq)
  const refsMap = useRef(new Map<number, TripInputRefs>())
  const addButtonRef = useRef<HTMLButtonElement>(null)
  const lastSavedPlanRef = useRef<string | undefined>(undefined)

  const [trips, setTrips] = useState<TripState[]>(initial.trips)
  const [focusedStation, setFocusedStation] = useState<{
    key: number
    field: "from" | "to"
  } | null>(null)
  const [payment, setPayment] = useState<PaymentMode>(initial.payment)
  const [spansMonths, setSpansMonths] = useState<boolean>(initial.spansMonths)
  const [monthSpendText, setMonthSpendText] = useState<string>(initial.monthSpendText)
  const [monthlyOpen, setMonthlyOpen] = useState<boolean>(initial.monthlyOpen)

  const [shareOpen, setShareOpen] = useState(false)
  const shareOpenRef = useRef(false)
  shareOpenRef.current = shareOpen
  const [shareGenerating, setShareGenerating] = useState(false)
  const [shareBlob, setShareBlob] = useState<Blob | null>(null)
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(null)
  const [sharePageUrl, setSharePageUrl] = useState("")
  const shareUrlRef = useRef<string | null>(null)

  const revokeShareUrl = useCallback(() => {
    if (shareUrlRef.current) {
      URL.revokeObjectURL(shareUrlRef.current)
      shareUrlRef.current = null
    }
    setShareImageUrl(null)
    setShareBlob(null)
  }, [])

  useEffect(() => revokeShareUrl, [revokeShareUrl])

  const registerRefs = useCallback((key: number, patch: Partial<TripInputRefs>) => {
    const prev = refsMap.current.get(key) ?? {
      from: null,
      to: null,
      rides: null,
      nextMonth: null,
    }
    refsMap.current.set(key, { ...prev, ...patch })
  }, [])

  const discountApplies = payment !== "ticket"
  const parsedSpendCents = useMemo(
    () => parseSpendCents(monthSpendText),
    [monthSpendText]
  )
  const spendValid = !discountApplies || parsedSpendCents !== null

  const evaluatedTrips = useMemo(
    () =>
      trips.map((trip) =>
        evaluateTrip(
          trip,
          spansMonths,
          focusedStation?.key === trip.key ? focusedStation.field : null
        )
      ),
    [trips, spansMonths, focusedStation]
  )

  const planUrl = useMemo(() => {
    const encoded = encodePlan({
      payment,
      spansMonths,
      initialSpend: parsedSpendCents,
      trips: evaluatedTrips.map((item) => item.draft),
    })

    if (encoded !== lastSavedPlanRef.current) {
      try {
        localStorage.setItem(planStorageKey, encoded)
      } catch {
        // Links still work when browser blocks localStorage.
      }
      lastSavedPlanRef.current = encoded
    }

    const url = new URL(location.href)
    if (url.searchParams.get(planParam) !== encoded) {
      url.searchParams.set(planParam, encoded)
      try {
        history.replaceState(history.state, "", url)
      } catch {
        // Sharing can still use url.href.
      }
    }
    return url.href
  }, [payment, spansMonths, parsedSpendCents, evaluatedTrips])

  const countsValid = evaluatedTrips.every((item) => item.count !== null)
  const totalRides = evaluatedTrips.reduce((sum, item) => sum + (item.count ?? 0), 0)
  const allComplete = evaluatedTrips.every((item) => item.complete)

  const comparison = useMemo(() => {
    if (!allComplete || !spendValid) return null
    const groups = evaluatedTrips.flatMap((item) => (item.value ? [item.value] : []))
    return compareCosts(groups, {
      initialSpend: discountApplies ? (parsedSpendCents ?? 0) : 0,
      payment,
    })
  }, [allComplete, spendValid, evaluatedTrips, discountApplies, parsedSpendCents, payment])

  const shareData: ShareCardData | null = useMemo(() => {
    if (!comparison || comparison.rides === 0) return null
    const paymentLabel =
      PAYMENT_OPTIONS.find((option) => option.value === payment)?.label ?? ""
    return {
      routes: evaluatedTrips.flatMap((item) => (item.detail ? [item.detail] : [])),
      comparison,
      paymentLabel,
      discountApplies,
      initialSpend: discountApplies ? Number(monthSpendText) || 0 : 0,
      spansMonths,
    }
  }, [
    comparison,
    evaluatedTrips,
    payment,
    discountApplies,
    monthSpendText,
    spansMonths,
  ])

  const updateTrip = useCallback(
    (key: number, updater: (prev: TripState) => TripState) => {
      setTrips((prev) => prev.map((trip) => (trip.key === key ? updater(trip) : trip)))
    },
    []
  )

  const handleAddTrip = () => {
    const newKey = ++nextKeyRef.current
    setTrips((prev) => [
      ...prev,
      { key: newKey, fromText: "", toText: "", rides: 1, nextMonthRides: 0 },
    ])
    requestAnimationFrame(() => {
      refsMap.current.get(newKey)?.from?.focus()
    })
  }

  const handleRemoveTrip = (index: number, key: number) => {
    setTrips((prev) => {
      const remaining = prev.filter((trip) => trip.key !== key)
      const neighbor = remaining[index] ?? remaining[index - 1]
      requestAnimationFrame(() => {
        refsMap.current.delete(key)
        if (neighbor) {
          refsMap.current.get(neighbor.key)?.from?.focus()
        } else {
          addButtonRef.current?.focus()
        }
      })
      return remaining
    })
  }

  const handleSelectFrom = (key: number, station: StationEntry) => {
    updateTrip(key, (trip) => ({ ...trip, fromText: station.name }))
    refsMap.current.get(key)?.to?.focus()
  }

  const handleSelectTo = (key: number, station: StationEntry) => {
    updateTrip(key, (trip) => ({ ...trip, toText: station.name }))
    refsMap.current.get(key)?.rides?.focus()
  }

  const handleEnterRides = (index: number, key: number) => {
    if (evaluatedTrips[index]?.count === null) return
    if (spansMonths) {
      refsMap.current.get(key)?.nextMonth?.focus()
      return
    }
    const nextTrip = trips[index + 1]
    if (nextTrip) {
      refsMap.current.get(nextTrip.key)?.from?.focus()
    } else {
      refsMap.current.get(key)?.rides?.blur()
    }
  }

  const handleEnterNextMonth = (index: number, key: number) => {
    if (!evaluatedTrips[index]?.nextMonthValid) return
    const nextTrip = trips[index + 1]
    if (nextTrip) {
      refsMap.current.get(nextTrip.key)?.from?.focus()
    } else {
      refsMap.current.get(key)?.nextMonth?.blur()
    }
  }

  const handleShare = async () => {
    if (shareGenerating || !shareData) return
    setShareGenerating(true)
    const targetUrl = planUrl
    try {
      const blob = await renderShareBlob(shareData, targetUrl)
      revokeShareUrl()
      const objectUrl = URL.createObjectURL(blob)
      shareUrlRef.current = objectUrl
      setShareBlob(blob)
      setShareImageUrl(objectUrl)
      setSharePageUrl(targetUrl)
      shareOpenRef.current = true
      setShareOpen(true)
    } catch {
      // Allow retry if canvas export fails
    } finally {
      setShareGenerating(false)
    }
  }

  return (
    <>
      <a className="skip-link" href="#fare">
        跳到计算器
      </a>

      <Header />

      <main className="shell layout">
        <div className="col-input">
          <section className="panel trips-panel" id="fare" aria-labelledby="fare-title">
            <div className="panel-head">
              <h2 id="fare-title">我的行程</h2>
              <p className="ride-summary num" role="status">
                {countsValid ? `共 ${trips.length} 组 · ${totalRides} 次` : ""}
              </p>
            </div>
            <p className="hint">填写一个计次票有效期内的乘车次数；去回程不同可分两组。</p>

            <div className="routes">
              {trips.map((trip, index) => (
                <TripCard
                  key={trip.key}
                  index={index}
                  trip={trip}
                  evaluated={evaluatedTrips[index]}
                  crossMonth={spansMonths}
                  hasNextTrip={index < trips.length - 1}
                  canRemove={trips.length > 1}
                  registerRefs={registerRefs}
                  onChangeFrom={(text) =>
                    updateTrip(trip.key, (prev) => ({ ...prev, fromText: text }))
                  }
                  onChangeTo={(text) =>
                    updateTrip(trip.key, (prev) => ({ ...prev, toText: text }))
                  }
                  onSelectFrom={(station) => handleSelectFrom(trip.key, station)}
                  onSelectTo={(station) => handleSelectTo(trip.key, station)}
                  onFocusStationField={(field, focused) => {
                    setFocusedStation((prev) => {
                      if (focused) return { key: trip.key, field }
                      if (prev?.key === trip.key && prev.field === field) return null
                      return prev
                    })
                  }}
                  onChangeRides={(rides) =>
                    updateTrip(trip.key, (prev) => ({ ...prev, rides }))
                  }
                  onEnterRides={() => handleEnterRides(index, trip.key)}
                  onChangeNextMonth={(nextMonthRides) =>
                    updateTrip(trip.key, (prev) => ({ ...prev, nextMonthRides }))
                  }
                  onEnterNextMonth={() => handleEnterNextMonth(index, trip.key)}
                  onSwap={() =>
                    updateTrip(trip.key, (prev) => ({
                      ...prev,
                      fromText: prev.toText,
                      toText: prev.fromText,
                    }))
                  }
                  onRemove={() => handleRemoveTrip(index, trip.key)}
                />
              ))}
            </div>

            <button
              ref={addButtonRef}
              type="button"
              className="add-route"
              onClick={handleAddTrip}
            >
              <Plus size={15} strokeWidth={2.2} aria-hidden="true" />
              <span>添加行程</span>
            </button>
          </section>

          <SettingsPanel
            payment={payment}
            monthSpendText={monthSpendText}
            spendValid={spendValid}
            spansMonths={spansMonths}
            monthlyOpen={monthlyOpen}
            onMonthlyOpenChange={setMonthlyOpen}
            onChangePayment={setPayment}
            onChangeMonthSpendText={setMonthSpendText}
            onChangeSpansMonths={setSpansMonths}
          />
        </div>

        <aside className="col-result" id="passes" aria-labelledby="passes-title" tabIndex={-1}>
          <ResultPanel
            comparison={comparison}
            discountApplies={discountApplies}
            canShare={Boolean(shareData)}
            shareGenerating={shareGenerating}
            onShare={handleShare}
          />
        </aside>
      </main>

      <Footer />

      <MobileSummaryBar
        comparison={comparison}
        canShare={Boolean(shareData)}
        shareGenerating={shareGenerating}
        onShare={handleShare}
      />

      <ShareDialog
        open={shareOpen}
        imageUrl={shareImageUrl}
        blob={shareBlob}
        pageUrl={sharePageUrl}
        onOpenChange={(nextOpen) => {
          shareOpenRef.current = nextOpen
          setShareOpen(nextOpen)
        }}
        onOpenChangeComplete={(nextOpen) => {
          if (!nextOpen && !shareOpenRef.current) revokeShareUrl()
        }}
      />
    </>
  )
}
