import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Explore from './pages/Explore'
import Detail from './pages/Detail'
import Upload from './pages/Upload'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="explore" element={<Explore />} />
        <Route path="material/:id" element={<Detail />} />
        <Route path="upload" element={<Upload />} />
      </Route>
    </Routes>
  )
}

export default App
