import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Download, FileText, Calendar, User, Building2, BookOpen, ArrowLeft, Clock } from 'lucide-react'
import { api } from '../api/client'
import ResourceCard from '../components/ResourceCard'

export default function Detail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [related, setRelated] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.getMaterial(id)
      setData(res.material)
      setRelated(res.related || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    if (!data) return
    const url = data.is_zip_package
      ? api.downloadPackage(data.id)
      : api.downloadMaterial(data.id)
    window.open(url, '_blank')
  }

  const formatSize = (bytes) => {
    if (!bytes) return 'Unknown'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('zh-CN')
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Loading...</div>
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">{error || 'Material not found'}</p>
        <button
          onClick={() => navigate('/explore')}
          className="text-primary hover:underline"
        >
          Back to Explore
        </button>
      </div>
    )
  }

  const m = data

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button onClick={() => navigate('/')} className="hover:text-primary transition-colors">Home</button>
        <span>/</span>
        <button onClick={() => navigate('/explore')} className="hover:text-primary transition-colors">Explore</button>
        <span>/</span>
        <span className="text-gray-900">{m.title}</span>
      </div>

      {/* Header */}
      <div className="flex justify-between items-start gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 leading-[38px]">{m.title}</h1>
          <p className="text-base text-gray-500 mt-2">{m.description || `${m.course_name || ''} ${m.department || ''}`.trim()}</p>
        </div>
        <div className="flex gap-2">
          {m.category === 'past_exam' && (
            <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider rounded">
              Past Exam
            </span>
          )}
          {m.category === 'study_material' && (
            <span className="px-2 py-1 bg-secondary/10 text-secondary text-xs font-semibold uppercase tracking-wider rounded">
              Study Material
            </span>
          )}
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Preview */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <FileText className="w-4 h-4" />
                <span>File Preview</span>
              </div>
            </div>
            <div className="w-full aspect-[4/3] bg-gray-100 flex items-center justify-center">
              <div className="text-center">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-400">Preview not available</p>
                <p className="text-xs text-gray-400 mt-1">Download to view the file</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Meta & Actions */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Actions */}
          <div className="bg-white border border-gray-200 rounded-lg p-5 flex flex-col gap-3">
            <button
              onClick={handleDownload}
              className="w-full h-10 bg-primary text-white rounded-lg flex items-center justify-center gap-2 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Download className="w-4 h-4" />
              Download {m.is_zip_package ? 'Package' : 'File'}
            </button>
            <div className="text-center text-xs text-gray-500">
              {formatSize(m.file_size)} · {m.download_count} downloads
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-white border border-gray-200 rounded-lg p-5 flex flex-col gap-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Resource Metadata</h3>
            <div className="flex flex-col gap-3">
              {m.file_type && (
                <div className="flex justify-between items-center py-1 border-b border-gray-100">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">File Type</span>
                  <span className="text-sm text-gray-900 font-medium">{m.file_type}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-1 border-b border-gray-100">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">File Size</span>
                <span className="text-sm text-gray-900 font-medium">{formatSize(m.file_size)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-gray-100">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Upload Date</span>
                <span className="text-sm text-gray-900 font-medium">{formatDate(m.created_at)}</span>
              </div>
              {m.year?.Valid && (
                <div className="flex justify-between items-center py-1 border-b border-gray-100">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Year</span>
                  <span className="text-sm text-gray-900 font-medium">{m.year.Int64}</span>
                </div>
              )}
              {m.department && (
                <div className="flex justify-between items-center py-1 border-b border-gray-100">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Department</span>
                  <span className="text-sm text-primary font-medium">{m.department}</span>
                </div>
              )}
              {m.course_name && (
                <div className="flex justify-between items-center py-1 border-b border-gray-100">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Course</span>
                  <span className="text-sm text-gray-900 font-medium">{m.course_name}</span>
                </div>
              )}
              {m.instructor && (
                <div className="flex justify-between items-center py-1 border-b border-gray-100">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Instructor</span>
                  <span className="text-sm text-gray-900 font-medium">{m.instructor}</span>
                </div>
              )}
              {m.sub_category && (
                <div className="flex justify-between items-center py-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Type</span>
                  <span className="text-sm text-gray-900 font-medium capitalize">{m.sub_category}</span>
                </div>
              )}
            </div>
          </div>

          {/* Uploader */}
          {m.uploader_name && (
            <div className="bg-white border border-gray-200 rounded-lg p-5 flex flex-col gap-3">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Contributor</h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                  {m.uploader_name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-gray-900">{m.uploader_name}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Related Resources */}
      {related.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900 mb-4 border-b border-gray-200 pb-2">
            Related Resources
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {related.map((r) => (
              <ResourceCard key={r.id} material={r} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
