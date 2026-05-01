import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Search, Sparkles, Heart, Menu, X } from 'lucide-react'
import { Github } from './icons'
import { useEffect, useState } from 'react'

const navItems = [
  { path: '/',                  label: '首页',   end: true },
  { path: '/course-packages',   label: '课程包' },
  { path: '/past-exams',        label: '历年真题' },
  { path: '/study-materials',   label: '学习资料' },
  { path: '/help',              label: '关于' },
]

export default function TopNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const [search, setSearch] = useState('')
  const [scrolled, setScrolled] = useState(false)
  const [openMobile, setOpenMobile] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => { setOpenMobile(false) }, [location.pathname])

  const handleSearch = (e) => {
    e.preventDefault()
    if (search.trim()) {
      navigate(`/past-exams?search=${encodeURIComponent(search.trim())}`)
      setSearch('')
    }
  }

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        scrolled
          ? 'backdrop-blur-xl bg-[--color-cream-50]/85 border-b border-[--color-line]'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-[1180px] mx-auto px-4 md:px-6 h-[64px] flex items-center gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="relative">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[--color-camphor-400] to-[--color-camphor-600] grid place-items-center shadow-[0_8px_18px_-8px_rgba(45,106,79,0.45)] group-hover:scale-105 group-hover:rotate-[-4deg] transition-transform duration-500">
              <span className="text-white text-[15px] font-bold tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>同</span>
            </div>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[--color-honey-400] ring-2 ring-[--color-cream-50]" />
          </div>
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="text-[16px] font-bold tracking-tight text-[--color-ink-900]" style={{ fontFamily: 'var(--font-display)' }}>同窗角落</span>
            <span className="text-[10.5px] text-[--color-ink-500] tracking-wide">SYSU · 资料共享社区</span>
          </div>
        </Link>

        {/* Nav (desktop) */}
        <nav className="hidden md:flex items-center gap-1 ml-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `relative px-3.5 py-1.5 rounded-full text-[14px] font-medium transition-colors ${
                  isActive
                    ? 'text-[--color-camphor-700] bg-[--color-camphor-50]'
                    : 'text-[--color-ink-500] hover:text-[--color-ink-900] hover:bg-[--color-cream-100]'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Search (desktop) */}
        <form onSubmit={handleSearch} className="hidden lg:flex relative items-center flex-1 max-w-[280px] ml-2">
          <Search className="absolute left-3.5 w-4 h-4 text-[--color-ink-400] pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="今天要找什么资料？"
            className="w-full h-9 pl-10 pr-3 bg-[--color-cream-100] border border-transparent rounded-full text-[13.5px] placeholder-[--color-ink-400] focus:bg-white focus:border-[--color-camphor-300] focus:ring-4 focus:ring-[--color-camphor-100] transition"
          />
        </form>

        <div className="flex-1 lg:hidden" />

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <a
            href="https://github.com/jaisonZheng/SYSU-Arxiv.git"
            target="_blank" rel="noopener noreferrer"
            className="hidden sm:grid place-items-center w-9 h-9 rounded-full text-[--color-ink-500] hover:text-[--color-ink-900] hover:bg-[--color-cream-100] transition"
            title="GitHub"
          >
            <Github className="w-4 h-4" />
          </a>

          <button
            onClick={() => navigate('/upload')}
            className="hidden sm:inline-flex items-center gap-1.5 h-9 pl-3.5 pr-4 rounded-full text-[13.5px] font-semibold text-white bg-gradient-to-r from-[--color-honey-400] to-[--color-kapok-400] shadow-[0_8px_22px_-10px_rgba(244,125,44,0.55)] hover:scale-[1.03] active:scale-[0.97] transition-transform"
          >
            <Sparkles className="w-3.5 h-3.5" />
            分享一份
          </button>

          {/* Mobile toggle */}
          <button
            onClick={() => setOpenMobile((v) => !v)}
            className="md:hidden grid place-items-center w-9 h-9 rounded-full hover:bg-[--color-cream-100] text-[--color-ink-700]"
            aria-label="菜单"
          >
            {openMobile ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {openMobile && (
        <div className="md:hidden border-t border-[--color-line] bg-[--color-cream-50] animate-fade-up">
          <div className="px-4 py-3 space-y-1">
            <form onSubmit={handleSearch} className="relative mb-3">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[--color-ink-400]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="今天要找什么资料？"
                className="w-full h-10 pl-10 pr-3 bg-white border border-[--color-line] rounded-full text-sm focus:border-[--color-camphor-300] focus:ring-4 focus:ring-[--color-camphor-100] transition"
              />
            </form>
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `block px-4 py-2.5 rounded-2xl text-sm font-medium ${
                    isActive
                      ? 'bg-[--color-camphor-50] text-[--color-camphor-700]'
                      : 'text-[--color-ink-700] hover:bg-[--color-cream-100]'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <button
              onClick={() => navigate('/upload')}
              className="mt-2 w-full inline-flex items-center justify-center gap-2 h-11 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-[--color-honey-400] to-[--color-kapok-400]"
            >
              <Heart className="w-4 h-4" /> 分享一份资料
            </button>
          </div>
        </div>
      )}
    </header>
  )
}
