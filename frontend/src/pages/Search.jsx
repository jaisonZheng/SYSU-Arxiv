import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  Search, Package, GraduationCap, BookOpen, Compass,
  ArrowRight, Download, Flame, Clock, ArrowDownAZ,
} from 'lucide-react'
import { api } from '../api/client'
import { LoadingShimmer, EmptyState } from '../components/States'
import SectionHeading from '../components/SectionHeading'
import { subCategoryMeta, timeAgo } from '../lib/format'

const tabs = [
  { key: 'all',         label: '全部',      icon: Search },
  { key: 'packages',    label: '课程包',    icon: Package },
  { key: 'past_exam',   label: '历年真题',  icon: GraduationCap },
  { key: 'study_material', label: '学习资料', icon: BookOpen },
  { key: 'experience',  label: '经验攻略',  icon: Compass },
]

const sortOptions = [
  { value: 'download_count:desc', label: '收下最多', icon: Flame },
  { value: 'created_at:desc',     label: '最新',     icon: Clock },
  { value: 'created_at:asc',      label: '最早',     icon: Clock },
  { value: 'title:asc',           label: '按名称',   icon: ArrowDownAZ },
]

const typeMeta = {
  package:      { emoji: '📚', label: '课程包',     tone: 'honey' },
  past_exam:    { emoji: '📝', label: '历年真题',   tone: 'kapok' },
  study_material: { emoji: '📓', label: '学习资料', tone: 'camphor' },
  experience:   { emoji: '🧭', label: '经验攻略',   tone: 'mist' },
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const activeType = searchParams.get('type') || 'all'
  const sort = searchParams.get('sort') || 'download_count:desc'

  const [materials, setMaterials] = useState([])
  const [packages, setPackages] = useState([])
  const [materialTotal, setMaterialTotal] = useState(0)
  const [packageTotal, setPackageTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  const [sortBy, sortOrder] = useMemo(() => sort.split(':'), [sort])

  useEffect(() => {
    if (!query.trim()) return
    const load = async () => {
      setLoading(true)
      try {
        const fetchMaterials = activeType === 'all' || activeType === 'past_exam' || activeType === 'study_material' || activeType === 'experience'
        const fetchPackages = activeType === 'all' || activeType === 'packages'

        const params = {
          search: query.trim(),
          page_size: 50,
          sort_by: sortBy,
          sort_order: sortOrder,
        }
        if (fetchMaterials && activeType !== 'all') params.category = activeType

        const [mRes, pRes] = await Promise.all([
          fetchMaterials ? api.listMaterials(params).catch(() => null) : Promise.resolve(null),
          fetchPackages ? api.listPackages({ ...params }).catch(() => null) : Promise.resolve(null),
        ])

        const mTotal = mRes?.total || 0
        const pTotal = pRes?.total || 0
        setMaterials(mRes?.items || [])
        setMaterialTotal(mTotal)
        setPackages(pRes?.items || [])
        setPackageTotal(pTotal)

        // Report search query + combined result count once per user search
        try {
          await api.logSearch(query.trim(), Number(mTotal) + Number(pTotal))
        } catch {
          // ignore logging failures
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [query, activeType, sortBy, sortOrder])

  const allItems = useMemo(() => {
    const normalized = [
      ...packages.map((p) => ({ ...p, _type: 'package', _sortKey: p.download_count || 0 })),
      ...materials.map((m) => ({ ...m, _type: 'material', _sortKey: m.download_count || 0 })),
    ]
    if (sort === 'created_at:desc') normalized.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    else if (sort === 'created_at:asc') normalized.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    else if (sort === 'title:asc') normalized.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'zh-CN'))
    else normalized.sort((a, b) => b._sortKey - a._sortKey)
    return normalized
  }, [materials, packages, sort])

  const visibleItems = useMemo(() => {
    if (activeType === 'all') return allItems
    if (activeType === 'packages') return allItems.filter((i) => i._type === 'package')
    return allItems.filter((i) => i._type === 'material' && i.category === activeType)
  }, [activeType, allItems])

  const totalCount = useMemo(() => {
    if (activeType === 'all') return materialTotal + packageTotal
    if (activeType === 'packages') return packageTotal
    return materialTotalForType(materials, activeType)
  }, [activeType, materialTotal, packageTotal, materials])

  const updateQuery = (updates) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([k, v]) => {
      if (v === '' || v === null || v === undefined) next.delete(k)
      else next.set(k, v)
    })
    setSearchParams(next, { replace: true })
  }

  const handleTab = (key) => updateQuery({ type: key })
  const handleSort = (value) => updateQuery({ sort: value })

  return (
    <div className="flex flex-col gap-8 max-w-[960px] mx-auto">
      <section className="bg-white border border-[--color-line] rounded-3xl p-6 md:p-8 shadow-[var(--shadow-xs)]">
        <SectionHeading
          kicker="全站搜索"
          title={query.trim() ? `「${query.trim()}」的搜索结果` : '在破壁计划里搜点什么'}
          hint={query.trim() ? '同时搜索课程包、历年真题、学习资料和经验攻略' : '输入关键词，跨分类搜索'}
          accent="camphor"
        />

        <form
          onSubmit={(e) => {
            e.preventDefault()
            const val = e.target.q.value.trim()
            if (!val) return
            const next = new URLSearchParams()
            next.set('q', val)
            next.set('type', activeType)
            next.set('sort', sort)
            setSearchParams(next)
          }}
          className="relative mt-5"
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[--color-ink-400]" />
          <input
            name="q"
            defaultValue={query}
            placeholder="想找什么？比如「数据结构 真题」「宏观经济学 笔记」"
            className="w-full h-12 pl-11 pr-32 bg-white border border-[--color-line] rounded-full text-[14px] placeholder-[--color-ink-400] focus:border-[--color-camphor-300] focus:ring-4 focus:ring-[--color-camphor-100] transition shadow-[var(--shadow-xs)]"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 h-9 px-5 rounded-full bg-[--color-camphor-500] hover:bg-[--color-camphor-600] text-white text-[12.5px] font-semibold transition-colors shadow-[0_8px_20px_-10px_rgba(45,106,79,0.5)]"
          >
            搜索
          </button>
        </form>
      </section>

      {query.trim() && (
        <>
          <section className="-mt-2">
            <div className="flex items-center gap-2 flex-wrap">
              {tabs.map((t) => {
                const Icon = t.icon
                const active = activeType === t.key
                const count = t.key === 'all' ? materialTotal + packageTotal
                  : t.key === 'packages' ? packageTotal
                  : materialTotalForType(materials, t.key)
                return (
                  <button
                    key={t.key}
                    onClick={() => handleTab(t.key)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-medium border transition-all ${
                      active
                        ? 'bg-[--color-camphor-500] border-[--color-camphor-500] text-white shadow-[0_8px_18px_-10px_rgba(45,106,79,0.5)]'
                        : 'bg-white border-[--color-line] text-[--color-ink-700] hover:border-[--color-camphor-200] hover:bg-[--color-camphor-50]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {t.label}
                    <span className={`text-[11px] tabular-nums ${active ? 'text-white/80' : 'text-[--color-ink-400]'}`}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[13.5px] text-[--color-ink-500]">
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block w-3.5 h-3.5 border-2 border-[--color-camphor-400] border-t-transparent rounded-full animate-spin" />
                    正在翻找…
                  </span>
                ) : (
                  <>找到 <span className="text-[--color-ink-900] font-semibold">{totalCount}</span> 条相关内容</>
                )}
              </p>
              <SortSegment value={sort} onChange={handleSort} />
            </div>

            {loading ? (
              <LoadingShimmer rows={4} />
            ) : totalCount === 0 ? (
              <EmptyState
                emoji="🔍"
                title="没翻到相关内容"
                hint={`换个关键词试试，或者上传一份「${query.trim()}」相关的资料`}
                action={
                  <Link
                    to="/upload"
                    className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-gradient-to-r from-[--color-honey-400] to-[--color-kapok-400] text-white text-sm font-semibold shadow-[0_12px_28px_-12px_rgba(244,125,44,0.55)]"
                  >
                    上传一份 <ArrowRight className="w-4 h-4" />
                  </Link>
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {visibleItems.map((item) => (
                  <ResultCard key={`${item._type}-${item.id}`} item={item} />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {!query.trim() && (
        <div className="text-center py-16">
          <p className="text-[15px] text-[--color-ink-500]">输入关键词开始搜索 🔍</p>
        </div>
      )}
    </div>
  )
}

function materialTotalForType(materials, type) {
  return materials.filter((m) => m.category === type).length
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

function ResultCard({ item }) {
  const isPackage = item._type === 'package'
  const meta = isPackage
    ? typeMeta.package
    : (typeMeta[item.category] || { emoji: '📚', label: item.category, tone: 'honey' })

  const toneStyles = {
    honey:   { bg: 'bg-[#FFF6EC]', border: 'border-[#FFE4C2]', badge: 'bg-[--color-honey-100] text-[--color-honey-700]' },
    kapok:   { bg: 'bg-[#FFEFE9]', border: 'border-[#FFD5C7]', badge: 'bg-[--color-kapok-100] text-[--color-kapok-600]' },
    camphor: { bg: 'bg-[#EEF6F0]', border: 'border-[#CFEAD7]', badge: 'bg-[--color-camphor-100] text-[--color-camphor-700]' },
    mist:    { bg: 'bg-[#EEF3F8]', border: 'border-[#D4E0EC]', badge: 'bg-[--color-mist-100] text-[--color-mist-600]' },
  }[meta.tone]

  const detailMeta = isPackage
    ? `${item.total_files || 0} 个文件 · ${item.download_count || 0} 次下载`
    : [
        item.file_type?.replace('.', '').toUpperCase(),
        item.year ? `${item.year} 年` : null,
        item.uploader_name || '匿名同学',
        timeAgo(item.created_at),
      ].filter(Boolean).join(' · ')

  const description = isPackage
    ? (item.description || '这门课的全套资料，挑你需要的')
    : (item.description || `${item.course_name || ''} · ${item.department || ''}`.trim() || '这位同学忘记加描述啦，但东西可能很有用 ✨')

  return (
    <Link
      to={isPackage ? `/package/${item.id}` : `/material/${item.id}`}
      className={`group flex items-start gap-4 rounded-3xl border ${toneStyles.border} ${toneStyles.bg} p-4 md:p-5 shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow)] transition-all hover:-translate-y-0.5 text-left`}
    >
      <div className={`shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-2xl grid place-items-center text-[26px] md:text-[30px] ${toneStyles.badge}`}>
        {meta.emoji}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold text-left ${toneStyles.badge}`}>
            {meta.label}
          </span>
          {!isPackage && item.sub_category && (
            <span className="text-[11px] text-[--color-ink-400]">
              {(subCategoryMeta[item.sub_category]?.label) || item.sub_category}
            </span>
          )}
          {isPackage && (
            <span className="text-[11px] text-[--color-ink-400]">
              {item.source_type === 'github' ? 'GitHub' : item.source_type === 'lanzou' ? '蓝奏云' : '社区'}
            </span>
          )}
        </div>
        <h3 className="text-[15px] md:text-[16px] font-bold text-[--color-ink-900] leading-snug line-clamp-2 mb-1 text-left" style={{ fontFamily: 'var(--font-display)' }}>
          {item.title}
        </h3>
        <p className="text-[12.5px] text-[--color-ink-600] line-clamp-2 leading-relaxed mb-2 text-left">{description}</p>
        <div className="flex items-center justify-between">
          <span className="text-[11.5px] text-[--color-ink-500] truncate text-left">{detailMeta}</span>
          <span className="inline-flex items-center gap-1 text-[11.5px] text-[--color-ink-500]">
            <Download className="w-3 h-3" /> {item.download_count || 0}
          </span>
        </div>
      </div>
    </Link>
  )
}
