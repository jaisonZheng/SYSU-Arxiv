import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Search, Bell, HelpCircle } from 'lucide-react'
import { useState } from 'react'

export default function TopNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const [search, setSearch] = useState('')

  const navLinks = [
    { path: '/', label: 'Explore' },
    { path: '/upload', label: 'Upload' },
  ]

  const handleSearch = (e) => {
    e.preventDefault()
    if (search.trim()) {
      navigate(`/explore?search=${encodeURIComponent(search.trim())}`)
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="flex items-center justify-between px-6 h-16 max-w-[1440px] mx-auto">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-xl font-bold tracking-tight text-gray-900">
            SYSU-Arxiv
          </Link>
          <form onSubmit={handleSearch} className="relative hidden md:flex items-center w-96">
            <Search className="absolute left-3 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search resources, tags, or authors..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
          </form>
        </div>
        <nav className="hidden md:flex items-center gap-1 h-full">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm tracking-tight font-medium px-4 py-2 rounded-md transition-colors ${
                  isActive
                    ? 'text-primary bg-primary/5'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>
        <div className="flex items-center gap-2">
          <button className="text-gray-500 hover:text-gray-900 p-2 rounded-full hover:bg-gray-50 transition-colors">
            <Bell className="w-5 h-5" />
          </button>
          <button className="text-gray-500 hover:text-gray-900 p-2 rounded-full hover:bg-gray-50 transition-colors">
            <HelpCircle className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold ml-1">
            S
          </div>
        </div>
      </div>
    </header>
  )
}
