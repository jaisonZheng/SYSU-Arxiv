import { ArrowRight } from 'lucide-react'

/**
 * 暖色系区段标题
 * - kicker: 上方小字（中文/英文混排）
 * - title:  主标题
 * - hint:   副标题，柔和说明
 * - action: 右侧动作按钮（链接 / 按钮）
 */
export default function SectionHeading({ kicker, title, hint, action, accent = 'camphor' }) {
  const accentColor =
    accent === 'honey' ? 'var(--color-honey-500)' :
    accent === 'kapok' ? 'var(--color-kapok-400)' :
    accent === 'mist'  ? 'var(--color-mist-500)'  :
    'var(--color-camphor-500)'

  return (
    <div className="flex items-end justify-between gap-4 mb-5">
      <div className="min-w-0">
        {kicker && (
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-block w-6 h-px" style={{ background: accentColor }} />
            <span className="text-[11.5px] uppercase tracking-[0.22em] font-semibold" style={{ color: accentColor }}>
              {kicker}
            </span>
          </div>
        )}
        <h2 className="text-[22px] md:text-[26px] font-bold tracking-tight text-[--color-ink-900] leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
          {title}
        </h2>
        {hint && <p className="text-[13.5px] text-[--color-ink-500] mt-1.5 max-w-xl">{hint}</p>}
      </div>
      {action && (
        <div className="shrink-0 hidden sm:block">{action}</div>
      )}
    </div>
  )
}

export function ViewAllLink({ to, onClick, children = '全部看看' }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 text-[13.5px] font-semibold text-[--color-camphor-600] hover:text-[--color-camphor-700] group"
    >
      {children}
      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
    </button>
  )
}
