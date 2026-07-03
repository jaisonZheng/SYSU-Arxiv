import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Layout from './components/Layout'
import Home from './pages/Home'
import Explore from './pages/Explore'
import CoursePackages from './pages/CoursePackages'
import Detail from './pages/Detail'
import Upload from './pages/Upload'
import Help from './pages/Help'
import Experience from './pages/Experience'
import Search from './pages/Search'
import Login from './pages/Login'
import Profile from './pages/Profile'
import HotRanking from './pages/HotRanking'
import Monitor from './pages/Monitor'
import FinalWeekModal from './components/FinalWeekModal'

const FINAL_WEEK_START = new Date('2026-06-28T00:00:00+08:00')
const FINAL_WEEK_END = new Date('2026-07-06T00:00:00+08:00')
const FINAL_WEEK_FLAG = 'final-week-modal-shown'

function isFinalWeekActive() {
  const now = new Date()
  return now >= FINAL_WEEK_START && now < FINAL_WEEK_END
}

function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const [showFinalWeek, setShowFinalWeek] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return
    if (!isFinalWeekActive()) return
    if (localStorage.getItem(FINAL_WEEK_FLAG)) return
    setShowFinalWeek(true)
    localStorage.setItem(FINAL_WEEK_FLAG, '1')
  }, [location.pathname])

  return (
    <>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="past-exams" element={<Explore key="past-exams" category="past_exam" title="历年真题" />} />
          <Route path="study-materials" element={<Explore key="study-materials" category="study_material" title="学习资料" />} />
          <Route path="experience" element={<Experience category="experience" title="经验攻略" />} />
          <Route path="course-packages" element={<CoursePackages />} />
          <Route path="material/:id" element={<Detail />} />
          <Route path="package/:id" element={<Detail isPackage />} />
          <Route path="upload" element={<Upload />} />
          <Route path="help" element={<Help />} />
          <Route path="hot-ranking" element={<HotRanking />} />
          <Route path="search" element={<Search />} />
          <Route path="login" element={<Login />} />
          <Route path="profile" element={<Profile />} />
          <Route path="monitor" element={<Monitor />} />
        </Route>
      </Routes>
      {showFinalWeek && (
        <FinalWeekModal
          onClose={() => setShowFinalWeek(false)}
          onNavigateUpload={() => navigate('/upload')}
        />
      )}
    </>
  )
}

export default App
