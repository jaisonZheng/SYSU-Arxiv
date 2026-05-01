import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useLocation } from 'react-router-dom'
import { Search, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react'
import { api } from '../api/client'
import ResourceCard from '../components/ResourceCard'

const subCategories = [
  { value: '', label: '全部类型' },
  { value: 'past_exam', label: '试卷真题' },
  { value: 'lecture', label: '课件' },
  { value: 'notes', label: '笔记' },
  { value: 'mock_exam', label: '模拟题' },
  { value: 'exam_answer', label: '试卷答案' },
  { value: 'textbook_answer', label: '教材答案' },
  { value: 'summary', label: '总结' },
  { value: 'other', label: '其它' },
]

const sortOptions = [
  { value: 'download_count:desc', label: '下载最多' },
  { value: 'created_at:desc', label: '最新上传' },
  { value: 'created_at:asc', label: '最早上传' },
  { value: 'title:asc', label: '名称排序' },
]

export default function Explore({ category, title }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const [materials, setMaterials] = useState([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)

  // Reset filters whenever the route pathname changes
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

  // Force reset filters on route change
  useEffect(() => {
    setFilters(buildFilters())
  }, [location.pathname, buildFilters])

  const [showFilters, setShowFilters] = useState(false)
  const [departments, setDepartments] = useState([])
  const [courses, setCourses] = useState([])

  const pageTitle = title || '浏览资源'
  const pageDesc = category === 'past_exam'
    ? '各院系历年期末考试真题与试卷。'
    : category === 'study_material'
    ? '课件、笔记、复习资料等学习资源。'
    : '发现各院系的历年真题、学习笔记和课程资料。'

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [sortBy, sortOrder] = filters.sort.split(':')
      const params = {
        ...filters,
        sort_by: sortBy,
        sort_order: sortOrder,
      }
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
        api.getDepartments(),
        api.getCourses(),
      ])
      setDepartments(depts.departments || [])
      setCourses(crs.courses || [])
    } catch (e) {
      console.error(e)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    loadFilters()
  }, [loadFilters])

  const updateFilter = (key, value) => {
    const newFilters = { ...filters, [key]: value, page: 1 }
    setFilters(newFilters)
    const sp = new URLSearchParams()
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v !== '' && v !== undefined && v !== null && k !== 'page_size' && k !== 'sort') {
        sp.set(k, String(v))
      }
    })
    setSearchParams(sp)
  }

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return
    setFilters({ ...filters, page })
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 bg-primary rounded-full" />
          <h1 className="text-xl font-semibold tracking-tight text-gray-900 text-left">{pageTitle}</h1>
        </div>
        <p className="text-base text-gray-500">{pageDesc}</p>

        {/* Search + Filter */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              placeholder="按课程、标题或关键词筛选..."
              className="w-full h-9 pl-9 pr-4 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 h-9 px-4 border rounded-lg text-sm font-medium transition-colors ${
              showFilters
                ? 'border-primary text-primary bg-primary/5'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            筛选
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">子分类</label>
              <select
                value={filters.sub_category}
                onChange={(e) => updateFilter('sub_category', e.target.value)}
                className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
              >
                {subCategories.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">院系</label>
              <select
                value={filters.department}
                onChange={(e) => updateFilter('department', e.target.value)}
                className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
              >
                <option value="">全部院系</option>
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">课程</label>
              <select
                value={filters.course_name}
                onChange={(e) => updateFilter('course_name', e.target.value)}
                className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
              >
                <option value="">全部课程</option>
                {courses.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">年份</label>
              <input
                type="number"
                value={filters.year}
                onChange={(e) => updateFilter('year', e.target.value)}
                placeholder="例如 2023"
                className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">排序</label>
              <select
                value={filters.sort}
                onChange={(e) => updateFilter('sort', e.target.value)}
                className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
              >
                {sortOptions.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : (
        <>
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>共 {total} 个资源</span>
          </div>
          {materials.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white border border-gray-200 rounded-lg">
              没有找到符合条件的资源。
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {materials.map((m) => (
                <ResourceCard key={m.id} material={m} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-1.5 mt-4">
              <button
                onClick={() => goToPage(filters.page - 1)}
                disabled={filters.page <= 1}
                className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (filters.page <= 3) {
                  pageNum = i + 1
                } else if (filters.page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = filters.page - 2 + i
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => goToPage(pageNum)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                      filters.page === pageNum
                        ? 'bg-gray-800 text-white'
                        : 'border border-gray-200 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
              <button
                onClick={() => goToPage(filters.page + 1)}
                disabled={filters.page >= totalPages}
                className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
