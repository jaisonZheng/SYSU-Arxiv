import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  UploadCloud, File as FileIcon, X, AlertTriangle, CheckCircle, Sparkles,
  ArrowLeft, Heart, FileText, Package, Mail,
} from 'lucide-react'
import { api, API_BASE } from '../api/client'
import { formatSize, formatSpeed, cheer } from '../lib/format'

const categories = [
  { value: 'past_exam',      label: '历年真题',   emoji: '📝', desc: '期末/期中卷子、模拟题',   tone: 'kapok' },
  { value: 'study_material', label: '学习资料',   emoji: '📓', desc: '笔记、课件、总结、答案',   tone: 'camphor' },
  { value: 'package',        label: '课程资源包', emoji: '🎁', desc: '整门课打包，ZIP 格式最佳', tone: 'honey' },
  { value: 'experience',     label: '经验攻略',   emoji: '🧭', desc: '转专业、留学、新生、二次遴选等经验', tone: 'mist' },
]

const subCategories = [
  { value: '',                label: '不指定' },
  { value: 'lecture',         label: '课件' },
  { value: 'notes',           label: '笔记' },
  { value: 'mock_exam',       label: '模拟题' },
  { value: 'exam_answer',     label: '试卷答案' },
  { value: 'textbook_answer', label: '教材答案' },
  { value: 'summary',         label: '总结' },
  { value: 'other',           label: '其它' },
]

const allowedExt = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.txt', '.md', '.jpg', '.jpeg', '.png', '.zip', '.rar', '.7z']
const MAX_SIZE = 200 * 1024 * 1024;

const initialForm = {
  title: '', description: '',
  category: '', sub_category: '',
  department: '', major: '',
  course_name: '', instructor: '',
  year: '', file_type: '', uploader_name: '',
}

function mimeTypeForFile(file) {
  if (file.type) return file.type
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
  switch (ext) {
    case '.pdf': return 'application/pdf'
    case '.doc': return 'application/msword'
    case '.docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    case '.ppt': return 'application/vnd.ms-powerpoint'
    case '.pptx': return 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    case '.xls': return 'application/vnd.ms-excel'
    case '.xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    case '.txt': return 'text/plain'
    case '.md': return 'text/markdown'
    case '.jpg': case '.jpeg': return 'image/jpeg'
    case '.png': return 'image/png'
    case '.zip': return 'application/zip'
    case '.rar': return 'application/vnd.rar'
    case '.7z': return 'application/x-7z-compressed'
    default: return 'application/octet-stream'
  }
}

