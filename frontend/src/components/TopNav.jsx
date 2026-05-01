import { Link, useNavigate } from 'react-router-dom'
import { Search, Upload } from 'lucide-react'
import { useState } from 'react'

export default function TopNav() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const handleSearch = (e) => {
    e.preventDefault()
    if (search.trim()) {
      navigate(`/past-exams?search=${encodeURIComponent(search.trim())}`)
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 h-12">
      <div className="flex items-center justify-between px-4 h-full max-w-[1440px] mx-auto">
        {/* Left: Logo + Search */}
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo-nav.png" alt="" className="h-9 w-auto" />
            <span className="text-base font-bold text-gray-900 tracking-tight">SYSU-Arxiv</span>
          </Link>

          <form onSubmit={handleSearch} className="relative hidden md:flex items-center w-80">
            <Search className="absolute left-3 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索资源、标签或作者..."
              className="w-full pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
          </form>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate('/upload')}
            className="hidden md:flex items-center gap-1.5 text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Upload className="w-4 h-4" />
            上传
          </button>
        </div>
      </div>
    </header>
  )
}
