import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Search, Package, Folder, Download, Sparkles, Clock, Flame, ArrowDownAZ,
  ArrowRight, X,
} from 'lucide-react'
import { api } from '../api/client'
import { LoadingShimmer, EmptyState } from '../components/States'
import { Pagination } from './Explore'
import {
  timeAgo, formatSize, avatarLetter, avatarColor,
} from '../lib/format'

const sortOptions = [
  { value: 'download_count:desc', label: '收下最多', icon: Flame },
  { value: 'created_at:desc',     label: '最新',     icon: Clock },
  { value: 'created_at:asc',      label: '最早',     icon: Clock },
  { value: 'title:asc',           label: '按名称',   icon: ArrowDownAZ },
]

export default function CoursePackages() {
  const navigate = useNavigate()
  const [packages, setPackages] = useState([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    search: '',
    course_name: '',
    sort: 'download_count:desc',
    page: 1,
    page_size: 18,
  })
  const [courses, setCourses] = useState([])

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [sortBy, sortOrder] = filters.sort.split(':')
      const params = {
        search: filters.search,
        course_name: filters.course_name,
        sort_by: sortBy,
        sort_order: sortOrder,
        page: filters.page,
        page_size: filters.page_size,
      }
      const res = await api.listPackages(params)
      setPackages(res.items || [])
      setTotal(res.total || 0)
      setTotalPages(res.total_pages || 0)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [filters])

  const loadCourses = useCallback(async () => {
    try {
      const res = await api.getPackageCourses()
      setCourses(res.courses || [])
    } catch (e) {
      console.error(e)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => { loadCourses() }, [loadCourses])

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }))
  }

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return
    setFilters((prev) => ({ ...prev, page }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="flex flex-col gap-8 md:gap-10 animate-fade-up">
      {/* ============== Hero ============== */}
      <section className="relative overflow-hidden rounded-[28px] border border-[--color-line] bg-gradient-to-br from-[#FFF6EC] to-[#FFE6CB] px-6 md:px-9 py-7 md:py-9">
        <div className="absolute -top-10 -right-8 text-[180px] opacity-15 select-none pointer-events-none rotate-[6deg]">🎁</div>
        <div className="relative max-w-2xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-block w-6 h-px bg-[--color-honey-700]" />
            <span className="text-[11.5px] uppercase tracking-[0.22em] font-semibold text-[--color-honey-700]">一站式 · 整门课</span>
          </div>
          <h1 className="text-[26px] md:text-[34px] font-bold tracking-tight text-[--color-ink-900] leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
            课程资源包
          </h1>
          <p className="text-[14px] md:text-[14.5px] text-[--color-ink-700] mt-2 leading-relaxed">
            按整门课打包好的资料 —— 课件、真题、笔记、作业，一次性带走。
            <br className="hidden md:block" />
            <span className="text-[--color-ink-500]">省下你翻箱倒柜的时间。</span>
          </p>

          {/* 搜索 */}
          <div className="relative mt-5">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[--color-ink-400]" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              placeholder="搜课程名 —— 比如「数据结构」「编译原理」"
              className="w-full h-12 pl-11 pr-4 bg-white border border-[--color-line] rounded-full text-[14px] placeholder-[--color-ink-400] focus:border-[--color-camphor-300] focus:ring-4 focus:ring-[--color-camphor-100] transition shadow-[var(--shadow-xs)]"
            />
          </div>
        </div>
      </section>

      {/* ============== 工具行 ============== */}
      <section className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filters.course_name}
            onChange={(e) => updateFilter('course_name', e.target.value)}
            className="h-9 pl-4 pr-8 rounded-full bg-white border border-[--color-line] text-[13px] font-medium text-[--color-ink-700] focus:border-[--color-camphor-300] focus:ring-4 focus:ring-[--color-camphor-100] transition appearance-none bg-no-repeat bg-[right_12px_center]"
            style={{ backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 viewBox=%270 0 12 12%27><path fill=%27none%27 stroke=%27%236E665B%27 stroke-width=%271.5%27 d=%27M3 4.5l3 3 3-3%27/></svg>")' }}
          >
            <option value="">全部课程</option>
            {courses.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {filters.course_name && (
            <button
              onClick={() => updateFilter('course_name', '')}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[--color-camphor-50] text-[--color-camphor-700] text-[12px] font-medium border border-[--color-camphor-200]"
            >
              {filters.course_name}
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="hidden sm:inline-flex items-center bg-[--color-cream-100] border border-[--color-line] rounded-full p-1 text-[12.5px] gap-0.5">
          {sortOptions.map((s) => {
            const Icon = s.icon
            const active = filters.sort === s.value
            return (
              <button
                key={s.value}
                onClick={() => updateFilter('sort', s.value)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-medium transition-all ${
                  active
                    ? 'bg-white text-[--color-camphor-700] shadow-sm'
                    : 'text-[--color-ink-500] hover:text-[--color-ink-900]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {s.label}
              </button>
            )
          })}
        </div>
      </section>

      {/* ============== 列表 ============== */}
      <section>
        <p className="text-[13.5px] text-[--color-ink-500] mb-4">
          {loading ? '正在打包好的箱子里翻找…' : <>共 <span className="text-[--color-ink-900] font-semibold">{total}</span> 个课程包</>}
        </p>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[210px] rounded-3xl shimmer-bar opacity-70" />
            ))}
          </div>
        ) : packages.length === 0 ? (
          <EmptyState
            emoji="🎁"
            title="还没有课程包"
            hint="把整门课的资料打包成 zip 上传，让学弟学妹一键搞定。"
            action={
              <button
                onClick={() => navigate('/upload')}
                className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-gradient-to-r from-[--color-honey-400] to-[--color-kapok-400] text-white text-[13.5px] font-semibold shadow-[0_12px_28px_-12px_rgba(244,125,44,0.55)] hover:scale-[1.03] transition-transform"
              >
                <Sparkles className="w-4 h-4" /> 上传一份课程包
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {packages.map((p, i) => (
              <PackageCard key={p.id} pkg={p} index={i} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <Pagination
            page={filters.page}
            totalPages={totalPages}
            onChange={goToPage}
          />
        )}
      </section>
    </div>
  )
}

/* ==========================================================
 * 课程包卡
 * ========================================================== */
function PackageCard({ pkg, index }) {
  const tones = ['honey', 'camphor', 'kapok', 'mist']
  const tone = tones[index % tones.length]
  const palette = {
    honey:   { bg: 'from-[#FFF6EC] to-[#FFE6CB]', emoji: '📚', accent: 'text-[--color-honey-700]', dot: 'bg-[--color-honey-400]' },
    camphor: { bg: 'from-[#EEF6F0] to-[#D6E9DA]', emoji: '🌿', accent: 'text-[--color-camphor-700]', dot: 'bg-[--color-camphor-500]' },
    kapok:   { bg: 'from-[#FFEFE9] to-[#FFD5C7]', emoji: '🌺', accent: 'text-[--color-kapok-500]',   dot: 'bg-[--color-kapok-400]' },
    mist:    { bg: 'from-[#EEF3F8] to-[#D4E0EC]', emoji: '🪶', accent: 'text-[--color-mist-500]',    dot: 'bg-[--color-mist-300]' },
  }[tone]
  const ava = avatarColor(pkg.uploader_name || pkg.title || 'sysu')
  const sourceLabel = pkg.source_type === 'github' ? 'GitHub' : pkg.source_type === 'lanzou' ? '蓝奏云' : '社区'

  return (
    <Link
      to={`/package/${pkg.id}`}
      className={`group relative overflow-hidden rounded-3xl border border-[--color-line] bg-gradient-to-br ${palette.bg} p-5 md:p-6 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[var(--shadow-lg)] flex flex-col`}
    >
      <div className="absolute -top-3 -right-3 text-[80px] opacity-15 group-hover:opacity-25 group-hover:scale-110 group-hover:rotate-[6deg] transition-all duration-700 select-none pointer-events-none">{palette.emoji}</div>

      <div className="relative flex-1">
        <div className="flex items-center gap-2 mb-2">
          <span className={`w-1.5 h-1.5 rounded-full ${palette.dot}`} />
          <span className={`text-[10.5px] uppercase tracking-[0.18em] font-semibold ${palette.accent}`}>
            课程包 · {sourceLabel}
          </span>
        </div>

        <h3 className="text-[17px] font-bold tracking-tight text-[--color-ink-900] line-clamp-2 leading-snug mb-2" style={{ fontFamily: 'var(--font-display)' }}>
          {pkg.course_name || pkg.title}
        </h3>
        {pkg.title && pkg.course_name && pkg.title !== pkg.course_name && (
          <p className="text-[12.5px] text-[--color-ink-500] line-clamp-1 mb-1.5">{pkg.title}</p>
        )}
        <p className="text-[13px] text-[--color-ink-700] line-clamp-2 leading-relaxed mb-4">
          {pkg.description || '这门课的全套资料，挑你需要的拿走 ✨'}
        </p>

        <div className="flex items-center gap-3 text-[12px] text-[--color-ink-500] mb-4">
          <span className="inline-flex items-center gap-1">
            <Folder className="w-3.5 h-3.5" /> {pkg.total_files || '?'} 个文件
          </span>
          <span className="inline-flex items-center gap-1">
            <Download className="w-3.5 h-3.5" /> {pkg.download_count || 0} 次
          </span>
          <span>· {formatSize(pkg.file_size)}</span>
        </div>
      </div>

      <div className="relative flex items-center justify-between gap-2 pt-3 border-t border-dashed border-[--color-line]">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-6 h-6 rounded-full grid place-items-center text-[11px] font-bold shrink-0"
            style={{ background: ava.bg, color: ava.fg }}
          >
            {avatarLetter(pkg.uploader_name || (pkg.source_type === 'github' ? 'GitHub' : '同'))}
          </span>
          <span className="text-[12px] text-[--color-ink-500] truncate">
            {pkg.uploader_name || (pkg.source_type === 'github' ? 'SYSU_Notebook' : 'Jaison')} · {timeAgo(pkg.created_at)}
          </span>
        </div>
        <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[--color-ink-900] shrink-0">
          收下 <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </span>
      </div>
    </Link>
  )
}
