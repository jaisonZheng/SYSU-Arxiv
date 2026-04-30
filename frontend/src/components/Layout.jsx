import { Outlet } from 'react-router-dom'
import TopNav from './TopNav'
import SideNav from './SideNav'

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        <SideNav />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-[1200px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
