import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Home, FileText, BookOpen, Package, HelpCircle, Plus } from 'lucide-react'

const navItems = [
  { path: '/', label: '首页', icon: Home },
  { path: '/course-packages', label: '课程资源包', icon: Package },
  { path: '/past-exams', label: '历年真题', icon: FileText },
  { path: '/study-materials', label: '学习资料', icon: BookOpen },
]

export default function SideNav() {
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname === path
  }

  return (
    <aside className="hidden md:flex bg-white h-[calc(100vh-3rem)] border-r border-gray-200 w-[200px] flex-col shrink-0 fixed top-12 left-0 z-40">
      {/* Main Nav */}
      <div className="flex flex-col px-2 py-2 gap-0.5 flex-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.path)
          const Icon = item.icon
          return (
            <Link
              key={item.label}
              to={item.path}
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                active
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          )
        })}

        {/* Upload action in sidebar */}
        <div className="mt-3 px-2">
          <button
            onClick={() => navigate('/upload')}
            className="w-full bg-primary text-white py-1.5 rounded-md text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            贡献资源
          </button>
        </div>
      </div>

      {/* Bottom Nav */}
      <div className="px-2 py-2 border-t border-gray-100 space-y-0.5">
        <Link
          to="/help"
          className={`flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            location.pathname === '/help'
              ? 'bg-gray-100 text-gray-900'
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          帮助中心
        </Link>
        <a
          href="https://github.com/jaisonZheng/SYSU-Arxiv.git"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 px-3 py-1.5 text-gray-500 hover:bg-gray-50 hover:text-gray-700 rounded-md text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          GitHub
        </a>
      </div>
    </aside>
  )
}
