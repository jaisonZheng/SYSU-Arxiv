export default function TrendChart({ data }) {
  if (!data || data.length === 0) return null

  const maxValue = Math.max(
    1,
    ...data.map((d) => Math.max(d.registrations || 0, d.downloads || 0, d.uploads || 0))
  )
  const width = 800
  const height = 220
  const padding = { top: 16, right: 16, bottom: 32, left: 36 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const barWidth = Math.max(4, Math.min(24, (chartWidth / data.length) * 0.5))
  const step = chartWidth / (data.length - 1 || 1)

  const yTicks = [0, maxValue / 2, maxValue].map((v) => Math.round(v))

  const linePath = (key) => {
    return data
      .map((d, i) => {
        const x = padding.left + i * step
        const y = padding.top + chartHeight - ((d[key] || 0) / maxValue) * chartHeight
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
      })
      .join(' ')
  }

  const lastDate = (str) => {
    const d = new Date(str)
    return `${d.getMonth() + 1}/${d.getDate()}`
  }

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[600px] h-auto" preserveAspectRatio="xMidYMid meet">
        {/* grid lines */}
        {[0, 0.5, 1].map((t) => {
          const y = padding.top + chartHeight * (1 - t)
          return (
            <line
              key={t}
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              stroke="var(--color-line)"
              strokeDasharray="4 4"
            />
          )
        })}

        {/* y-axis labels */}
        {yTicks.map((v, i) => (
          <text
            key={i}
            x={padding.left - 8}
            y={padding.top + chartHeight * (1 - i / 2) + 4}
            textAnchor="end"
            className="fill-[--color-ink-400]"
            style={{ fontSize: 10 }}
          >
            {v}
          </text>
        ))}

        {/* bars for downloads */}
        {data.map((d, i) => {
          const x = padding.left + i * step - barWidth / 2
          const h = ((d.downloads || 0) / maxValue) * chartHeight
          const y = padding.top + chartHeight - h
          return (
            <rect
              key={`bar-${i}`}
              x={x}
              y={y}
              width={barWidth}
              height={h}
              rx={3}
              fill="var(--color-honey-200)"
            />
          )
        })}

        {/* registration line */}
        <path d={linePath('registrations')} fill="none" stroke="var(--color-camphor-500)" strokeWidth={2.5} />
        {data.map((d, i) => {
          const x = padding.left + i * step
          const y = padding.top + chartHeight - ((d.registrations || 0) / maxValue) * chartHeight
          return <circle key={`reg-${i}`} cx={x} cy={y} r={3} fill="var(--color-camphor-500)" />
        })}

        {/* upload line */}
        <path d={linePath('uploads')} fill="none" stroke="var(--color-kapok-400)" strokeWidth={2.5} strokeDasharray="6 4" />
        {data.map((d, i) => {
          const x = padding.left + i * step
          const y = padding.top + chartHeight - ((d.uploads || 0) / maxValue) * chartHeight
          return <circle key={`up-${i}`} cx={x} cy={y} r={3} fill="var(--color-kapok-400)" />
        })}

        {/* x-axis labels */}
        {data.map((d, i) => {
          if (i % Math.ceil(data.length / 8) !== 0 && i !== data.length - 1) return null
          const x = padding.left + i * step
          return (
            <text
              key={`x-${i}`}
              x={x}
              y={height - 10}
              textAnchor="middle"
              className="fill-[--color-ink-400]"
              style={{ fontSize: 10 }}
            >
              {lastDate(d.date)}
            </text>
          )
        })}
      </svg>

      {/* 图例说明 */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <LegendCard
          title="浅橙色柱子"
          desc="每一天的总下载次数，柱子越高表示当天被下载得越多。"
          tone="honey"
        />
        <LegendCard
          title="绿色实线"
          desc="每一天的新增注册用户数，由圆点连成实线显示走势。"
          tone="camphor"
        />
        <LegendCard
          title="红色虚线"
          desc="每一天的新增上传资料数，由圆点连成虚线显示走势。"
          tone="kapok"
        />
      </div>
    </div>
  )
}

function LegendCard({ title, desc, tone }) {
  const toneMap = {
    honey: {
      border: 'border-[--color-honey-200]',
      bg: 'bg-[--color-honey-50]',
      title: 'text-[--color-honey-700]',
      bar: 'bg-[--color-honey-200]',
    },
    camphor: {
      border: 'border-[--color-camphor-200]',
      bg: 'bg-[--color-camphor-50]',
      title: 'text-[--color-camphor-700]',
      bar: 'bg-[--color-camphor-200]',
    },
    kapok: {
      border: 'border-[--color-kapok-200]',
      bg: 'bg-[--color-kapok-50]',
      title: 'text-[--color-kapok-700]',
      bar: 'bg-[--color-kapok-200]',
    },
  }
  const t = toneMap[tone]
  return (
    <div className={`rounded-2xl border ${t.border} ${t.bg} p-3.5`}>
      <div className={`text-[13px] font-bold mb-1 ${t.title}`}>{title}</div>
      <div className="text-[12px] text-[--color-ink-600] leading-relaxed">{desc}</div>
    </div>
  )
}
