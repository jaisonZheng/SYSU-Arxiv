import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Home, FileText, BookOpen, Package, HelpCircle, Code, Plus } from 'lucide-react'

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
            提交资源
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
          href="#"
          className="flex items-center gap-2.5 px-3 py-1.5 text-gray-500 hover:bg-gray-50 hover:text-gray-700 rounded-md text-sm font-medium transition-colors"
        >
          <Code className="w-4 h-4" />
          GitHub
        </a>
      </div>
    </aside>
  )
}
