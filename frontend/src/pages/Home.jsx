import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, FileText, BookOpen, ArrowRight } from 'lucide-react'
import { api } from '../api/client'
import ResourceCard from '../components/ResourceCard'

export default function Home() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [recentMaterials, setRecentMaterials] = useState([])
  const [stats, setStats] = useState({ total: 0, exams: 0, materials: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [recent, examsRes, materialsRes] = await Promise.all([
        api.listMaterials({ page_size: 5, sort_by: 'created_at' }),
        api.listMaterials({ category: 'past_exam', page_size: 1 }),
        api.listMaterials({ category: 'study_material', page_size: 1 }),
      ])
      setRecentMaterials(recent.items || [])
      setStats({
        total: (examsRes.total || 0) + (materialsRes.total || 0),
        exams: examsRes.total || 0,
        materials: materialsRes.total || 0,
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
      navigate(`/explore?search=${encodeURIComponent(search.trim())}`)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Hero / Search */}
      <section className="flex flex-col items-center justify-center py-12 w-full max-w-3xl mx-auto text-center space-y-4">
        <h1 className="text-3xl md:text-[30px] font-semibold tracking-tight text-gray-900 leading-[38px]">
          SYSU Academic Resources
        </h1>
        <p className="text-base text-gray-500 max-w-2xl leading-6">
          Access past exams, study notes, and course materials contributed by students across all departments.
        </p>
        <form onSubmit={handleSearch} className="w-full relative mt-4">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-primary w-6 h-6" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search for subjects, courses, or resources..."
            className="w-full pl-14 pr-28 py-4 bg-white border border-gray-200 rounded-full text-base focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm transition-all"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-[#004395] transition-colors"
          >
            Search
          </button>
        </form>
      </section>

      {/* Categories Bento */}
      <section>
        <div className="flex items-center justify-between mb-4 border-b border-gray-200 pb-2">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900">Content Categories</h2>
          <button
            onClick={() => navigate('/explore')}
            className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
          >
            View All <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Past Exams - Large */}
          <div
            onClick={() => navigate('/explore?category=past_exam')}
            className="col-span-1 md:col-span-2 bg-white border border-gray-200 rounded-lg p-5 hover:border-gray-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-all flex flex-col justify-between group cursor-pointer h-44 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
            <div className="flex justify-between items-start relative z-10">
              <span className="bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider px-2 py-1 rounded">
                EXAMS
              </span>
              <FileText className="w-6 h-6 text-gray-400 group-hover:text-primary transition-colors" />
            </div>
            <div className="relative z-10">
              <h3 className="text-xl font-semibold text-gray-900 mb-1">Past Exams</h3>
              <p className="text-sm text-gray-500">Previous years' examination papers across all departments</p>
              <p className="text-sm text-primary mt-2 font-medium">{stats.exams} resources</p>
            </div>
          </div>

          {/* Study Materials */}
          <div
            onClick={() => navigate('/explore?category=study_material')}
            className="bg-white border border-gray-200 rounded-lg p-5 hover:border-gray-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-all flex flex-col justify-between group cursor-pointer h-44"
          >
            <div className="flex justify-between items-start">
              <span className="bg-gray-100 text-gray-600 text-xs font-semibold uppercase tracking-wider px-2 py-1 rounded">
                MATERIALS
              </span>
              <BookOpen className="w-6 h-6 text-gray-400 group-hover:text-primary transition-colors" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">Study Materials</h3>
              <p className="text-sm text-gray-500">Notes, slides, and study guides</p>
              <p className="text-sm text-primary mt-2 font-medium">{stats.materials} resources</p>
            </div>
          </div>

          {/* Upload */}
          <div
            onClick={() => navigate('/upload')}
            className="bg-white border border-gray-200 rounded-lg p-5 hover:border-gray-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-all flex flex-col justify-between group cursor-pointer h-44"
          >
            <div className="flex justify-between items-start">
              <span className="bg-gray-100 text-gray-600 text-xs font-semibold uppercase tracking-wider px-2 py-1 rounded">
                CONTRIBUTE
              </span>
              <ArrowRight className="w-6 h-6 text-gray-400 group-hover:text-primary transition-colors" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">Upload Resources</h3>
              <p className="text-sm text-gray-500">Share your notes and exam papers</p>
            </div>
          </div>
        </div>
      </section>

      {/* Recently Uploaded */}
      <section>
        <div className="flex items-center justify-between mb-4 border-b border-gray-200 pb-2">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900">Recently Uploaded</h2>
          <button
            onClick={() => navigate('/explore')}
            className="text-sm font-medium text-primary hover:underline"
          >
            View All
          </button>
        </div>
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : recentMaterials.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-white border border-gray-200 rounded-lg">
            No resources yet. Be the first to upload!
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {recentMaterials.map((m) => (
              <ResourceCard key={m.id} material={m} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
