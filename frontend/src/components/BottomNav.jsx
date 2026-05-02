import { Link, useLocation } from 'react-router-dom'
import { Home, FileText, BookOpen, Package } from 'lucide-react'

const navItems = [
  { path: '/',                label: '首页',   icon: Home },
  { path: '/course-packages', label: '课程包', icon: Package },
  { path: '/past-exams',      label: '真题',   icon: FileText },
  { path: '/study-materials', label: '资料',   icon: BookOpen },
]

export default function BottomNav() {
  const location = useLocation()
  const isActive = (path) => path === '/' ? location.pathname === '/' : location.pathname === path

  return (
    <nav className="md:hidden fixed bottom-3 left-3 right-3 z-50">
      <div className="bg-white/95 backdrop-blur-xl rounded-[28px] shadow-[0_18px_46px_-12px_rgba(34,26,12,0.18)] border border-[--color-line] px-2 py-1.5 flex items-center justify-between">
        {navItems.map((item) => {
          const active = isActive(item.path)
          const Icon = item.icon
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-0.5 w-14 h-12 rounded-2xl transition-colors ${
                active ? 'text-[--color-camphor-700] bg-[--color-camphor-50]' : 'text-[--color-ink-400]'
              }`}
            >
              <Icon className="w-[18px] h-[18px]" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
