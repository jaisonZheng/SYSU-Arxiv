import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { UploadCloud, File, X, AlertTriangle, CheckCircle } from 'lucide-react'
import { api } from '../api/client'

const categories = [
  { value: 'past_exam', label: 'Past Exam (真题)' },
  { value: 'study_material', label: 'Study Material (复习资料)' },
]

const subCategories = [
  { value: '', label: 'Select type...' },
  { value: 'lecture', label: 'Lecture (课件)' },
  { value: 'notes', label: 'Notes (笔记)' },
  { value: 'mock_exam', label: 'Mock Exam (模拟题)' },
  { value: 'summary', label: 'Summary (总结)' },
  { value: 'other', label: 'Other (其它)' },
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
      alert('Please select at least one file')
      return
    }
    if (!form.category) {
      alert('Please select a category')
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
    <div className="flex flex-col gap-6 max-w-[800px] mx-auto">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900 leading-[38px]">Upload Resource</h1>
        <p className="text-base text-gray-500 mt-1">Submit new past exams, study notes, or course materials.</p>
      </div>

      {/* Upload Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
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
          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
            <UploadCloud className="w-8 h-8 text-primary" />
          </div>
          <p className="text-lg font-semibold text-gray-900 mb-1">Drag & Drop or Click to Upload</p>
          <p className="text-sm text-gray-500">Supports PDF, DOCX, PPTX, ZIP files up to 100MB.</p>
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
              <div key={i} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <File className="w-5 h-5 text-gray-400 shrink-0" />
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

        <hr className="border-t border-gray-200 my-6" />

        {/* Form */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Resource Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <div className="md:col-span-2 flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Title <span className="text-red-500">*</span></label>
              <input
                type="text" name="title" value={form.title} onChange={handleChange}
                placeholder="e.g., Data Structures Final Exam 2023"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Category <span className="text-red-500">*</span></label>
              <select name="category" value={form.category} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
              >
                <option value="">Select category...</option>
                {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Sub Category</label>
              <select name="sub_category" value={form.sub_category} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
              >
                {subCategories.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Department</label>
              <input type="text" name="department" value={form.department} onChange={handleChange}
                placeholder="e.g., School of Computer Science"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Major</label>
              <input type="text" name="major" value={form.major} onChange={handleChange}
                placeholder="e.g., Software Engineering"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Course Name</label>
              <input type="text" name="course_name" value={form.course_name} onChange={handleChange}
                placeholder="e.g., Data Structures"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Instructor</label>
              <input type="text" name="instructor" value={form.instructor} onChange={handleChange}
                placeholder="e.g., Prof. Zhang"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Year</label>
              <input type="number" name="year" value={form.year} onChange={handleChange}
                placeholder="e.g., 2023" min="1900" max="2100"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
              />
            </div>

            <div className="md:col-span-2 flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Description</label>
              <textarea name="description" value={form.description} onChange={handleChange}
                placeholder="Brief description of the resource..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary resize-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Uploader Name</label>
              <input type="text" name="uploader_name" value={form.uploader_name} onChange={handleChange}
                placeholder="Your name (optional)"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 border border-gray-200 text-primary rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={uploading || files.length === 0}
            className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {uploading ? 'Uploading...' : 'Submit Resource'}
          </button>
        </div>
      </div>

      {/* Duplicate Modal */}
      {showDuplicateModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
              <h3 className="text-lg font-semibold text-gray-900">Duplicate File Detected</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              A file named "<strong>{duplicateInfo?.filename}</strong>" already exists. Do you want to continue uploading?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDuplicateModal(false)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={doUpload}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90"
              >
                Continue Upload
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
              {uploadResult.success ? 'Upload Successful' : 'Upload Failed'}
            </span>
          </div>
          {uploadResult.success ? (
            <div className="text-sm text-green-700">
              {uploadResult.results.map((r, i) => (
                <div key={i}>{r.filename} uploaded successfully (ID: {r.id})</div>
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
