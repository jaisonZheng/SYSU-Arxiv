import { Link } from 'react-router-dom'
import { Download } from 'lucide-react'
import { api } from '../api/client'
import ThankButton from './ThankButton'
import {
  timeAgo,
  subCategoryMeta,
  categoryMeta,
  avatarLetter,
  avatarColor,
} from '../lib/format'

function fileGlyph(ext = '') {
  const e = ext.toLowerCase()
  if (e.includes('pdf'))                                  return { emoji: '📕', tone: 'kapok' }
  if (/(doc|docx)/.test(e))                               return { emoji: '📘', tone: 'mist' }
  if (/(ppt|pptx)/.test(e))                               return { emoji: '📙', tone: 'honey' }
  if (/(xls|xlsx)/.test(e))                               return { emoji: '📗', tone: 'camphor' }
  if (/(zip|rar|7z)/.test(e))                             return { emoji: '🗂️', tone: 'mist' }
  if (/(png|jpg|jpeg|gif|webp)/.test(e))                  return { emoji: '🖼️', tone: 'honey' }
  if (/(md|txt|c|cpp|h|py|js|html)/.test(e))              return { emoji: '📝', tone: 'mist' }
  return { emoji: '📄', tone: 'camphor' }
}

const toneCard = {
  honey:   'from-[#FFE6CB] to-[#FFD09C]',
  camphor: 'from-[#D6E9DA] to-[#A8D0B0]',
  kapok:   'from-[#FFD5C7] to-[#FFA88C]',
  mist:    'from-[#D4E0EC] to-[#A4BCD3]',
}

export default function ResourceCard({ material }) {
  const cat  = categoryMeta[material.category] || { label: material.category, emoji: '📚' }
  const sub  = subCategoryMeta[material.sub_category]
  const file = fileGlyph(material.file_type)
  const ava  = avatarColor(material.uploader_name || material.title || 'sysu')

  const handleDownload = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const url = api.downloadMaterial(material.id)
    window.open(url, '_blank')
  }

  return (
    <Link
      to={`/material/${material.id}`}
      className="group relative bg-white rounded-3xl p-4 md:p-5 shadow-[var(--shadow-xs)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow)] flex gap-4"
    >
      {/* 左：文件视觉 */}
      <div className="shrink-0 w-[88px] md:w-[112px]">
        <div className={`relative h-[110px] md:h-[126px] rounded-2xl bg-gradient-to-br ${toneCard[file.tone]} grid place-items-center overflow-hidden`}>
          <span className="text-[44px] md:text-[52px] drop-shadow-sm group-hover:scale-110 transition-transform duration-500">{file.emoji}</span>
          {material.file_type && (
            <span className="absolute bottom-1.5 right-1.5 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-white/80 backdrop-blur text-[--color-ink-700]">
              {material.file_type.replace('.', '')}
            </span>
          )}
        </div>
      </div>

      {/* 右：内容 */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-start gap-1.5 flex-wrap mb-1.5">
          <span className="chip bg-[--color-camphor-50] text-[--color-camphor-700] border border-[--color-camphor-100]">
            {cat.emoji} {cat.label}
          </span>
          {sub && (
            <span className="chip bg-[--color-mist-50] text-[--color-mist-500] border border-[--color-mist-100]">
              {sub.label}
            </span>
          )}
          {material.year && (
            <span className="chip bg-[--color-honey-50] text-[--color-honey-700] border border-[--color-honey-100]">
              {material.year} 年
            </span>
          )}
        </div>

        <h3 className="text-[15.5px] font-semibold text-[--color-ink-900] line-clamp-2 leading-snug group-hover:text-[--color-camphor-700] transition-colors" style={{ fontFamily: 'var(--font-display)' }}>
          {material.title}
        </h3>

        <p className="text-[13px] text-[--color-ink-500] line-clamp-2 mt-1 leading-relaxed">
          {material.description || `${material.course_name || ''} · ${material.department || ''}`.trim() || '这位同学忘记加描述啦，但东西可能很有用 ✨'}
        </p>

        <div className="flex-1" />
        <div className="mt-2 pt-2 border-t border-dashed border-[--color-line] flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="w-6 h-6 rounded-full grid place-items-center text-[11px] font-bold shrink-0"
              style={{ background: ava.bg, color: ava.fg }}
              title={material.uploader_name || '匿名同学'}
            >
              {avatarLetter(material.uploader_name || '匿名')}
            </span>
            <span className="text-[12px] text-[--color-ink-500] truncate">
              {material.uploader_name || '匿名同学'} · {timeAgo(material.created_at)}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ThankButton id={material.id} initialCount={material.thanks_count || 0} />
            <span className="inline-flex items-center gap-1 text-[12px] text-[--color-ink-500]">
              <Download className="w-3.5 h-3.5" />
              {material.download_count || 0}
            </span>
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full bg-[--color-camphor-50] hover:bg-[--color-camphor-100] text-[--color-camphor-700] text-[11.5px] font-semibold transition-colors"
            >
              收下
            </button>
          </div>
        </div>
      </div>
    </Link>
  )
}
