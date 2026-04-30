import { Link, useLocation } from 'react-router-dom'
import { Home, Compass, FileText, BookOpen } from 'lucide-react'

const navItems = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/explore', label: 'Explore', icon: Compass },
  { path: '/explore?category=past_exam', label: 'Past Exams', icon: FileText },
  { path: '/explore?category=study_material', label: 'Study Materials', icon: BookOpen },
]

export default function SideNav() {
  const location = useLocation()

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    if (path.includes('?')) {
      const base = path.split('?')[0]
      return location.pathname === base
    }
    return location.pathname === path
  }

  return (
    <nav className="hidden md:flex bg-white h-screen border-r border-gray-200 w-64 flex-col shrink-0 sticky top-0"
    >
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-xl">
            S
          </div>
          <div>
            <h2 className="text-lg font-black text-gray-900 leading-tight">SYSU-Arxiv</h2>
            <p className="text-xs text-gray-500 font-medium">Institutional Repository</p>
          </div>
        </div>
      </div>
      <div className="flex flex-col p-4 gap-1 flex-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.path)
          const Icon = item.icon
          return (
            <Link
              key={item.label}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${
                active
                  ? 'bg-primary/5 text-primary'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
