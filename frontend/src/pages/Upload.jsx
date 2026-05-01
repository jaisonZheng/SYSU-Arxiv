import { useState, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  UploadCloud, File as FileIcon, X, AlertTriangle, CheckCircle, Sparkles,
  ArrowLeft, Heart, FileText, Package,
} from 'lucide-react'
import { api } from '../api/client'
import { formatSize, cheer } from '../lib/format'

const categories = [
  { value: 'past_exam',      label: '历年真题',   emoji: '📝', desc: '期末/期中卷子、模拟题' },
  { value: 'study_material', label: '学习资料',   emoji: '📓', desc: '笔记、课件、总结、答案' },
  { value: 'package',        label: '课程资源包', emoji: '🎁', desc: '整门课打包，ZIP 格式最佳' },
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

export default function UploadPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [files, setFiles] = useState([])
  const [form, setForm] = useState({
    title: '', description: '',
    category: '', sub_category: '',
    department: '', major: '',
    course_name: '', instructor: '',
    year: '', file_type: '', uploader_name: '',
  })
  const [uploading, setUploading] = useState(false)
  const [duplicateInfo, setDuplicateInfo] = useState(null)
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const [dragOver, setDragOver] = useState(false)

  const totalSize = useMemo(() => files.reduce((s, f) => s + (f.size || 0), 0), [files])

  /* ----------------- 文件操作 ----------------- */
  const handleDragOver = useCallback((e) => { e.preventDefault(); setDragOver(true) }, [])
  const handleDragLeave = useCallback((e) => { e.preventDefault(); setDragOver(false) }, [])
  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false)
    addFiles(Array.from(e.dataTransfer.files))
  }, [])

  const addFiles = (newFiles) => {
    const valid = newFiles.filter((f) => {
      const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase()
      return allowedExt.includes(ext)
    })
    setFiles((prev) => [...prev, ...valid])
    if (valid.length > 0 && !form.title) {
      const first = valid[0]
      const base = first.name.replace(/\.[^.]+$/, '')
      setForm((prev) => ({ ...prev, title: base }))
    }
  }

  const handleFileSelect = (e) => addFiles(Array.from(e.target.files || []))
  const removeFile = (index) => setFiles((prev) => prev.filter((_, i) => i !== index))

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  /* ----------------- 上传 ----------------- */
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

  const validateForm = () => {
    const errors = []
    if (files.length === 0) errors.push('先选个文件吧')
    if (!form.title.trim()) errors.push('给资料起个名字吧')
    if (!form.category) errors.push('选一下分类哦')
    if (form.category === 'package' && files.length > 0 && !files.some(f => f.name.toLowerCase().endsWith('.zip'))) {
      errors.push('「课程资源包」需要上传 ZIP 格式的压缩包')
    }
    return errors
  }

  const handleSubmit = async () => {
    const errors = validateForm()
    if (errors.length > 0) {
      setUploadResult({ success: false, error: errors.join('，') })
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
        if (form.sub_category)  formData.append('sub_category', form.sub_category)
        if (form.department)    formData.append('department', form.department)
        if (form.major)         formData.append('major', form.major)
        if (form.course_name)   formData.append('course_name', form.course_name)
        if (form.instructor)    formData.append('instructor', form.instructor)
        if (form.year)          formData.append('year', form.year)
        if (form.file_type)     formData.append('file_type', form.file_type)
        if (form.uploader_name) formData.append('uploader_name', form.uploader_name)

        const isZip = file.name.toLowerCase().endsWith('.zip')
        const endpoint = isZip ? api.createZipPackage : api.createMaterial
        const res = await endpoint(formData)
        results.push({ filename: file.name, success: true, id: res.id })
      }
      setUploadResult({ success: true, results })
      setFiles([])
      setForm({
        title: '', description: '',
        category: '', sub_category: '',
        department: '', major: '',
        course_name: '', instructor: '',
        year: '', file_type: '', uploader_name: '',
      })
    } catch (e) {
      setUploadResult({ success: false, error: e.message || '不太顺利，等一下再试试？' })
    } finally {
      setUploading(false)
      setShowDuplicateModal(false)
    }
  }

  return (
    <div className="flex flex-col gap-7 max-w-[860px] mx-auto animate-fade-up">
      {/* ============== Hero ============== */}
      <section className="relative overflow-hidden rounded-[28px] border border-[--color-line] bg-gradient-to-br from-[#FFF6EC] via-white to-[#FFEFE9] px-6 md:px-9 py-7 md:py-8">
        <div className="absolute -top-6 -right-6 text-[140px] opacity-15 select-none pointer-events-none animate-float">🤝</div>
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-block w-6 h-px bg-[--color-kapok-400]" />
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
            <span className="text-[--color-ink-500]">不收一分钱，靠的就是大家这点善意。</span>
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
            支持 PDF / DOC / PPT / XLS / TXT / MD / 图片 / ZIP，最大 100MB
          </p>
          <p className="text-[11.5px] text-[--color-ink-400] mt-2">
            ZIP 上传会被自动识别为「课程资源包」 🎁
          </p>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
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
            {files.map((file, i) => {
              const isZip = file.name.toLowerCase().endsWith('.zip')
              const Icon = isZip ? Package : FileText
              return (
                <div key={i} className="flex items-center justify-between bg-[--color-cream-50] border border-[--color-line] rounded-2xl px-4 py-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${
                      isZip ? 'bg-[--color-honey-100] text-[--color-honey-700]' : 'bg-[--color-camphor-50] text-[--color-camphor-700]'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13.5px] text-[--color-ink-900] truncate font-medium">{file.name}</p>
                      <p className="text-[11.5px] text-[--color-ink-500]">{formatSize(file.size)}{isZip ? ' · 会被打包成课程包 🎁' : ''}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(i)}
                    className="grid place-items-center w-8 h-8 rounded-full text-[--color-ink-400] hover:text-[--color-kapok-500] hover:bg-[--color-kapok-50] transition-colors shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* 分类大卡 */}
        <div className="mt-7">
          <Label required>给它选个家</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
            {categories.map((c) => {
              const active = form.category === c.value
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, category: c.value }))}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-left border-2 transition-all ${
                    active
                      ? 'border-[--color-camphor-400] bg-[--color-camphor-50] shadow-[0_8px_22px_-12px_rgba(45,106,79,0.45)]'
                      : 'border-[--color-line] bg-white hover:border-[--color-camphor-200] hover:bg-[--color-cream-50]'
                  }`}
                >
                  <span className="text-2xl">{c.emoji}</span>
                  <span>
                    <span className="block text-[14px] font-semibold text-[--color-ink-900]">{c.label}</span>
                    <span className="block text-[11.5px] text-[--color-ink-500]">{c.desc}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* 表单 */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
          <div className="md:col-span-2">
            <Label required>资料标题</Label>
            <Input name="title" value={form.title} onChange={handleChange}
              placeholder="例如：数据结构 2023 年期末真题（含答案）"
            />
          </div>

          <div>
            <Label>资料类型</Label>
            <Select name="sub_category" value={form.sub_category} onChange={handleChange}>
              {subCategories.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </Select>
          </div>

          <div>
            <Label>所属年份</Label>
            <Input type="number" name="year" value={form.year} onChange={handleChange}
              placeholder="例如：2023" min="1990" max="2099"
            />
          </div>

          <div>
            <Label>院系</Label>
            <Input name="department" value={form.department} onChange={handleChange}
              placeholder="例如：计算机学院"
            />
          </div>

          <div>
            <Label>专业</Label>
            <Input name="major" value={form.major} onChange={handleChange}
              placeholder="例如：软件工程"
            />
          </div>

          <div>
            <Label>课程名称</Label>
            <Input name="course_name" value={form.course_name} onChange={handleChange}
              placeholder="例如：数据结构"
            />
          </div>

          <div>
            <Label>授课老师</Label>
            <Input name="instructor" value={form.instructor} onChange={handleChange}
              placeholder="例如：张老师"
            />
          </div>

          <div className="md:col-span-2">
            <Label>说几句简介（可选）</Label>
            <textarea
              name="description" value={form.description} onChange={handleChange}
              placeholder="比如「这份是带答案版」「整理得比较细的笔记」之类，让别人更快判断要不要收下"
              rows={3}
              className="w-full px-4 py-2.5 bg-[--color-cream-50] border border-[--color-line] rounded-2xl text-[13.5px] focus:bg-white focus:border-[--color-camphor-300] focus:ring-4 focus:ring-[--color-camphor-100] transition resize-none"
            />
          </div>

          <div className="md:col-span-2">
            <Label>署名（可选）</Label>
            <Input name="uploader_name" value={form.uploader_name} onChange={handleChange}
              placeholder="留个名字会更亲切（不留也没事，会显示「匿名同学」）"
            />
            <p className="text-[11.5px] text-[--color-ink-400] mt-1.5 flex items-center gap-1">
              <Heart className="w-3 h-3 text-[--color-kapok-400]" /> 你的名字会出现在主页的「致谢」里
            </p>
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
            disabled={uploading || files.length === 0}
            className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-gradient-to-r from-[--color-honey-400] to-[--color-kapok-400] text-white text-[14px] font-bold shadow-[0_14px_28px_-12px_rgba(244,125,44,0.55)] hover:scale-[1.03] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all"
          >
            {uploading ? (
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

      {/* 重复弹窗 */}
      {showDuplicateModal && (
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
                onClick={doUpload}
                className="h-10 px-5 rounded-full bg-[--color-camphor-500] hover:bg-[--color-camphor-600] text-white text-[13px] font-semibold shadow-[0_8px_18px_-8px_rgba(45,106,79,0.5)]"
              >
                还是传上去
              </button>
            </div>
          </div>
        </div>
      )}

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
          {uploadResult.success ? (
            <ul className="text-[13px] text-[--color-camphor-700] space-y-1">
              {uploadResult.results.map((r, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[--color-camphor-400]" />
                  <span>{r.filename}</span>
                </li>
              ))}
              <li className="text-[12px] text-[--color-camphor-600] mt-2">
                可以在首页看到刚刚上传的资料 ——
                <button onClick={() => navigate('/')} className="ml-1 underline-offset-4 underline hover:text-[--color-camphor-900]">回首页瞧瞧</button>
              </li>
            </ul>
          ) : (
            <p className="text-[13px] text-[--color-berry-600]">{uploadResult.error}</p>
          )}
        </div>
      )}
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
