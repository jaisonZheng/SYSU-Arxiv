import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Explore from './pages/Explore'
import CoursePackages from './pages/CoursePackages'
import Detail from './pages/Detail'
import Upload from './pages/Upload'
import Help from './pages/Help'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="past-exams" element={<Explore key="past-exams" category="past_exam" title="历年真题" />} />
        <Route path="study-materials" element={<Explore key="study-materials" category="study_material" title="学习资料" />} />
        <Route path="course-packages" element={<CoursePackages />} />
        <Route path="material/:id" element={<Detail />} />
        <Route path="package/:id" element={<Detail isPackage />} />
        <Route path="upload" element={<Upload />} />
        <Route path="help" element={<Help />} />
      </Route>
    </Routes>
  )
}

export default App
