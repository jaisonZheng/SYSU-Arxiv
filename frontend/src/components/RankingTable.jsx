import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

export default function RankingTable({ title, items, columns, emptyHint, tone = 'camphor', maxHeight = '420px' }) {
  const [expanded, setExpanded] = useState(false)
  const visibleItems = expanded ? items : items.slice(0, 10)
  const toneClass = {
    camphor: 'from-[--color-camphor-100] to-[--color-camphor-50]',
    honey: 'from-[--color-honey-100] to-[--color-honey-50]',
    kapok: 'from-[--color-kapok-100] to-[--color-kapok-50]',
    mist: 'from-[--color-mist-100] to-[--color-mist-50]',
  }[tone]

  return (
    <section className="bg-white border border-[--color-line] rounded-3xl overflow-hidden shadow-[var(--shadow-xs)] flex flex-col">
      <div className={`px-5 py-3 bg-gradient-to-r ${toneClass} border-b border-[--color-line]`}>
        <h3 className="text-[14px] font-semibold text-[--color-ink-900]">{title}</h3>
      </div>
      <div className="overflow-auto" style={{ maxHeight }}>
        {items.length === 0 ? (
          <div className="p-8 text-center text-[13px] text-[--color-ink-500]">{emptyHint}</div>
        ) : (
          <table className="w-full text-left text-[13px]">
            <thead className="bg-[--color-cream-50] sticky top-0 z-10">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-2.5 text-[11px] font-semibold text-[--color-ink-500] uppercase tracking-wide ${col.className || ''}`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[--color-line-soft]">
              {visibleItems.map((item, idx) => (
                <tr key={item.key || idx} className="hover:bg-[--color-cream-50] transition-colors">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-2.5 text-[--color-ink-700] ${col.className || ''}`}
                    >
                      {col.render ? col.render(item, idx) : item[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {items.length > 10 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="py-2 text-[12px] font-medium text-[--color-ink-500] hover:text-[--color-camphor-600] hover:bg-[--color-cream-50] transition-colors border-t border-[--color-line-soft]"
        >
          <span className="inline-flex items-center gap-1">
            {expanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" /> 收起
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" /> 展开全部 {items.length} 条
              </>
            )}
          </span>
        </button>
      )}
    </section>
  )
}
