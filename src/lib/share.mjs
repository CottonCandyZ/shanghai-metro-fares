import { encode } from "./vendor/uqr.mjs"

const FONT_FAMILY = '-apple-system, "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", system-ui, sans-serif'

const COLORS = {
  bg: "#F7F6F2",
  paper: "#FFFFFF",
  ink: "#16161A",
  quiet: "#5A5960",
  faint: "#8E8D94",
  line: "#E7E5DF",
  field: "#F2F1EC",
  accent: "#16161A",
  accentWash: "#FAF6EC",
  saving: "#B45309",
  up: "#C83E2B",
  upWash: "#FDF2F0",
  heroHighlight: "#FBBF24",
  heroPillBg: "#2A2A32",
  heroMuted: "#A1A1AA",
  footerBg: "#FAF9F6",
}

function yuan(cents) {
  return "¥" + (cents / 100).toLocaleString("zh-CN", {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })
}

function roundedRectPath(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + w - radius, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
  ctx.lineTo(x + w, y + h - radius)
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
  ctx.lineTo(x + radius, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

function fillRoundedRect(ctx, x, y, w, h, r, fillStyle) {
  roundedRectPath(ctx, x, y, w, h, r)
  ctx.fillStyle = fillStyle
  ctx.fill()
}

function truncateText(ctx, text, maxWidth) {
  if (maxWidth <= 0) return ""
  if (ctx.measureText(text).width <= maxWidth) return text
  const ellipsis = "…"
  const ellipsisWidth = ctx.measureText(ellipsis).width
  if (ellipsisWidth >= maxWidth) return ellipsis
  let end = text.length
  while (end > 0 && ctx.measureText(text.slice(0, end)).width + ellipsisWidth > maxWidth) {
    end--
  }
  return text.slice(0, end) + ellipsis
}

function drawPill(ctx, x, y, text, { bg, fg, font, height = 20, padX = 8, radius = 99 }) {
  ctx.save()
  ctx.font = font
  const textWidth = ctx.measureText(text).width
  const width = textWidth + padX * 2
  fillRoundedRect(ctx, x, y, width, height, radius, bg)
  ctx.fillStyle = fg
  ctx.textBaseline = "middle"
  ctx.textAlign = "left"
  ctx.fillText(text, x + padX, y + height / 2 + 0.5)
  ctx.restore()
  return width
}

const QR_SIZE = 123

function drawSiteQr(ctx, x, y, pageUrl, scale) {
  const qrUrl = new URL(pageUrl)
  qrUrl.search = ""
  const { data: rows } = encode(qrUrl.href, { border: 4, boostEcc: true })
  const pixelWidth = QR_SIZE * scale
  const moduleWidth = Math.floor(pixelWidth / rows.length)
  const offset = Math.floor((pixelWidth - rows.length * moduleWidth) / 2) / scale
  const side = moduleWidth / scale

  ctx.fillStyle = COLORS.paper
  ctx.fillRect(x, y, QR_SIZE, QR_SIZE)
  ctx.fillStyle = COLORS.ink
  for (const [rowIndex, row] of rows.entries()) {
    for (let column = 0; column < row.length; column++) {
      if (!row[column]) continue
      ctx.fillRect(x + offset + column * side, y + offset + rowIndex * side, side, side)
    }
  }
}

function formatCoverage(rides, capacity) {
  const difference = rides - capacity
  if (difference > 0) return difference + " 次另付"
  if (difference < 0) return "剩 " + Math.abs(difference) + " 次"
  return "刚好用完"
}

export function renderShareCanvas(data, pageUrl = location.href) {
  const {
    routes = [],
    comparison,
    paymentLabel = "",
    discountApplies = true,
    initialSpend = 0,
    spansMonths = false,
  } = data

  const width = 400
  const scale = 2
  const outerPad = 16
  const cardRadius = 14
  const cardX = outerPad
  const cardY = outerPad
  const cardW = width - outerPad * 2
  const innerPad = 18
  const contentX = cardX + innerPad
  const contentRight = cardX + cardW - innerPad
  const contentW = cardW - innerPad * 2

  const maxVisibleRoutes = 6
  const hasOverflowRoutes = routes.length > maxVisibleRoutes
  const shownRoutes = hasOverflowRoutes ? routes.slice(0, 5) : routes
  const extraRoutesCount = hasOverflowRoutes ? routes.length - 5 : 0

  const heroH = 148
  const compareH = 74
  const tripsHeaderH = 34
  const routeRowH = 48
  const extraRoutesNoteH = hasOverflowRoutes ? 24 : 0
  const tripsPadBottom = 10
  const tripsH = tripsHeaderH + shownRoutes.length * routeRowH + extraRoutesNoteH + tripsPadBottom

  const passesHeaderH = 34
  const passRowH = 44
  const passesPadBottom = 12
  const passesH = passesHeaderH + comparison.passes.length * passRowH + passesPadBottom

  const footerH = QR_SIZE + 24
  const cardH = heroH + compareH + tripsH + passesH + footerH
  const totalH = cardH + outerPad * 2

  const canvas = document.createElement("canvas")
  canvas.width = width * scale
  canvas.height = totalH * scale

  const ctx = canvas.getContext("2d")
  ctx.scale(scale, scale)
  ctx.textBaseline = "top"

  // Outer canvas background
  ctx.fillStyle = COLORS.bg
  ctx.fillRect(0, 0, width, totalH)

  // Clip everything inside the rounded card
  ctx.save()
  roundedRectPath(ctx, cardX, cardY, cardW, cardH, cardRadius)
  ctx.clip()

  // Fill the middle once so the header and footer keep clean rounded edges.
  ctx.fillStyle = COLORS.paper
  ctx.fillRect(cardX, cardY + heroH, cardW, cardH - heroH - footerH)

  let y = cardY

  // 1. Dark Hero Section
  ctx.fillStyle = COLORS.ink
  ctx.fillRect(cardX, y, cardW, heroH)

  ctx.font = `500 12px ${FONT_FAMILY}`
  ctx.fillStyle = COLORS.heroMuted
  ctx.textAlign = "left"
  ctx.fillText("上海地铁票价计算器", contentX, y + 18)

  const pillText = "12月1日起调价"
  const pillFont = `600 11px ${FONT_FAMILY}`
  ctx.font = pillFont
  const pillW = ctx.measureText(pillText).width + 16
  drawPill(ctx, contentRight - pillW, y + 15, pillText, {
    bg: COLORS.heroPillBg,
    fg: COLORS.heroHighlight,
    font: pillFont,
    height: 20,
    padX: 8,
  })

  const best = comparison.recommended
  const bestCost = best?.cost ?? comparison.payPerRide
  const heroTitle = comparison.rides === 0
    ? "无需购票"
    : best
      ? "最省：" + best.capacity + " 次计次票"
      : "最省：逐次付费"

  ctx.font = `600 13px ${FONT_FAMILY}`
  ctx.fillStyle = COLORS.heroMuted
  ctx.textAlign = "left"
  ctx.fillText(heroTitle, contentX, y + 48)

  ctx.font = `700 40px ${FONT_FAMILY}`
  ctx.fillStyle = "#ffffff"
  ctx.fillText(yuan(bestCost), contentX, y + 68)

  const heroSub = comparison.rides === 0
    ? "本期共 0 次乘车"
    : best
      ? "比新价逐次付省 " + yuan(best.savings)
      : "计次票都不划算"
  ctx.font = `600 13.5px ${FONT_FAMILY}`
  ctx.fillStyle = COLORS.heroHighlight
  ctx.fillText(heroSub, contentX, y + 116)

  y += heroH

  // 2. Pay-per-ride vs Previous Strip
  const colW = cardW / 2
  const col1X = contentX
  const col2X = cardX + colW + innerPad

  ctx.font = `500 11px ${FONT_FAMILY}`
  ctx.fillStyle = COLORS.quiet
  ctx.textAlign = "left"
  ctx.fillText("新价逐次付", col1X, y + 13)
  ctx.fillText("调价前逐次付", col2X, y + 13)

  ctx.font = `700 18px ${FONT_FAMILY}`
  ctx.fillStyle = COLORS.ink
  ctx.fillText(yuan(comparison.payPerRide), col1X, y + 30)
  ctx.fillStyle = COLORS.quiet
  ctx.fillText(yuan(comparison.previous), col2X, y + 30)

  const discounted = comparison.undiscounted - comparison.payPerRide
  const leftSub = !discountApplies
    ? "按基准票价"
    : discounted > 0
      ? "满额优惠省 " + yuan(discounted)
      : "暂无满额折扣"
  ctx.font = `400 11px ${FONT_FAMILY}`
  ctx.fillStyle = COLORS.faint
  ctx.fillText(truncateText(ctx, leftSub, colW - innerPad * 2), col1X, y + 53)

  const diffVsOld = bestCost - comparison.previous
  let rightSub = "与调价前持平"
  let rightSubColor = COLORS.faint
  if (diffVsOld > 0) {
    rightSub = "最优仍多 " + yuan(diffVsOld)
    rightSubColor = COLORS.up
  } else if (diffVsOld < 0) {
    rightSub = "比调价前省 " + yuan(-diffVsOld)
    rightSubColor = COLORS.saving
  }
  ctx.fillStyle = rightSubColor
  ctx.fillText(truncateText(ctx, rightSub, colW - innerPad * 2), col2X, y + 53)

  // Vertical divider and bottom border
  ctx.strokeStyle = COLORS.line
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(cardX + colW + 0.5, y + 12)
  ctx.lineTo(cardX + colW + 0.5, y + compareH - 12)
  ctx.moveTo(cardX, y + compareH - 0.5)
  ctx.lineTo(cardX + cardW, y + compareH - 0.5)
  ctx.stroke()

  y += compareH

  // 3. Trips List
  ctx.font = `600 12px ${FONT_FAMILY}`
  ctx.fillStyle = COLORS.quiet
  ctx.textAlign = "left"
  ctx.fillText("我的行程", contentX, y + 13)

  const extraMeta = []
  if (initialSpend > 0) extraMeta.push("已累计 " + yuan(Math.round(initialSpend * 100)))
  if (spansMonths) extraMeta.push("跨月")
  const metaParts = [
    "共 " + routes.length + " 组 · " + comparison.rides + " 次",
    paymentLabel,
    ...extraMeta,
  ].filter(Boolean)
  const tripMeta = metaParts.join(" · ")
  ctx.font = `400 11px ${FONT_FAMILY}`
  ctx.fillStyle = COLORS.faint
  const maxMetaW = contentW - 64
  const fittedMeta = truncateText(ctx, tripMeta, maxMetaW)
  ctx.textAlign = "right"
  ctx.fillText(fittedMeta, contentRight, y + 14)

  let ry = y + tripsHeaderH
  for (let i = 0; i < shownRoutes.length; i++) {
    const route = shownRoutes[i]
    if (i > 0) {
      ctx.strokeStyle = COLORS.field
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(contentX, ry - 2)
      ctx.lineTo(contentRight, ry - 2)
      ctx.stroke()
    }

    // Accent origin dot
    ctx.fillStyle = COLORS.accent
    ctx.beginPath()
    ctx.arc(contentX + 4, ry + 10, 3.5, 0, Math.PI * 2)
    ctx.fill()

    // Right-aligned ride count
    const ridesText = route.rides + " 次"
    ctx.font = `600 12px ${FONT_FAMILY}`
    ctx.fillStyle = COLORS.quiet
    ctx.textAlign = "right"
    const ridesW = ctx.measureText(ridesText).width
    ctx.fillText(ridesText, contentRight, ry + 3)

    // Route station names
    const stationText = route.from + " → " + route.to
    ctx.font = `600 13px ${FONT_FAMILY}`
    ctx.fillStyle = COLORS.ink
    ctx.textAlign = "left"
    const maxStationW = contentW - 14 - ridesW - 10
    ctx.fillText(truncateText(ctx, stationText, maxStationW), contentX + 13, ry + 2)

    // Second line: old -> new fare + diff pill + distance
    const oldText = "旧 " + yuan(route.oldFare * 100) + " → "
    const newText = "新 " + yuan(route.newFare * 100)
    ctx.font = `400 11.5px ${FONT_FAMILY}`
    ctx.fillStyle = COLORS.quiet
    ctx.textAlign = "left"
    ctx.fillText(oldText, contentX + 13, ry + 23)
    const oldW = ctx.measureText(oldText).width

    ctx.font = `700 11.5px ${FONT_FAMILY}`
    ctx.fillStyle = COLORS.ink
    ctx.fillText(newText, contentX + 13 + oldW, ry + 23)
    const newW = ctx.measureText(newText).width

    const change = (route.newFare - route.oldFare) * 100
    const diffLabel = change === 0 ? "持平" : (change > 0 ? "+" : "−") + yuan(Math.abs(change)) + "/程"
    const diffStyle = change > 0
      ? { bg: COLORS.upWash, fg: COLORS.up }
      : change < 0
        ? { bg: COLORS.accentWash, fg: COLORS.saving }
        : { bg: COLORS.field, fg: COLORS.quiet }
    drawPill(ctx, contentX + 13 + oldW + newW + 6, ry + 21, diffLabel, {
      bg: diffStyle.bg,
      fg: diffStyle.fg,
      font: `600 10.5px ${FONT_FAMILY}`,
      height: 17,
      padX: 6,
      radius: 4,
    })

    const distText = "约 " + (route.meters / 1000).toFixed(1) + " km"
    ctx.font = `400 11px ${FONT_FAMILY}`
    ctx.fillStyle = COLORS.faint
    ctx.textAlign = "right"
    ctx.fillText(distText, contentRight, ry + 24)

    ry += routeRowH
  }

  if (hasOverflowRoutes) {
    ctx.font = `400 11px ${FONT_FAMILY}`
    ctx.fillStyle = COLORS.faint
    ctx.textAlign = "left"
    ctx.fillText("… 另有 " + extraRoutesCount + " 组行程", contentX + 13, ry + 3)
  }

  ctx.strokeStyle = COLORS.line
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(cardX, y + tripsH - 0.5)
  ctx.lineTo(cardX + cardW, y + tripsH - 0.5)
  ctx.stroke()

  y += tripsH

  // 4. 4-Tier Passes
  ctx.font = `600 12px ${FONT_FAMILY}`
  ctx.fillStyle = COLORS.quiet
  ctx.textAlign = "left"
  ctx.fillText("计次票对比", contentX, y + 13)

  let py = y + passesHeaderH
  const passBoxX = cardX + 10
  const passBoxW = cardW - 20

  for (let i = 0; i < comparison.passes.length; i++) {
    const plan = comparison.passes[i]
    const isBest = comparison.recommended === plan
    const nextIsBest = comparison.passes[i + 1] === comparison.recommended

    if (isBest) {
      fillRoundedRect(ctx, passBoxX, py, passBoxW, passRowH - 4, 8, COLORS.accentWash)
      roundedRectPath(ctx, passBoxX + 0.75, py + 0.75, passBoxW - 1.5, passRowH - 5.5, 8)
      ctx.strokeStyle = COLORS.ink
      ctx.lineWidth = 1.5
      ctx.stroke()
    } else if (i < comparison.passes.length - 1 && !nextIsBest) {
      ctx.strokeStyle = COLORS.field
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(contentX, py + passRowH - 2)
      ctx.lineTo(contentRight, py + passRowH - 2)
      ctx.stroke()
    }

    const rowInnerX = contentX
    const titleText = plan.capacity + " 次票"
    ctx.font = `600 13px ${FONT_FAMILY}`
    ctx.fillStyle = COLORS.ink
    ctx.textAlign = "left"
    ctx.fillText(titleText, rowInnerX, py + 6)

    if (isBest) {
      const titleW = ctx.measureText(titleText).width
      drawPill(ctx, rowInnerX + titleW + 6, py + 5, "最省", {
        bg: COLORS.accent,
        fg: "#ffffff",
        font: `700 10px ${FONT_FAMILY}`,
        height: 16,
        padX: 5,
        radius: 4,
      })
    }

    const subText = yuan(plan.price * 100) + " · " + formatCoverage(comparison.rides, plan.capacity)
    ctx.font = `400 11px ${FONT_FAMILY}`
    ctx.fillStyle = COLORS.quiet
    ctx.textAlign = "left"
    ctx.fillText(subText, rowInnerX, py + 23)

    // Right side cost and savings
    ctx.font = `700 14px ${FONT_FAMILY}`
    ctx.fillStyle = COLORS.ink
    ctx.textAlign = "right"
    ctx.fillText(yuan(plan.cost), contentRight, py + 5)

    const savingsText = plan.savings === 0
      ? "持平"
      : (plan.savings > 0 ? "省 " : "多 ") + yuan(Math.abs(plan.savings))
    ctx.font = `500 11px ${FONT_FAMILY}`
    ctx.fillStyle = plan.savings > 0 ? COLORS.saving : plan.savings < 0 ? COLORS.up : COLORS.faint
    ctx.fillText(savingsText, contentRight, py + 23)

    py += passRowH
  }

  y += passesH

  // 5. Footer Strip
  ctx.fillStyle = COLORS.footerBg
  ctx.fillRect(cardX, y, cardW, footerH)

  ctx.strokeStyle = COLORS.line
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(cardX, y + 0.5)
  ctx.lineTo(cardX + cardW, y + 0.5)
  ctx.stroke()

  const footerCenter = y + footerH / 2
  ctx.textAlign = "left"
  ctx.font = `650 15px ${FONT_FAMILY}`
  ctx.fillStyle = COLORS.ink
  ctx.fillText("扫码打开计算器", contentX, footerCenter - 29)

  ctx.font = `400 11px ${FONT_FAMILY}`
  ctx.fillStyle = COLORS.quiet
  ctx.fillText("3 元起步里程 6 公里 → 4 公里", contentX, footerCenter - 5)
  ctx.fillText("规则更新于 2026-11-23 · 仅供参考", contentX, footerCenter + 14)

  drawSiteQr(ctx, contentRight - QR_SIZE, y + 12, pageUrl, scale)

  ctx.restore()

  // Frame the light part of the card below the dark header.
  ctx.save()
  ctx.beginPath()
  ctx.rect(cardX, cardY + heroH, cardW, cardH - heroH)
  ctx.clip()
  roundedRectPath(ctx, cardX + 0.5, cardY + 0.5, cardW - 1, cardH - 1, cardRadius - 0.5)
  ctx.strokeStyle = COLORS.line
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.restore()

  return canvas
}

export function renderShareBlob(data, pageUrl) {
  const canvas = renderShareCanvas(data, pageUrl)
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error("生成分享图片失败"))
    }, "image/png")
  })
}
