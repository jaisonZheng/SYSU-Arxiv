import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom'
import {
  Search, ChevronLeft, ChevronRight, SlidersHorizontal,
  X, Sparkles, ArrowDownAZ, Clock, Flame,
} from 'lucide-react'
import { api } from '../api/client'
import ResourceCard from '../components/ResourceCard'
import SectionHeading from '../components/SectionHeading'
import { LoadingShimmer, EmptyState } from '../components/States'
import { subCategoryMeta, cheer } from '../lib/format'

/* ==========================================================
 * 页面级文案 / 视觉
 * ========================================================== */
const heroByCategory = {
  past_exam: {
    kicker: '考前救急',
    title: '历年真题',
    desc: '别再裸考了 —— 在去年的卷子里，先偷点灵感。',
    emoji: '📝',
    tone: 'kapok',
    placeholder: '想找哪门课的真题？比如「线性代数 期末」',
  },
  study_material: {
    kicker: '日常充电',
    title: '学习资料',
    desc: '同学们整理的笔记、课件与总结，常常比教材更清晰。',
    emoji: '📓',
    tone: 'camphor',
    placeholder: '想看什么笔记？比如「操作系统 笔记」',
  },
  default: {
    kicker: '随便逛逛',
    title: '所有资料',
    desc: '历年真题、笔记、课件，按你的需要自由筛选。',
    emoji: '🔎',
    tone: 'honey',
    placeholder: '关键词、课程名、老师名都行',
  },
}

const toneStyles = {
  kapok:   { ring: 'from-[#FFEFE9] to-[#FFD5C7]', kicker: 'text-[--color-kapok-500]' },
  camphor: { ring: 'from-[#EEF6F0] to-[#D6E9DA]', kicker: 'text-[--color-camphor-700]' },
  honey:   { ring: 'from-[#FFF6EC] to-[#FFE6CB]', kicker: 'text-[--color-honey-700]' },
}

const subCategoryList = [
  { value: '', label: '全部', emoji: '✨' },
  ...Object.entries(subCategoryMeta).map(([k, v]) => ({ value: k, label: v.label, emoji: v.emoji })),
]

const sortOptions = [
  { value: 'download_count:desc', label: '收下最多', icon: Flame },
  { value: 'created_at:desc',     label: '最新',     icon: Clock },
  { value: 'created_at:asc',      label: '最早',     icon: Clock },
  { value: 'title:asc',           label: '按名称',   icon: ArrowDownAZ },
]

/* ==========================================================
 * 主组件
 * ========================================================== */
