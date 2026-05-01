import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { UploadCloud, File, X, AlertTriangle, CheckCircle } from 'lucide-react'
import { api } from '../api/client'

const categories = [
  { value: 'past_exam', label: '历年真题' },
  { value: 'study_material', label: '学习资料' },
]

const subCategories = [
  { value: '', label: '选择类型...' },
  { value: 'lecture', label: '课件' },
  { value: 'notes', label: '笔记' },
  { value: 'mock_exam', label: '模拟题' },
  { value: 'summary', label: '总结' },
  { value: 'other', label: '其它' },
]

export default function UploadPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [files, setFiles] = useState([])
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    sub_category: '',
    department: '',
    major: '',
    course_name: '',
    instructor: '',
    year: '',
    file_type: '',
    uploader_name: '',
    is_zip_package: false,
  })
  const [uploading, setUploading] = useState(false)
  const [duplicateInfo, setDuplicateInfo] = useState(null)
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const [dragOver, setDragOver] = useState(false)

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = Array.from(e.dataTransfer.files)
    addFiles(dropped)
  }, [])

  const addFiles = (newFiles) => {
    const valid = newFiles.filter((f) => {
      const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase()
      const allowed = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.txt', '.md', '.jpg', '.jpeg', '.png', '.zip', '.rar', '.7z']
      return allowed.includes(ext)
    })
    setFiles((prev) => [...prev, ...valid])
    if (valid.length > 0 && !form.title) {
      const first = valid[0]
      const base = first.name.replace(/\.[^.]+$/, '')
      setForm((prev) => ({ ...prev, title: base }))
    }
  }

  const handleFileSelect = (e) => {
    addFiles(Array.from(e.target.files || []))
  }

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const checkDuplicates = async () => {
    for (const file of files) {
      try {
        const res = await api.checkDuplicate(file.name)
        if (res.duplicate) {
          setDuplicateInfo({ filename: file.name })
          setShowDuplicateModal(true)
          return true
        }
      } catch (e) {
        console.error(e)
      }
    }
    return false
  }

  const handleSubmit = async () => {
    if (files.length === 0) {
      alert('请至少选择一个文件')
      return
    }
    if (!form.category) {
      alert('请选择分类')
      return
    }

    const hasDuplicate = await checkDuplicates()
    if (hasDuplicate) return

    await doUpload()
  }

  const doUpload = async () => {
    setUploading(true)
    setUploadResult(null)

    try {
      const results = []
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('title', form.title || file.name.replace(/\.[^.]+$/, ''))
        formData.append('description', form.description)
        formData.append('category', form.category)
        if (form.sub_category) formData.append('sub_category', form.sub_category)
        if (form.department) formData.append('department', form.department)
        if (form.major) formData.append('major', form.major)
        if (form.course_name) formData.append('course_name', form.course_name)
        if (form.instructor) formData.append('instructor', form.instructor)
        if (form.year) formData.append('year', form.year)
        if (form.file_type) formData.append('file_type', form.file_type)
        if (form.uploader_name) formData.append('uploader_name', form.uploader_name)

        const isZip = file.name.toLowerCase().endsWith('.zip')
        const endpoint = isZip ? api.createZipPackage : api.createMaterial
        const res = await endpoint(formData)
        results.push({ filename: file.name, success: true, id: res.id })
      }
      setUploadResult({ success: true, results })
      setFiles([])
    } catch (e) {
      setUploadResult({ success: false, error: e.message })
    } finally {
      setUploading(false)
      setShowDuplicateModal(false)
    }
  }

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="flex flex-col gap-5 max-w-[720px] mx-auto">
      <div className="flex items-center gap-2">
        <div className="w-1 h-5 bg-primary rounded-full" />
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">上传资源</h1>
      </div>
      <p className="text-base text-gray-500 -mt-3">分享你的历年真题、学习笔记或课程资料。</p>

      {/* Upload Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        {/* Drag & Drop */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`w-full border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer transition-colors ${
            dragOver ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary'
          }`}
        >
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <UploadCloud className="w-7 h-7 text-gray-500" />
          </div>
          <p className="text-base font-semibold text-gray-900 mb-1">拖拽文件或点击上传</p>
          <p className="text-sm text-gray-500">支持 PDF、DOCX、PPTX、ZIP 等格式，最大 100MB</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="mt-4 flex flex-col gap-2">
            {files.map((file, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5">
                <div className="flex items-center gap-3 min-w-0">
                  <File className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-700 truncate">{file.name}</span>
                  <span className="text-xs text-gray-400 shrink-0">{formatSize(file.size)}</span>
                </div>
                <button onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500 p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <hr className="border-t border-gray-200 my-5" />

        {/* Form */}
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-4">资源详情</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-3.5">
            <div className="md:col-span-2 flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">标题 <span className="text-red-500">*</span></label>
              <input
                type="text" name="title" value={form.title} onChange={handleChange}
                placeholder="例如：数据结构 2023 期末真题"
                className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">分类 <span className="text-red-500">*</span></label>
              <select name="category" value={form.category} onChange={handleChange}
                className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
              >
                <option value="">选择分类...</option>
                {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">子分类</label>
              <select name="sub_category" value={form.sub_category} onChange={handleChange}
                className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
              >
                {subCategories.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">院系</label>
              <input type="text" name="department" value={form.department} onChange={handleChange}
                placeholder="例如：计算机学院"
                className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">专业</label>
              <input type="text" name="major" value={form.major} onChange={handleChange}
                placeholder="例如：软件工程"
                className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">课程名称</label>
              <input type="text" name="course_name" value={form.course_name} onChange={handleChange}
                placeholder="例如：数据结构"
                className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">授课教师</label>
              <input type="text" name="instructor" value={form.instructor} onChange={handleChange}
                placeholder="例如：张教授"
                className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">年份</label>
              <input type="number" name="year" value={form.year} onChange={handleChange}
                placeholder="例如：2023" min="1900" max="2100"
                className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
              />
            </div>

            <div className="md:col-span-2 flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">描述</label>
              <textarea name="description" value={form.description} onChange={handleChange}
                placeholder="简要描述该资源的内容..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary resize-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">上传者</label>
              <input type="text" name="uploader_name" value={form.uploader_name} onChange={handleChange}
                placeholder="你的名字（可选）"
                className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-gray-200">
          <button
            onClick={() => navigate('/')}
            className="px-5 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={uploading || files.length === 0}
            className="px-5 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {uploading ? '上传中...' : '提交资源'}
          </button>
        </div>
      </div>

      {/* Duplicate Modal */}
      {showDuplicateModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-5 max-w-md w-full mx-4 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
              <h3 className="text-base font-semibold text-gray-900">检测到重复文件</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              文件 "<strong>{duplicateInfo?.filename}</strong>" 已存在。是否继续上传？
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDuplicateModal(false)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={doUpload}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90"
              >
                继续上传
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result */}
      {uploadResult && (
        <div className={`rounded-lg p-4 border ${uploadResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            {uploadResult.success ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600" />
            )}
            <span className={`font-medium ${uploadResult.success ? 'text-green-800' : 'text-red-800'}`}>
              {uploadResult.success ? '上传成功' : '上传失败'}
            </span>
          </div>
          {uploadResult.success ? (
            <div className="text-sm text-green-700">
              {uploadResult.results.map((r, i) => (
                <div key={i}>{r.filename} 上传成功（ID: {r.id}）</div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-red-700">{uploadResult.error}</p>
          )}
        </div>
      )}
    </div>
  )
}
