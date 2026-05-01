import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, FileText, BookOpen, ArrowRight, Package, GraduationCap, Download, Clock } from 'lucide-react'
import { api } from '../api/client'

export default function Home() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [packages, setPackages] = useState([])
  const [recentMaterials, setRecentMaterials] = useState([])
  const [stats, setStats] = useState({ total: 0, exams: 0, materials: 0, courses: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [pkgs, recent, examsRes, materialsRes] = await Promise.all([
        api.listPackages({ page_size: 12, sort_by: 'download_count' }),
        api.listMaterials({ page_size: 6, sort_by: 'created_at' }),
        api.listMaterials({ category: 'past_exam', page_size: 1 }),
        api.listMaterials({ category: 'study_material', page_size: 1 }),
      ])
      setPackages(pkgs.items || [])
      setRecentMaterials(recent.items || [])
      setStats({
        total: (pkgs.total || 0) + (recent.total || 0),
        exams: examsRes.total || 0,
        materials: materialsRes.total || 0,
        courses: pkgs.total || 0,
      })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (search.trim()) {
      navigate(`/past-exams?search=${encodeURIComponent(search.trim())}`)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('zh-CN')
  }

  const formatSize = (bytes) => {
    if (!bytes) return ''
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const SectionTitle = ({ children, action }) => (
    <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200">
      <div className="flex items-center gap-2">
        <div className="w-1 h-5 bg-primary rounded-full" />
        <h2 className="text-xl font-semibold tracking-tight text-gray-900">{children}</h2>
      </div>
      {action}
    </div>
  )

  return (
    <div className="flex flex-col gap-8">
      {/* Hero / Search - Left aligned */}
      <section className="py-8 w-full max-w-2xl space-y-3">
        <h1 className="text-2xl md:text-[28px] font-bold tracking-tight text-gray-900 leading-tight">
          上传你的笔记和资料，为开源社区贡献力量
        </h1>
        <p className="text-base text-gray-500 leading-6">
          访问来自中山大学各院系的海量历年真题、学习笔记和课程资料。
        </p>
        <form onSubmit={handleSearch} className="w-full relative mt-3">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索课程、资料或科目..."
            className="w-full pl-12 pr-24 py-3 bg-white border border-gray-200 rounded-lg text-base focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-[#064000] transition-colors"
          >
            搜索
          </button>
        </form>
      </section>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => navigate('/course-packages')}
          className="bg-white border border-gray-200 rounded-lg p-3.5 flex items-center gap-3 text-left hover:border-gray-300 transition-all"
        >
          <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
            <Package className="w-4 h-4 text-gray-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{stats.courses}</p>
            <p className="text-xs text-gray-500">课程包</p>
          </div>
        </button>
        <button
          onClick={() => navigate('/past-exams')}
          className="bg-white border border-gray-200 rounded-lg p-3.5 flex items-center gap-3 text-left hover:border-gray-300 transition-all"
        >
          <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
            <FileText className="w-4 h-4 text-gray-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{stats.exams}</p>
            <p className="text-xs text-gray-500">历年真题</p>
          </div>
        </button>
        <button
          onClick={() => navigate('/study-materials')}
          className="bg-white border border-gray-200 rounded-lg p-3.5 flex items-center gap-3 text-left hover:border-gray-300 transition-all"
        >
          <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-gray-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{stats.materials}</p>
            <p className="text-xs text-gray-500">学习资料</p>
          </div>
        </button>
        <div className="bg-white border border-gray-200 rounded-lg p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-gray-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">44</p>
            <p className="text-xs text-gray-500">门课程</p>
          </div>
        </div>
      </div>

      {/* Content Categories Bento */}
      <section>
        <SectionTitle>
          内容分类
        </SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Large Card: Past Exams */}
          <button
            onClick={() => navigate('/past-exams')}
            className="md:col-span-2 bg-white border border-gray-200 rounded-lg p-5 hover:border-gray-300 hover:shadow-sm transition-all flex flex-col justify-between group cursor-pointer h-40 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-transparent pointer-events-none" />
            <div className="flex justify-between items-start relative z-10">
              <FileText className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
              <span className="bg-gray-100 text-gray-700 text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded">真题</span>
            </div>
            <div className="relative z-10 text-left">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">历年真题</h3>
              <p className="text-sm text-gray-500">覆盖全校各院系的往年期末与期中考试试卷</p>
            </div>
          </button>
          {/* Card: Study Materials */}
          <button
            onClick={() => navigate('/study-materials')}
            className="bg-white border border-gray-200 rounded-lg p-5 hover:border-gray-300 hover:shadow-sm transition-all flex flex-col justify-between group cursor-pointer h-40"
          >
            <div className="flex justify-between items-start">
              <BookOpen className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
              <span className="bg-gray-100 text-gray-700 text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded">资料</span>
            </div>
            <div className="text-left">
              <h3 className="text-base font-semibold text-gray-900 mb-1 text-left">学习资料</h3>
              <p className="text-sm text-gray-500">笔记、课件、复习指南与总结</p>
            </div>
          </button>
        </div>
      </section>

      {/* Course Packages */}
      <section>
        <SectionTitle
          action={
            <button
              onClick={() => navigate('/course-packages')}
              className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
            >
              查看全部 <ArrowRight className="w-4 h-4" />
            </button>
          }
        >
          课程资源包
        </SectionTitle>
        {loading ? (
          <div className="text-center py-12 text-gray-400">加载中...</div>
        ) : packages.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-white border border-gray-200 rounded-lg">
            暂无课程资源包
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {packages.map((pkg) => (
              <button
                key={pkg.id}
                onClick={() => navigate(`/package/${pkg.id}`)}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:border-primary hover:shadow-sm transition-all cursor-pointer text-left group"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Package className="w-4 h-4 text-gray-500" />
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 group-hover:text-primary transition-colors line-clamp-1">
                  {pkg.course_name || pkg.title}
                </h3>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{pkg.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  {pkg.department && (
                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">
                      {pkg.department}
                    </span>
                  )}
                  {pkg.file_size > 0 && (
                    <span className="text-xs text-gray-400">
                      {(pkg.file_size / (1024 * 1024)).toFixed(1)} MB
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Recently Uploaded - List View */}
      <section>
        <SectionTitle
          action={
            <button
              onClick={() => navigate('/study-materials')}
              className="text-sm font-medium text-primary hover:underline"
            >
              查看全部
            </button>
          }
        >
          最近上传
        </SectionTitle>
        {loading ? (
          <div className="text-center py-12 text-gray-400">加载中...</div>
        ) : recentMaterials.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-white border border-gray-200 rounded-lg">
            暂无资源，成为第一个上传者吧！
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {/* Header Row */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-200 bg-gray-50">
              <div className="col-span-5">标题</div>
              <div className="col-span-2">分类</div>
              <div className="col-span-2">院系</div>
              <div className="col-span-1 text-right">下载</div>
              <div className="col-span-2 text-right">日期</div>
            </div>
            {/* Data Rows */}
            <div className="flex flex-col">
              {recentMaterials.slice(0, 6).map((m) => (
                <button
                  key={m.id}
                  onClick={() => navigate(`/material/${m.id}`)}
                  className="grid grid-cols-12 gap-4 px-4 py-3.5 border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors group cursor-pointer items-center text-left"
                >
                  <div className="col-span-12 md:col-span-5 flex flex-col min-w-0">
                    <span className="text-sm font-medium text-gray-900 group-hover:text-primary transition-colors line-clamp-1">
                      {m.title}
                    </span>
                    <span className="text-xs text-gray-500 mt-0.5 line-clamp-1 md:hidden">
                      {m.department || '未知院系'} · {formatDate(m.created_at)}
                    </span>
                  </div>
                  <div className="hidden md:flex col-span-2 items-center gap-2">
                    {m.category === 'past_exam' && (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                        <FileText className="w-3.5 h-3.5" />
                        历年真题
                      </span>
                    )}
                    {m.category === 'study_material' && (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                        <BookOpen className="w-3.5 h-3.5" />
                        学习资料
                      </span>
                    )}
                    {m.sub_category && (
                      <span className="text-xs text-gray-400">
                        {m.sub_category === 'past_exam' && '试卷真题'}
                        {m.sub_category === 'lecture' && '课件'}
                        {m.sub_category === 'notes' && '笔记'}
                        {m.sub_category === 'mock_exam' && '模拟题'}
                        {m.sub_category === 'exam_answer' && '试卷答案'}
                        {m.sub_category === 'textbook_answer' && '教材答案'}
                        {m.sub_category === 'summary' && '总结'}
                        {m.sub_category === 'other' && '其它'}
                      </span>
                    )}
                  </div>
                  <div className="hidden md:flex col-span-2 items-center gap-2">
                    {m.department ? (
                      <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">
                        {m.department}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </div>
                  <div className="hidden md:block col-span-1 text-right">
                    <span className="text-xs text-gray-400 flex items-center justify-end gap-1">
                      <Download className="w-3 h-3" />
                      {m.download_count || 0}
                    </span>
                  </div>
                  <div className="hidden md:block col-span-2 text-right">
                    <span className="text-xs text-gray-400 flex items-center justify-end gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(m.created_at)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