export default function Explore({ category, title }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [materials, setMaterials] = useState([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [departments, setDepartments] = useState([])
  const [courses, setCourses] = useState([])

  const buildFilters = useCallback(() => ({
    search: searchParams.get('search') || '',
    category: category || searchParams.get('category') || '',
    sub_category: searchParams.get('sub_category') || '',
    department: searchParams.get('department') || '',
    course_name: searchParams.get('course_name') || '',
    year: searchParams.get('year') || '',
    sort: searchParams.get('sort') || 'download_count:desc',
    page: parseInt(searchParams.get('page') || '1', 10),
    page_size: 24,
  }), [searchParams, category])

  const [filters, setFilters] = useState(buildFilters)

  useEffect(() => { setFilters(buildFilters()) }, [location.pathname, buildFilters])

  const hero = heroByCategory[category] || heroByCategory.default
  const headerTitle = title || hero.title
  const tone = toneStyles[hero.tone]

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [sortBy, sortOrder] = filters.sort.split(':')
      const params = { ...filters, sort_by: sortBy, sort_order: sortOrder }
      const res = await api.listMaterials(params)
      setMaterials(res.items || [])
      setTotal(res.total || 0)
      setTotalPages(res.total_pages || 0)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [filters])

  const loadFilters = useCallback(async () => {
    try {
      const [depts, crs] = await Promise.all([
        api.getDepartments().catch(() => null),
        api.getCourses().catch(() => null),
      ])
      setDepartments(depts?.departments || [])
      setCourses(crs?.courses || [])
    } catch (e) {
      console.error(e)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => { loadFilters() }, [loadFilters])

  const updateFilter = (key, value) => {
    const newFilters = { ...filters, [key]: value, page: 1 }
    setFilters(newFilters)
    const sp = new URLSearchParams()
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v !== '' && v !== undefined && v !== null && k !== 'page_size' && k !== 'page') {
        sp.set(k, String(v))
      }
    })
    setSearchParams(sp)
  }

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return
    setFilters((f) => ({ ...f, page }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const clearAll = () => {
    setFilters({
      search: '', category: category || '', sub_category: '',
      department: '', course_name: '', year: '',
      sort: 'download_count:desc', page: 1, page_size: 24,
    })
    setSearchParams(new URLSearchParams())
  }

  /* 当前激活的筛选项（chip） */
  const activeChips = useMemo(() => {
    const chips = []
    if (filters.search) chips.push({ key: 'search', label: `“${filters.search}”` })
    if (filters.sub_category) chips.push({ key: 'sub_category', label: subCategoryMeta[filters.sub_category]?.label || filters.sub_category })
    if (filters.department) chips.push({ key: 'department', label: filters.department })
    if (filters.course_name) chips.push({ key: 'course_name', label: filters.course_name })
    if (filters.year) chips.push({ key: 'year', label: `${filters.year} 年` })
    return chips
  }, [filters])

  const emptyHint = filters.search
    ? '换个关键词试试 —— 或者，要不你把它分享上来？'
    : '这里还没人来过，要不你来开个头？'

  return (
    <div className="flex flex-col gap-8 md:gap-10 animate-fade-up">
      {/* ============= Hero ============= */}
      <section className={`relative overflow-hidden rounded-[28px] border border-[--color-line] bg-gradient-to-br ${tone.ring} px-6 md:px-9 py-7 md:py-9`}>
        <div className="absolute -top-8 -right-8 text-[160px] opacity-15 select-none pointer-events-none rotate-[6deg]">{hero.emoji}</div>
        <div className="relative max-w-2xl">
          <div className="flex items-center gap-2 mb-2">
            <span className={`inline-block w-6 h-px ${tone.kicker}`} style={{ background: 'currentColor' }} />
            <span className={`text-[11.5px] uppercase tracking-[0.22em] font-semibold ${tone.kicker}`}>{hero.kicker}</span>
          </div>
          <h1 className="text-[26px] md:text-[34px] font-bold tracking-tight text-[--color-ink-900] leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
            {headerTitle}
          </h1>
          <p className="text-[14px] md:text-[14.5px] text-[--color-ink-700] mt-2 leading-relaxed">
            {hero.desc}
          </p>

          {/* 搜索 */}
          <form
            onSubmit={(e) => { e.preventDefault() }}
            className="relative mt-5"
          >
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[--color-ink-400]" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              placeholder={hero.placeholder}
              className="w-full h-12 pl-11 pr-32 bg-white border border-[--color-line] rounded-full text-[14px] placeholder-[--color-ink-400] focus:border-[--color-camphor-300] focus:ring-4 focus:ring-[--color-camphor-100] transition shadow-[var(--shadow-xs)]"
            />
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className={`absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-[12.5px] font-semibold transition-all ${
                showAdvanced
                  ? 'bg-[--color-camphor-500] text-white shadow-[0_8px_20px_-10px_rgba(45,106,79,0.5)]'
                  : 'bg-[--color-cream-100] text-[--color-ink-700] hover:bg-[--color-cream-200]'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">高级筛选</span>
              <span className="sm:hidden">筛选</span>
            </button>
          </form>
        </div>
      </section>

      {/* ============= 子分类 chip 行 ============= */}
      <section className="-mt-2">
        <div className="flex items-center gap-2 flex-wrap">
          {subCategoryList.map((s) => {
            const active = filters.sub_category === s.value
            return (
              <button
                key={s.value || 'all'}
                onClick={() => updateFilter('sub_category', s.value)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-medium border transition-all ${
                  active
                    ? 'bg-[--color-camphor-500] border-[--color-camphor-500] text-white shadow-[0_8px_18px_-10px_rgba(45,106,79,0.5)]'
                    : 'bg-white border-[--color-line] text-[--color-ink-700] hover:border-[--color-camphor-200] hover:bg-[--color-camphor-50]'
                }`}
              >
                <span>{s.emoji}</span>
                {s.label}
              </button>
            )
          })}
        </div>
      </section>

      {/* ============= 高级筛选面板 ============= */}
      {showAdvanced && (
        <section className="bg-white border border-[--color-line] rounded-3xl p-5 md:p-6 animate-fade-up shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14.5px] font-semibold text-[--color-ink-900]">把范围再缩小一点</h3>
            <button
              onClick={() => setShowAdvanced(false)}
              className="text-[12.5px] text-[--color-ink-500] hover:text-[--color-ink-900] inline-flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> 收起
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <FilterField label="院系">
              <select value={filters.department} onChange={(e) => updateFilter('department', e.target.value)} className="custom-select">
                <option value="">全部院系</option>
                {departments.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </FilterField>
            <FilterField label="课程">
              <select value={filters.course_name} onChange={(e) => updateFilter('course_name', e.target.value)} className="custom-select">
                <option value="">全部课程</option>
                {courses.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </FilterField>
            <FilterField label="年份">
              <input
                type="number"
                value={filters.year}
                onChange={(e) => updateFilter('year', e.target.value)}
                placeholder="例如 2023"
                className="custom-input"
              />
            </FilterField>
            <FilterField label="排序方式">
              <select value={filters.sort} onChange={(e) => updateFilter('sort', e.target.value)} className="custom-select">
                {sortOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </FilterField>
          </div>

          <style>{`
            .custom-select, .custom-input {
              width: 100%;
              height: 38px;
              padding: 0 12px;
              border: 1px solid var(--color-line);
              border-radius: 999px;
              font-size: 13.5px;
              background: var(--color-cream-50);
              color: var(--color-ink-900);
              transition: all .2s ease;
            }
            .custom-select:focus, .custom-input:focus {
              outline: none;
              background: white;
              border-color: var(--color-camphor-300);
              box-shadow: 0 0 0 4px var(--color-camphor-100);
            }
          `}</style>
        </section>
      )}

      {/* ============= 已激活筛选 chip ============= */}
      {activeChips.length > 0 && (
        <section className="flex items-center gap-2 flex-wrap">
          <span className="text-[12.5px] text-[--color-ink-400]">当前筛选：</span>
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[--color-camphor-50] text-[--color-camphor-700] text-[12.5px] font-medium border border-[--color-camphor-200]"
            >
              {chip.label}
              <button
                onClick={() => updateFilter(chip.key, '')}
                className="hover:text-[--color-camphor-900]"
                aria-label="移除"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <button
            onClick={clearAll}
            className="text-[12.5px] text-[--color-ink-500] hover:text-[--color-kapok-500] underline-offset-4 hover:underline"
          >
            全部清空
          </button>
        </section>
      )}

      {/* ============= 结果 ============= */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <p className="text-[13.5px] text-[--color-ink-500]">
            {loading ? '正在翻找…' : <>找到 <span className="text-[--color-ink-900] font-semibold">{total}</span> 份资料</>}
          </p>
          <SortSegment value={filters.sort} onChange={(v) => updateFilter('sort', v)} />
        </div>

        {loading ? (
          <LoadingShimmer rows={5} />
        ) : materials.length === 0 ? (
          <EmptyState
            emoji={hero.emoji}
            title={cheer('empty')}
            hint={emptyHint}
            action={
              <button
                onClick={() => navigate('/upload')}
                className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-gradient-to-r from-[--color-honey-400] to-[--color-kapok-400] text-white text-[13.5px] font-semibold shadow-[0_12px_28px_-12px_rgba(244,125,44,0.55)] hover:scale-[1.03] transition-transform"
              >
                <Sparkles className="w-4 h-4" /> 我也来分享一份
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {materials.map((m) => <ResourceCard key={m.id} material={m} />)}
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
 * 子组件
 * ========================================================== */
function FilterField({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11.5px] uppercase tracking-[0.18em] font-semibold text-[--color-ink-400]">{label}</label>
      {children}
    </div>
  )
}

function SortSegment({ value, onChange }) {
  return (
    <div className="hidden sm:inline-flex items-center bg-[--color-cream-100] border border-[--color-line] rounded-full p-1 text-[12.5px] gap-0.5">
      {sortOptions.map((s) => {
        const Icon = s.icon
        const active = value === s.value
        return (
          <button
            key={s.value}
            onClick={() => onChange(s.value)}
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
  )
}

export function Pagination({ page, totalPages, onChange }) {
  const pages = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else if (page <= 4) {
    pages.push(1, 2, 3, 4, 5, '…', totalPages)
  } else if (page >= totalPages - 3) {
    pages.push(1, '…', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
  } else {
    pages.push(1, '…', page - 1, page, page + 1, '…', totalPages)
  }

  return (
    <div className="flex justify-center items-center gap-1.5 mt-8">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="grid place-items-center w-9 h-9 rounded-full bg-white border border-[--color-line] text-[--color-ink-700] hover:border-[--color-camphor-300] hover:bg-[--color-camphor-50] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`dots-${i}`} className="px-1 text-[--color-ink-400]">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`grid place-items-center w-9 h-9 rounded-full text-[13px] font-semibold transition-all ${
              page === p
                ? 'bg-[--color-camphor-500] text-white shadow-[0_8px_18px_-10px_rgba(45,106,79,0.5)]'
                : 'bg-white border border-[--color-line] text-[--color-ink-700] hover:border-[--color-camphor-300] hover:bg-[--color-camphor-50]'
            }`}
          >
            {p}
          </button>
        )
      )}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="grid place-items-center w-9 h-9 rounded-full bg-white border border-[--color-line] text-[--color-ink-700] hover:border-[--color-camphor-300] hover:bg-[--color-camphor-50] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}
