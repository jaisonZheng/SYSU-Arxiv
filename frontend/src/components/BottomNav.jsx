import { Link, useLocation } from 'react-router-dom'
import { Home, FileText, BookOpen, Package, Upload } from 'lucide-react'

const navItems = [
  { path: '/', label: '首页', icon: Home },
  { path: '/course-packages', label: '资源包', icon: Package },
  { path: '/past-exams', label: '真题', icon: FileText },
  { path: '/study-materials', label: '资料', icon: BookOpen },
  { path: '/upload', label: '上传', icon: Upload },
]

export default function BottomNav() {
  const location = useLocation()

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname === path
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const active = isActive(item.path)
          const Icon = item.icon
          return (
            <Link
              key={item.label}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-0.5 w-16 h-full ${
                active ? 'text-primary' : 'text-gray-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
