/**
 * 暖色系空 / 加载状态
 */
export function EmptyState({ emoji = '🌱', title = '这里还没人来过', hint = '第一棒就交给你吧 ✨', action = null }) {
  return (
    <div className="bg-white border border-dashed border-[--color-cream-300] rounded-3xl py-14 px-6 text-center flex flex-col items-center justify-center">
      <div className="text-[64px] mb-3 animate-float">{emoji}</div>
      <h3 className="text-[16.5px] font-semibold text-[--color-ink-900] mb-1.5" style={{ fontFamily: 'var(--font-display)' }}>{title}</h3>
      <p className="text-[13.5px] text-[--color-ink-500] max-w-sm">{hint}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function LoadingShimmer({ rows = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-[112px] rounded-3xl shimmer-bar opacity-70" />
      ))}
    </div>
  )
}

export function LoadingBubble({ text = '从书架里翻找…' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12">
      <div className="flex gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-[--color-honey-300] animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2.5 h-2.5 rounded-full bg-[--color-camphor-300] animate-bounce" style={{ animationDelay: '120ms' }} />
        <span className="w-2.5 h-2.5 rounded-full bg-[--color-kapok-300] animate-bounce" style={{ animationDelay: '240ms' }} />
      </div>
      <span className="text-[13.5px] text-[--color-ink-500]">{text}</span>
    </div>
  )
}
