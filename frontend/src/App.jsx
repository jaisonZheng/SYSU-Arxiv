import { Routes, Route } from 'react-router-dom'
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

function App() {
  return (
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
  )
}

export default App
