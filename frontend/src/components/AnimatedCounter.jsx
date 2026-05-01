import { useEffect, useRef, useState } from 'react'

/* 单个数位列：通过 translateY 实现 0–9 的滚动 */
function DigitColumn({ digit, palette, duration = 700 }) {
  const colRef = useRef(null)
  const [digitHeight, setDigitHeight] = useState(40)

  useEffect(() => {
    if (!colRef.current) return
    const observer = new ResizeObserver((entries) => {
      setDigitHeight(entries[0].contentRect.height)
    })
    observer.observe(colRef.current)
    return () => observer.disconnect()
  }, [])

  const targetOffset = -parseInt(digit) * digitHeight

  return (
    <div
      ref={colRef}
      className="relative h-10 md:h-12 w-7 md:w-8 overflow-hidden rounded-xl"
      style={{ background: palette.bg, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.04), inset 0 -8px 14px -8px rgba(0,0,0,0.10)' }}
    >
      <div
        className="absolute inset-0 flex flex-col"
        style={{
          transform: `translateY(${targetOffset}px)`,
          transitionProperty: 'transform',
          transitionDuration: `${duration}ms`,
          transitionTimingFunction: 'cubic-bezier(.22,1,.36,1)',
        }}
      >
        {[0,1,2,3,4,5,6,7,8,9].map((n) => (
          <div
            key={n}
            className="flex h-10 md:h-12 w-7 md:w-8 shrink-0 items-center justify-center text-xl md:text-2xl font-bold tabular-nums"
            style={{ color: palette.fg, fontFamily: 'var(--font-display)' }}
          >
            {n}
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-2 bg-gradient-to-b from-black/10 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2 bg-gradient-to-t from-black/10 to-transparent" />
    </div>
  )
}

const palettes = {
  honey:   { bg: '#FFE6CB', fg: '#A94C0F', icon: '🍯', label: '#A94C0F' },
  camphor: { bg: '#D6E9DA', fg: '#1B4533', icon: '🌿', label: '#1B4533' },
  kapok:   { bg: '#FFD5C7', fg: '#A82640', icon: '🌺', label: '#A82640' },
  mist:    { bg: '#D4E0EC', fg: '#3D6890', icon: '🌊', label: '#3D6890' },
}

export default function AnimatedCounter({
  value,
  label = '已下载',
  suffix = '次',
  hint,
  tone = 'honey',
  pad = 6,
}) {
  const [displayValue, setDisplayValue] = useState(0)
  const prevValue = useRef(0)

  useEffect(() => {
    if (value === prevValue.current) return
    const start = prevValue.current
    const end = value
    const duration = 1000
    const startTime = performance.now()

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 4)
      const current = Math.floor(start + (end - start) * eased)
      setDisplayValue(current)
      if (progress < 1) requestAnimationFrame(animate)
      else prevValue.current = end
    }
    requestAnimationFrame(animate)
  }, [value])

  const palette = palettes[tone] || palettes.honey
  const digits = String(displayValue).padStart(pad, '0').split('')

  return (
    <div className="relative bg-white rounded-3xl p-5 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow)] transition-all overflow-hidden">
      <div className="absolute -top-8 -right-6 text-[80px] opacity-15 select-none pointer-events-none rotate-[8deg]">
        {palette.icon}
      </div>
      <div className="flex items-center justify-between mb-3 relative z-10">
        <div>
          <p className="text-[12.5px] font-semibold tracking-wide" style={{ color: palette.label }}>{label}</p>
          {hint && <p className="text-[11px] text-[--color-ink-400] mt-0.5">{hint}</p>}
        </div>
      </div>
      <div className="flex items-end gap-1 relative z-10">
        {digits.map((digit, index) => (
          <DigitColumn
            key={`${index}-${digits.length}`}
            digit={parseInt(digit)}
            palette={palette}
          />
        ))}
        <span className="ml-1.5 mb-0.5 text-sm font-semibold" style={{ color: palette.fg }}>{suffix}</span>
      </div>
    </div>
  )
}