export default function UploadPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const nextIdRef = useRef(1)
  const filesRef = useRef([])
  const uploadingIdsRef = useRef(new Set())
  const [files, setFiles] = useState([])
  const [form, setForm] = useState(initialForm)
  const [duplicateInfo, setDuplicateInfo] = useState(null)
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [showIncompleteModal, setShowIncompleteModal] = useState(false)
  const [showThanksModal, setShowThanksModal] = useState(false)
  const [showSingleFileModal, setShowSingleFileModal] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const [dragOver, setDragOver] = useState(false)

  filesRef.current = files

  const totalSize = useMemo(() => files.reduce((s, f) => s + (f.file.size || 0), 0), [files])
  const isUploading = useMemo(() => files.some(f => f.status === 'uploading'), [files])
  const allDone = useMemo(() => files.length > 0 && files.every(f => f.status === 'done'), [files])

  /* ----------------- 文件操作 ----------------- */
  const handleDragOver = useCallback((e) => { e.preventDefault(); setDragOver(true) }, [])
  const handleDragLeave = useCallback((e) => { e.preventDefault(); setDragOver(false) }, [])
  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false)
    addFiles(Array.from(e.dataTransfer.files))
  }, [])

  const makeFileItem = (file) => ({
    id: nextIdRef.current++,
    file,
    filePath: null,
    status: 'pending',
    progress: 0,
    speed: '',
    error: '',
  })

  const addFiles = (newFiles) => {
    if (filesRef.current.length > 0 || newFiles.length > 1) {
      setShowSingleFileModal(true)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    const rejected = []
    const tooLarge = []
    const valid = []

    for (const f of newFiles) {
      const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase()
      if (!allowedExt.includes(ext)) {
        rejected.push(f.name)
        continue
      }
      if (f.size > MAX_SIZE) {
        tooLarge.push(f.name)
        continue
      }
      valid.push(makeFileItem(f))
    }

    if (rejected.length > 0) {
      setUploadResult({ success: false, error: `不支持的文件格式：${rejected.join('、')}` })
    }
    if (tooLarge.length > 0) {
      setUploadResult({ success: false, error: `文件「${tooLarge[0]}」超过 200MB 限制，请压缩后上传` })
    }

    if (valid.length === 0) return

    setFiles((prev) => [...prev, ...valid])
    if (!form.title) {
      const first = valid[0].file
      const base = first.name.replace(/\.[^.]+$/, '')
      setForm((prev) => ({ ...prev, title: base }))
    }

    uploadFiles(valid)
  }

  const handleFileSelect = (e) => addFiles(Array.from(e.target.files || []))
  const removeFile = (id) => setFiles((prev) => prev.filter((f) => f.id !== id))

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  /* ----------------- 上传 ----------------- */
  const buildCacheFormData = (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return formData
  }

  const buildCreateFormData = (fileItem) => {
    const formData = new FormData()
    formData.append('file_path', fileItem.filePath)
    formData.append('file_name', fileItem.file.name)
    formData.append('mime_type', mimeTypeForFile(fileItem.file))
    formData.append('title', form.title || fileItem.file.name.replace(/\.[^.]+$/, ''))
    formData.append('description', form.description)
    formData.append('category', form.category)
    if (form.sub_category)  formData.append('sub_category', form.sub_category)
    if (form.department)    formData.append('department', form.department)
    if (form.major)         formData.append('major', form.major)
    if (form.course_name)   formData.append('course_name', form.course_name)
    if (form.instructor)    formData.append('instructor', form.instructor)
    if (form.year)          formData.append('year', form.year)
    if (form.file_type)     formData.append('file_type', form.file_type)
    if (form.uploader_name) formData.append('uploader_name', form.uploader_name)
    return formData
  }

  const uploadWithProgress = (fileItem, formData, endpoint) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      const startTime = performance.now()

      setFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, status: 'uploading', progress: 0, speed: '' } : f))

      xhr.upload.addEventListener('progress', (e) => {
        if (!e.lengthComputable) return
        const progress = Math.round((e.loaded / e.total) * 100)
        const duration = (performance.now() - startTime) / 1000
        const speed = duration > 0 ? formatSpeed(e.loaded / duration) : ''
        setFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, progress, speed } : f))
      })

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          let res = {}
          try { res = JSON.parse(xhr.responseText) } catch {}
          resolve(res)
        } else {
          let msg = `上传失败 (HTTP ${xhr.status})`
          try { const p = JSON.parse(xhr.responseText); if (p.error) msg = p.error } catch {}
          setFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, status: 'error', error: msg, speed: '' } : f))
          reject(new Error(msg))
        }
      })

      xhr.addEventListener('error', () => {
        setFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, status: 'error', error: '网络错误，请重试', speed: '' } : f))
        reject(new Error('网络错误'))
      })

      xhr.addEventListener('abort', () => {
        setFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, status: 'error', error: '已取消', speed: '' } : f))
        reject(new Error('已取消'))
      })

      xhr.open('POST', endpoint)
      const token = localStorage.getItem('token')
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      xhr.send(formData)
    })
  }

  const uploadOneFile = async (fileItem, skipDuplicate = false) => {
    if (fileItem.status === 'done' || fileItem.status === 'uploading') return
    if (uploadingIdsRef.current.has(fileItem.id)) return
    uploadingIdsRef.current.add(fileItem.id)

    try {
      setFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, status: 'uploading', progress: 0, speed: '' } : f))

      if (!skipDuplicate) {
        try {
          const res = await api.checkDuplicate(fileItem.file.name)
          if (res.duplicate) {
            setFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, status: 'duplicate' } : f))
            setDuplicateInfo({ filename: fileItem.file.name })
            setShowDuplicateModal(true)
            return
          }
        } catch (e) {
          console.error(e)
          setFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, status: 'error', error: '检查失败，请重试' } : f))
          return
        }
      }

      const res = await uploadWithProgress(fileItem, buildCacheFormData(fileItem.file), `${API_BASE}/api/upload/cache`)
      setFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, status: 'done', filePath: res.file_path, progress: 100, speed: '' } : f))
    } catch (e) {
      console.error(e)
      setFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, status: 'error', error: e.message || '上传失败', speed: '' } : f))
    } finally {
      uploadingIdsRef.current.delete(fileItem.id)
    }
  }

  const uploadFiles = (items) => {
    items.forEach(item => uploadOneFile(item))
  }

  const validateForm = () => {
    const errors = []
    if (files.length === 0) errors.push('先选个文件吧')
    if (!form.title.trim()) errors.push('给资料起个名字吧')
    if (!form.category) errors.push('选一下分类哦')
    if (form.category === 'package') {
      if (files.length > 0 && !files.every(f => f.file.name.toLowerCase().endsWith('.zip'))) {
        errors.push('「课程资源包」仅支持 ZIP 格式')
      }
    }
    for (const f of files) {
      if (f.file.size > MAX_SIZE) {
        errors.push(`文件「${f.file.name}」超过 200MB 限制`)
      }
    }
    return errors
  }

  const resetAll = () => {
    setFiles([])
    setForm(initialForm)
    setUploadResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const submitAll = async () => {
    setUploadResult(null)
    try {
      await Promise.all(files.map(fileItem => {
        const formData = buildCreateFormData(fileItem)
        return form.category === 'package'
          ? api.createZipPackage(formData)
          : api.createMaterial(formData)
      }))
      setShowThanksModal(true)
      resetAll()
    } catch (err) {
      setUploadResult({ success: false, error: err.message || '提交失败，请重试' })
    }
  }

  const handleSubmit = async () => {
    const errors = validateForm()
    if (errors.length > 0) {
      setUploadResult({ success: false, error: errors.join('，') })
      return
    }
    if (isUploading) {
      setShowIncompleteModal(true)
      return
    }
    if (!allDone) {
      setShowIncompleteModal(true)
      return
    }
    await submitAll()
  }

  const doUpload = async (skipDuplicate = true) => {
    setShowDuplicateModal(false)
    setShowIncompleteModal(false)
    setUploadResult(null)
    const toUpload = files.filter(f => f.status !== 'done' && f.status !== 'uploading')
    if (toUpload.length === 0) return
    await Promise.all(toUpload.map(f => uploadOneFile(f, skipDuplicate)))
  }

  /* ----------------- UI ----------------- */
  const renderFileRow = (fileObj) => {
    const isZip = fileObj.file.name.toLowerCase().endsWith('.zip')
    const Icon = isZip ? Package : FileText
    return (
      <div
        key={fileObj.id}
        className="flex items-center justify-between bg-[--color-cream-50] border border-[--color-line] rounded-2xl px-4 py-2.5 gap-3"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${
            isZip ? 'bg-[--color-honey-100] text-[--color-honey-700]' : 'bg-[--color-camphor-50] text-[--color-camphor-700]'
          }`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] text-[--color-ink-900] truncate font-medium">{fileObj.file.name}</p>
            <p className="text-[11.5px] text-[--color-ink-500]">
              {formatSize(fileObj.file.size)}{isZip ? ' · 课程资源包' : ''}
            </p>
            {fileObj.status !== 'pending' && (
              <div className="mt-1.5">
                {fileObj.status === 'uploading' && (
                  <>
                    <div className="h-1.5 w-full bg-[--color-cream-200] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[--color-honey-400] to-[--color-kapok-400] rounded-full transition-all"
                        style={{ width: `${fileObj.progress}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-[--color-camphor-600] mt-0.5">
                      {fileObj.speed ? `${fileObj.speed} · ` : ''}{fileObj.progress}%
                    </p>
                  </>
                )}
                {fileObj.status === 'done' && (
                  <p className="text-[11px] text-[--color-camphor-600] flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> 已上传到临时空间
                  </p>
                )}
                {fileObj.status === 'error' && (
                  <p className="text-[11px] text-[--color-berry-600] flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {fileObj.error}
                  </p>
                )}
                {fileObj.status === 'duplicate' && (
                  <p className="text-[11px] text-[--color-honey-600] flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> 检测到重复，等待确认
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
        <button
          onClick={() => removeFile(fileObj.id)}
          className="grid place-items-center w-8 h-8 rounded-full text-[--color-ink-400] hover:text-[--color-kapok-500] hover:bg-[--color-kapok-50] transition-colors shrink-0"
          aria-label="移除"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  const duplicateModal = showDuplicateModal && (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 backdrop-blur-sm animate-fade-up p-4">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-[var(--shadow-lg)] border border-[--color-line]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 rounded-2xl bg-[--color-honey-100] grid place-items-center">
            <AlertTriangle className="w-5 h-5 text-[--color-honey-600]" />
          </div>
          <div>
            <h3 className="text-[15.5px] font-bold text-[--color-ink-900]">这个文件好像传过了</h3>
            <p className="text-[12px] text-[--color-ink-500]">检测到同名文件，要不要确认一下？</p>
          </div>
        </div>
        <p className="text-[13.5px] text-[--color-ink-700] mb-5 bg-[--color-cream-50] border border-[--color-line] rounded-2xl px-4 py-3 break-all">
          {duplicateInfo?.filename}
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setShowDuplicateModal(false)}
            className="h-10 px-4 rounded-full bg-white border border-[--color-line] text-[13px] font-medium text-[--color-ink-700] hover:bg-[--color-cream-100]"
          >
            我再想想
          </button>
          <button
            onClick={() => doUpload(true)}
            className="h-10 px-5 rounded-full bg-[--color-camphor-500] hover:bg-[--color-camphor-600] text-white text-[13px] font-semibold shadow-[0_8px_18px_-8px_rgba(45,106,79,0.5)]"
          >
            还是传上去
          </button>
        </div>
      </div>
    </div>
  )

  const incompleteModal = showIncompleteModal && (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 backdrop-blur-sm animate-fade-up p-4">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-[var(--shadow-lg)] border border-[--color-line]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 rounded-2xl bg-[--color-honey-100] grid place-items-center">
            <AlertTriangle className="w-5 h-5 text-[--color-honey-600]" />
          </div>
          <div>
            <h3 className="text-[15.5px] font-bold text-[--color-ink-900]">文件还没准备好</h3>
            <p className="text-[12px] text-[--color-ink-500]">等文件全部上传到临时空间后，再点击正式上传哦</p>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            onClick={() => setShowIncompleteModal(false)}
            className="h-10 px-5 rounded-full bg-[--color-camphor-500] hover:bg-[--color-camphor-600] text-white text-[13px] font-semibold shadow-[0_8px_18px_-8px_rgba(45,106,79,0.5)]"
          >
            我知道了
          </button>
        </div>
      </div>
    </div>
  )

  const thanksModal = showThanksModal && (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 backdrop-blur-sm animate-fade-up p-4">
      <div className="bg-white rounded-3xl p-7 max-w-md w-full shadow-[var(--shadow-lg)] border border-[--color-line] text-center">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[--color-honey-200] to-[--color-kapok-200] grid place-items-center mx-auto mb-4">
          <Sparkles className="w-7 h-7 text-[--color-kapok-600]" />
        </div>
        <h3 className="text-[20px] font-bold text-[--color-ink-900] mb-2" style={{ fontFamily: 'var(--font-display)' }}>
          这份心意已经接住了 🎉
        </h3>
        <p className="text-[14px] text-[--color-ink-600] leading-relaxed mb-6">
          谢谢你愿意把资料分享出来。<br />
          每一份笔记、每一张试卷，都会让学弟学妹少熬一夜。<br />
          你已经帮到了很多人。
        </p>
        <button
          onClick={() => setShowThanksModal(false)}
          className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-gradient-to-r from-[--color-honey-400] to-[--color-kapok-400] text-white text-[14px] font-bold shadow-[0_14px_28px_-12px_rgba(244,125,44,0.55)] hover:scale-[1.03] active:scale-[0.97] transition-all"
        >
          <Sparkles className="w-4 h-4" /> 再传一份
        </button>
      </div>
    </div>
  )

  const singleFileModal = showSingleFileModal && (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 backdrop-blur-sm animate-fade-up p-4">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-[var(--shadow-lg)] border border-[--color-line]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 rounded-2xl bg-[--color-honey-100] grid place-items-center">
            <AlertTriangle className="w-5 h-5 text-[--color-honey-600]" />
          </div>
          <div>
            <h3 className="text-[15.5px] font-bold text-[--color-ink-900]">一次只能上传一个文件</h3>
            <p className="text-[12px] text-[--color-ink-500]">目前每次仅支持上传一份文件，请先移除当前文件后再试。</p>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            onClick={() => setShowSingleFileModal(false)}
            className="h-10 px-5 rounded-full bg-[--color-camphor-500] hover:bg-[--color-camphor-600] text-white text-[13px] font-semibold shadow-[0_8px_18px_-8px_rgba(45,106,79,0.5)]"
          >
            我知道了
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col gap-7 max-w-[860px] mx-auto">
      {/* ============== Hero ============== */}
      <section className="relative overflow-hidden rounded-[28px] border border-[--color-line] bg-gradient-to-br from-[#FFF6EC] via-white to-[#FFEFE9] px-6 md:px-9 py-7 md:py-8">
        <div className="absolute -top-6 -right-6 text-[140px] opacity-15 select-none pointer-events-none animate-float">🤝</div>
        <div className="relative">
          <div className="mb-2">
            <span className="text-[11.5px] uppercase tracking-[0.22em] font-semibold text-[--color-kapok-500]">
              传一份心意
            </span>
          </div>
          <h1 className="text-[26px] md:text-[34px] font-bold tracking-tight text-[--color-ink-900] leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
            分享一份资料 <span className="text-[--color-kapok-400]">✨</span>
          </h1>
          <p className="text-[14px] md:text-[14.5px] text-[--color-ink-700] mt-2 leading-relaxed max-w-2xl">
            一份小笔记，可能就让一位学弟学妹少熬一夜。
            <br className="hidden md:block" />
            <span className="text-[--color-ink-500]">拆掉一堵墙，靠的就是大家这点善意。</span>
          </p>
          <p className="text-[12.5px] text-[--color-ink-500] mt-3 leading-relaxed max-w-2xl inline-flex items-center gap-1.5 flex-wrap">
            <Mail className="w-3.5 h-3.5" />
            如需大批量上传，可联系 Jaison：
            <a
              href="mailto:zhengzsh5@mail2.sysu.edu.cn"
              className="text-[--color-camphor-700] font-medium hover:underline"
            >
              zhengzsh5@mail2.sysu.edu.cn
            </a>
          </p>
        </div>
      </section>

      {/* ============== 上传卡 ============== */}
      <section className="bg-white border border-[--color-line] rounded-3xl p-5 md:p-7 shadow-[var(--shadow-xs)]">
        {/* Drop zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative w-full rounded-[24px] border-2 border-dashed transition-all cursor-pointer p-8 md:p-10 flex flex-col items-center justify-center text-center ${
            dragOver
              ? 'border-[--color-camphor-400] bg-[--color-camphor-50]'
              : 'border-[--color-cream-300] bg-[--color-cream-50] hover:border-[--color-camphor-300] hover:bg-[--color-camphor-50]'
          }`}
        >
          <div className="absolute inset-0 -z-10 rounded-[24px] opacity-30 glow-warm" />
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[--color-honey-200] to-[--color-honey-300] grid place-items-center mb-4 animate-float">
            <UploadCloud className="w-7 h-7 text-[--color-honey-700]" />
          </div>
          <p className="text-[15.5px] font-bold text-[--color-ink-900] mb-1.5" style={{ fontFamily: 'var(--font-display)' }}>
            把文件拖进来 ——  或者点这里挑一份
          </p>
          <p className="text-[12.5px] text-[--color-ink-500]">
            支持 PDF / DOC / PPT / XLS / TXT / MD / 图片 / ZIP，最大 200MB
          </p>
          <p className="text-[11.5px] text-[--color-ink-400] mt-2">
            文件添加后会自动上传到临时空间，填写完资料信息后点击正式上传按钮提交 🎁
          </p>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.jpg,.jpeg,.png,.zip,.rar,.7z" />
        </div>

        {/* 已选文件列表 */}
        {files.length > 0 && (
          <div className="mt-5 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-[12.5px] text-[--color-ink-500]">
                已选 <span className="text-[--color-ink-900] font-semibold">{files.length}</span> 个文件 · 共 {formatSize(totalSize)}
              </p>
              <button
                onClick={() => setFiles([])}
                className="text-[12px] text-[--color-ink-400] hover:text-[--color-kapok-500] underline-offset-4 hover:underline"
              >
                清空
              </button>
            </div>
            {files.map(renderFileRow)}
          </div>
        )}

        {/* 分类大卡 */}
        <div className="mt-7">
          <Label required>给它选个家</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-2">
            {categories.map((c) => {
              const active = form.category === c.value
              const tone = c.tone || 'camphor'
              const styles = {
                kapok: {
                  border: 'border-[--color-kapok-500]',
                  bg: 'bg-gradient-to-br from-[#FFEFE9] to-[#FFD5C7]',
                  shadow: 'shadow-[0_12px_32px_-12px_rgba(200,65,43,0.55)]',
                  ring: 'ring-[3px] ring-[#FFD5C7] ring-offset-2',
                  check: 'bg-[--color-kapok-500] shadow-[0_4px_10px_-4px_rgba(200,65,43,0.6)]',
                  label: 'text-[--color-kapok-700]',
                  hoverBorder: 'hover:border-[--color-kapok-300]',
                },
                camphor: {
                  border: 'border-[--color-camphor-600]',
                  bg: 'bg-gradient-to-br from-[#E8F5EC] to-[#CFEAD7]',
                  shadow: 'shadow-[0_12px_32px_-12px_rgba(45,106,79,0.55)]',
                  ring: 'ring-[3px] ring-[#CFEAD7] ring-offset-2',
                  check: 'bg-[--color-camphor-600] shadow-[0_4px_10px_-4px_rgba(45,106,79,0.6)]',
                  label: 'text-[--color-camphor-700]',
                  hoverBorder: 'hover:border-[--color-camphor-300]',
                },
                honey: {
                  border: 'border-[--color-honey-500]',
                  bg: 'bg-gradient-to-br from-[#FFF4E6] to-[#FFE4C2]',
                  shadow: 'shadow-[0_12px_32px_-12px_rgba(244,125,44,0.55)]',
                  ring: 'ring-[3px] ring-[#FFE4C2] ring-offset-2',
                  check: 'bg-[--color-honey-500] shadow-[0_4px_10px_-4px_rgba(244,125,44,0.6)]',
                  label: 'text-[--color-honey-700]',
                  hoverBorder: 'hover:border-[--color-honey-300]',
                },
                mist: {
                  border: 'border-[--color-mist-500]',
                  bg: 'bg-gradient-to-br from-[#F0F4F8] to-[#DDE7F0]',
                  shadow: 'shadow-[0_12px_32px_-12px_rgba(61,104,144,0.55)]',
                  ring: 'ring-[3px] ring-[#DDE7F0] ring-offset-2',
                  check: 'bg-[--color-mist-500] shadow-[0_4px_10px_-4px_rgba(61,104,144,0.6)]',
                  label: 'text-[--color-mist-700]',
                  hoverBorder: 'hover:border-[--color-mist-300]',
                },
              }[tone]

              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => handleChange({ target: { name: 'category', value: c.value } })}
                  className={`relative text-left rounded-2xl border p-4 transition-all ${
                    active
                      ? `${styles.bg} ${styles.border} ${styles.shadow} ${styles.ring}`
                      : `bg-white border-[--color-line] hover:border-[--color-camphor-300] hover:bg-[--color-cream-50]`
                  }`}
                >
                  {active && (
                    <div className={`absolute top-3 right-3 w-5 h-5 rounded-full grid place-items-center ${styles.check}`}>
                      <CheckCircle className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <div className="text-[26px] mb-1">{c.emoji}</div>
                  <div className={`text-[14.5px] font-bold ${active ? styles.label : 'text-[--color-ink-900]'}`}>{c.label}</div>
                  <div className="text-[11.5px] text-[--color-ink-500] mt-0.5 leading-snug">{c.desc}</div>
                </button>
              )
            })}
          </div>
        </div>

        {/* 子分类（非经验攻略） */}
        {form.category && form.category !== 'experience' && (
          <div className="mt-5">
            <Label>子分类</Label>
            <Select name="sub_category" value={form.sub_category} onChange={handleChange}>
              {subCategories.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </Select>
          </div>
        )}

        {/* 表单字段 */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label required>资料名称</Label>
            <Input name="title" value={form.title} onChange={handleChange} placeholder="比如：线性代数 2024 期末试卷" />
          </div>
          <div className="md:col-span-2">
            <Label>一句话描述</Label>
            <Input name="description" value={form.description} onChange={handleChange} placeholder="optional：讲讲这份资料的内容或来源" />
          </div>
          <div>
            <Label>学院 / 院系</Label>
            <Input name="department" value={form.department} onChange={handleChange} placeholder="如：数学学院" />
          </div>
          <div>
            <Label>专业</Label>
            <Input name="major" value={form.major} onChange={handleChange} placeholder="如：数学与应用数学" />
          </div>
          <div>
            <Label>课程名称</Label>
            <Input name="course_name" value={form.course_name} onChange={handleChange} placeholder="如：线性代数" />
          </div>
          <div>
            <Label>授课老师</Label>
            <Input name="instructor" value={form.instructor} onChange={handleChange} placeholder="如：张老师" />
          </div>
          <div>
            <Label>学年</Label>
            <Input name="year" value={form.year} onChange={handleChange} placeholder="如：2024" />
          </div>
          <div>
            <Label>贡献者昵称</Label>
            <Input name="uploader_name" value={form.uploader_name} onChange={handleChange} placeholder="默认匿名同学" />
          </div>
        </div>

        {/* 提交 */}
        <div className="mt-7 pt-5 border-t border-dashed border-[--color-line] flex items-center justify-end gap-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-white border border-[--color-line] text-[--color-ink-700] text-[13.5px] font-medium hover:bg-[--color-cream-100] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> 先不传了
          </button>
          <button
            onClick={handleSubmit}
            disabled={files.length === 0}
            className={`inline-flex items-center gap-2 h-11 px-6 rounded-full bg-gradient-to-r from-[--color-honey-400] to-[--color-kapok-400] text-white text-[14px] font-bold shadow-[0_14px_28px_-12px_rgba(244,125,44,0.55)] hover:scale-[1.03] active:scale-[0.97] transition-all ${
              files.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isUploading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                正在上传…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                把这份心意传上去
              </>
            )}
          </button>
        </div>
      </section>

      {/* 结果 */}
      {uploadResult && (
        <div className={`rounded-3xl p-5 border ${
          uploadResult.success
            ? 'bg-[--color-camphor-50] border-[--color-camphor-200]'
            : 'bg-[--color-berry-50] border-[--color-berry-100]'
        }`}>
          <div className="flex items-center gap-2.5 mb-2">
            {uploadResult.success ? (
              <CheckCircle className="w-5 h-5 text-[--color-camphor-600]" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-[--color-berry-500]" />
            )}
            <span className={`font-bold ${uploadResult.success ? 'text-[--color-camphor-700]' : 'text-[--color-berry-600]'}`}>
              {uploadResult.success ? cheer('thanks') : '上传遇到了点小问题'}
            </span>
          </div>
          {!uploadResult.success && (
            <p className="text-[13px] text-[--color-berry-600]">{uploadResult.error}</p>
          )}
        </div>
      )}

      {createPortal(duplicateModal, document.body)}
      {createPortal(incompleteModal, document.body)}
      {createPortal(thanksModal, document.body)}
      {createPortal(singleFileModal, document.body)}
    </div>
  )
}

/* ==========================================================
 * 表单原子组件
 * ========================================================== */
function Label({ children, required }) {
  return (
    <label className="block text-[12.5px] font-semibold text-[--color-ink-700] mb-1.5">
      {children}
      {required && <span className="text-[--color-kapok-400] ml-1">*</span>}
    </label>
  )
}

function Input(props) {
  return (
    <input
      {...props}
      className="w-full h-10 px-4 bg-[--color-cream-50] border border-[--color-line] rounded-full text-[13.5px] placeholder-[--color-ink-400] focus:bg-white focus:border-[--color-camphor-300] focus:ring-4 focus:ring-[--color-camphor-100] transition"
    />
  )
}

function Select({ children, ...props }) {
  return (
    <select
      {...props}
      className="w-full h-10 pl-4 pr-9 bg-[--color-cream-50] border border-[--color-line] rounded-full text-[13.5px] text-[--color-ink-900] focus:bg-white focus:border-[--color-camphor-300] focus:ring-4 focus:ring-[--color-camphor-100] transition appearance-none bg-no-repeat bg-[right_14px_center]"
      style={{ backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 viewBox=%270 0 12 12%27><path fill=%27none%27 stroke=%27%236E665B%27 stroke-width=%271.5%27 d=%27M3 4.5l3 3 3-3%27/></svg>")' }}
    >
      {children}
    </select>
  )
}
