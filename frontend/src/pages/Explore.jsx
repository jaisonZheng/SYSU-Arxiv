import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Filter, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react'
import { api } from '../api/client'
import ResourceCard from '../components/ResourceCard'

const categories = [
  { value: '', label: 'All Categories' },
  { value: 'past_exam', label: 'Past Exams' },
  { value: 'study_material', label: 'Study Materials' },
]

const subCategories = [
  { value: '', label: 'All Types' },
  { value: 'lecture', label: 'Lecture' },
  { value: 'notes', label: 'Notes' },
  { value: 'mock_exam', label: 'Mock Exam' },
  { value: 'summary', label: 'Summary' },
  { value: 'other', label: 'Other' },
]

const sortOptions = [
  { value: 'created_at:desc', label: 'Newest First' },
  { value: 'created_at:asc', label: 'Oldest First' },
  { value: 'download_count:desc', label: 'Most Downloaded' },
  { value: 'title:asc', label: 'Title A-Z' },
]

export default function Explore() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [materials, setMaterials] = useState([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    sub_category: searchParams.get('sub_category') || '',
    department: searchParams.get('department') || '',
    course_name: searchParams.get('course_name') || '',
    year: searchParams.get('year') || '',
    sort: searchParams.get('sort') || 'created_at:desc',
    page: parseInt(searchParams.get('page') || '1', 10),
    page_size: 20,
  })
  const [showFilters, setShowFilters] = useState(false)
  const [departments, setDepartments] = useState([])
  const [courses, setCourses] = useState([])

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
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 leading-[38px]">Explore Resources</h1>
          <p className="text-base text-gray-500 mt-1">Discover past exams, study notes, and course materials from across departments.</p>
        </div>
        {/* Search + Filter */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              placeholder="Filter by course code, title, or author..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-base focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 bg-white rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
          </button>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => updateFilter('category', cat.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition-colors ${
                filters.category === cat.value
                  ? 'bg-primary/10 text-primary border-primary/20'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">Sub Category</label>
              <select
                value={filters.sub_category}
                onChange={(e) => updateFilter('sub_category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
              >
                {subCategories.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">Department</label>
              <select
                value={filters.department}
                onChange={(e) => updateFilter('department', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">Course</label>
              <select
                value={filters.course_name}
                onChange={(e) => updateFilter('course_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
              >
                <option value="">All Courses</option>
                {courses.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">Year</label>
              <input
                type="number"
                value={filters.year}
                onChange={(e) => updateFilter('year', e.target.value)}
                placeholder="e.g. 2023"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">Sort By</label>
              <select
                value={filters.sort}
                onChange={(e) => updateFilter('sort', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
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
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : (
        <>
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>{total} resources found</span>
          </div>
          {materials.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white border border-gray-200 rounded-lg">
              No resources found matching your criteria.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {materials.map((m) => (
                <ResourceCard key={m.id} material={m} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-4">
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
                    className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                      filters.page === pageNum
                        ? 'bg-primary text-white border border-primary'
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
