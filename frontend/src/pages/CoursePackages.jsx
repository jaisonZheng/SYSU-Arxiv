import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Search, ChevronLeft, ChevronRight, Package, Download, Folder } from 'lucide-react'
import { api } from '../api/client'

export default function CoursePackages() {
  const [packages, setPackages] = useState([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    search: '',
    course_name: '',
    sort: 'download_count:desc',
    page: 1,
    page_size: 20,
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

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    loadCourses()
  }, [loadCourses])

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }))
  }

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return
    setFilters(prev => ({ ...prev, page }))
  }

  const formatSize = (bytes) => {
    if (!bytes) return '未知'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 bg-primary rounded-full" />
          <h1 className="text-xl font-semibold tracking-tight text-gray-900 text-left">课程资源包</h1>
        </div>
        <p className="text-base text-gray-500">按课程整理的完整资源包，包含课件、真题、笔记等全部资料。</p>

        {/* Search + Filter */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              placeholder="搜索课程或资源包..."
              className="w-full h-9 pl-9 pr-4 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>
          <select
            value={filters.course_name}
            onChange={(e) => updateFilter('course_name', e.target.value)}
            className="h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary bg-white"
          >
            <option value="">全部课程</option>
            {courses.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={filters.sort}
            onChange={(e) => updateFilter('sort', e.target.value)}
            className="h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary bg-white"
          >
            <option value="download_count:desc">下载最多</option>
            <option value="created_at:desc">最新上传</option>
            <option value="created_at:asc">最早上传</option>
            <option value="title:asc">名称排序</option>
          </select>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : (
        <>
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>共 {total} 个资源包</span>
          </div>
          {packages.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white border border-gray-200 rounded-lg">
              没有找到符合条件的资源包。
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {packages.map((p) => (
                <Link
                  key={p.id}
                  to={`/package/${p.id}`}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:border-primary hover:shadow-sm transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                      <Package className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">{p.title}</h3>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{p.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Folder className="w-3 h-3" />
                          {p.total_files} 个文件
                        </span>
                        <span className="flex items-center gap-1">
                          <Download className="w-3 h-3" />
                          {p.download_count} 次下载
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-gray-400">
                        {formatSize(p.file_size)}
                      </div>
                    </div>
                  </div>
                </Link>
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
