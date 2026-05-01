import { Outlet } from 'react-router-dom'
import TopNav from './TopNav'
import SideNav from './SideNav'
import BottomNav from './BottomNav'

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <TopNav />
      <div className="flex flex-1">
        <SideNav />
        <main className="flex-1 md:pl-[200px] p-4 md:p-6 pb-20 md:pb-6">
          <div className="max-w-[1000px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
