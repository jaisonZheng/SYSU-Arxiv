import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import TopNav from './TopNav'
import BottomNav from './BottomNav'
import Footer from './Footer'

export default function Layout() {
  const location = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [location.pathname])

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden bg-[--color-bg]">
      {/* 背景装饰：左上&右上柔光，底部噪点 */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 texture-paper opacity-50" />
      <div aria-hidden className="pointer-events-none absolute -top-40 -left-32 -z-10 w-[520px] h-[520px] rounded-full blur-[120px] opacity-45" style={{ background: 'radial-gradient(circle, #FFE6CB 0%, transparent 65%)' }} />
      <div aria-hidden className="pointer-events-none absolute -top-32 right-[-120px] -z-10 w-[420px] h-[420px] rounded-full blur-[120px] opacity-40" style={{ background: 'radial-gradient(circle, #D6E9DA 0%, transparent 65%)' }} />

      <TopNav />

      <main className="flex-1 w-full">
        <div className="max-w-[1180px] mx-auto px-4 md:px-6 py-6 md:py-10 pb-28 md:pb-16">
          <Outlet />
        </div>
      </main>

      <Footer />
      <BottomNav />
    </div>
  )
}
