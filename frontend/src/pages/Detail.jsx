import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Download, FileText, ArrowLeft, Package, FileIcon, Image as ImageIcon, FileCode,
  ChevronRight as Chevron, ChevronDown, Heart, Sparkles, Calendar, Building2, BookOpen, User,
  ExternalLink,
} from 'lucide-react'
import { api } from '../api/client'
import ResourceCard from '../components/ResourceCard'
import SectionHeading from '../components/SectionHeading'
import {
  timeAgo, formatDate, formatSize, avatarLetter, avatarColor,
  categoryMeta, subCategoryMeta,
} from '../lib/format'

/* ==========================================================
 * 文件预览
 * ========================================================== */
function FilePreview({ url, fileName, fileType }) {
  const ext = (fileType || fileName || '').toLowerCase()

  if (ext.includes('pdf') || ext.endsWith('.pdf')) {
    return (
      <div className="w-full aspect-[4/3] bg-[--color-cream-100]">
        <iframe src={url} className="w-full h-full border-0" title={fileName} />
      </div>
    )
  }
  if (/\.(png|jpe?g|gif|webp)$/i.test(ext) || ext.includes('image')) {
    return (
      <div className="w-full bg-[--color-cream-100] flex items-center justify-center p-6">
        <img src={url} alt={fileName} className="max-w-full max-h-[600px] object-contain rounded-2xl shadow-[var(--shadow-sm)]" />
      </div>
    )
  }
  if (/\.(txt|md|c|cpp|h|py|js|html)$/i.test(ext) || ext.includes('text')) {
    return (
      <div className="w-full bg-[--color-cream-50] p-2">
        <iframe src={url} className="w-full h-[560px] border-0 rounded-2xl bg-white" title={fileName} />
      </div>
    )
  }
  if (/\.(docx?|pptx?|xlsx?)$/i.test(ext)) {
    const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`
    const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fullUrl)}`
    return (
      <div className="w-full aspect-[4/3] bg-[--color-cream-100]">
        <iframe src={viewerUrl} className="w-full h-full border-0" title={fileName} />
      </div>
    )
  }

  return (
    <div className="w-full aspect-[4/3] bg-gradient-to-br from-[--color-cream-100] to-[--color-cream-200] flex items-center justify-center">
      <div className="text-center p-8">
        <div className="text-[64px] mb-3 animate-float">📦</div>
        <p className="text-[14px] text-[--color-ink-700] font-medium">这个格式还没法在线看</p>
        <p className="text-[12.5px] text-[--color-ink-500] mt-1">点旁边的「下载」收下吧</p>
      </div>
    </div>
  )
}

/* ==========================================================
 * 资源包文件树
 * ========================================================== */
function PackageFileTree({ items, onPreview, activePath }) {
  const [expanded, setExpanded] = useState({})

  const tree = useMemo(() => {
    const root = {}
    items.forEach((item) => {
      const parts = item.path.split('/')
      let current = root
      parts.forEach((part, idx) => {
        if (!current[part]) {
          current[part] = { _isFile: idx === parts.length - 1, _item: item, _children: {} }
        }
        current = current[part]._children
      })
    })
    return root
  }, [items])

  const toggle = (path) => setExpanded((p) => ({ ...p, [path]: !p[path] }))

  const renderTree = (node, path = '', depth = 0) => {
    return Object.entries(node).map(([name, data]) => {
      const fullPath = path ? `${path}/${name}` : name
      if (data._isFile) {
        const item = data._item
        const isImage = item.mime_type?.includes('image') || /\.(png|jpe?g|gif|webp)$/i.test(item.file_type || '')
        const isPdf = item.mime_type?.includes('pdf') || /\.pdf$/i.test(item.file_type || '')
        const isText = item.mime_type?.includes('text') || /\.(txt|md|c|cpp|h|py|js|html)$/i.test(item.file_type || '')
        const isOffice = /\.(docx?|pptx?|xlsx?)$/i.test(item.file_type || '')
        const canPreview = isImage || isPdf || isText || isOffice
        const isActive = activePath === item.path

        let icon = <FileIcon className="w-3.5 h-3.5 text-[--color-ink-400] shrink-0" />
        if (isImage) icon = <ImageIcon className="w-3.5 h-3.5 text-[--color-honey-500] shrink-0" />
        if (isPdf)   icon = <FileText  className="w-3.5 h-3.5 text-[--color-kapok-500] shrink-0" />
        if (isText)  icon = <FileCode  className="w-3.5 h-3.5 text-[--color-mist-500] shrink-0" />
        if (isOffice) icon = <FileText className="w-3.5 h-3.5 text-[--color-camphor-500] shrink-0" />

        return (
          <button
            key={fullPath}
            onClick={() => canPreview && onPreview(item)}
            disabled={!canPreview}
            className={`w-full flex items-center gap-2 py-1.5 px-2.5 rounded-xl text-[13px] transition-colors text-left ${
              isActive
                ? 'bg-[--color-camphor-50] text-[--color-camphor-700]'
                : canPreview
                  ? 'hover:bg-[--color-cream-100] text-[--color-ink-700]'
                  : 'text-[--color-ink-400] cursor-default'
            }`}
            style={{ paddingLeft: `${depth * 14 + 10}px` }}
          >
            {icon}
            <span className="truncate flex-1">{name}</span>
            <span className="text-[11px] text-[--color-ink-400] shrink-0 tabular-nums">{formatSize(item.file_size)}</span>
            {canPreview && (
              <span className={`text-[11px] shrink-0 ${isActive ? 'text-[--color-camphor-700] font-semibold' : 'text-[--color-camphor-500]'}`}>
                看看
              </span>
            )}
          </button>
        )
      }

      const isOpen = expanded[fullPath] !== false
      return (
        <div key={fullPath}>
          <button
            onClick={() => toggle(fullPath)}
            className="w-full flex items-center gap-1.5 py-1.5 px-2.5 rounded-xl text-[13px] font-semibold text-[--color-ink-700] hover:bg-[--color-cream-100] text-left transition-colors"
            style={{ paddingLeft: `${depth * 14 + 6}px` }}
          >
            {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-[--color-ink-400]" /> : <Chevron className="w-3.5 h-3.5 text-[--color-ink-400]" />}
            <span className="text-[14px]">📁</span>
            <span className="truncate">{name}</span>
          </button>
          {isOpen && <div>{renderTree(data._children, fullPath, depth + 1)}</div>}
        </div>
      )
    })
  }

  return (
    <div className="bg-white border border-[--color-line] rounded-3xl overflow-hidden shadow-[var(--shadow-xs)]">
      <div className="bg-gradient-to-r from-[--color-cream-100] to-[--color-cream-50] border-b border-[--color-line] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[13.5px] font-semibold text-[--color-ink-900]">
          <Package className="w-4 h-4 text-[--color-honey-500]" />
          <span>资源包内容</span>
        </div>
        <span className="text-[11.5px] text-[--color-ink-500]">共 {items.length} 个文件 · 点开就能看</span>
      </div>
      <div className="p-2 max-h-[560px] overflow-y-auto">
        {renderTree(tree)}
      </div>
    </div>
  )
}

/* ==========================================================
 * 主页面
 * ========================================================== */
export default function Detail({ isPackage }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [related, setRelated] = useState([])
  const [packageItems, setPackageItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [previewItem, setPreviewItem] = useState(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)
        setPreviewItem(null)
        if (isPackage) {
          const res = await api.getPackage(id)
          setData(res.package)
          setPackageItems(res.items || [])
        } else {
          const res = await api.getMaterial(id)
          setData(res.material)
          setRelated(res.related || [])
        }
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [id, isPackage])

  const handleDownload = () => {
    if (!data) return
    const url = isPackage ? api.downloadPackage(data.id) : api.downloadMaterial(data.id)
    window.open(url, '_blank')
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-fade-up">
        <div className="h-[200px] rounded-3xl shimmer-bar opacity-70" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 h-[480px] rounded-3xl shimmer-bar opacity-70" />
          <div className="lg:col-span-4 space-y-4">
            <div className="h-[160px] rounded-3xl shimmer-bar opacity-70" />
            <div className="h-[260px] rounded-3xl shimmer-bar opacity-70" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="text-center py-20">
        <div className="text-[64px] mb-4 animate-float">🌫️</div>
        <p className="text-[--color-ink-900] font-semibold mb-1">这份资料找不到了</p>
        <p className="text-[13.5px] text-[--color-ink-500] mb-6">{error || '可能被移走了，或者地址不太对'}</p>
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-[--color-camphor-500] hover:bg-[--color-camphor-600] text-white text-[13.5px] font-semibold shadow-[0_8px_18px_-8px_rgba(45,106,79,0.5)] transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> 回到首页
        </button>
      </div>
    )
  }

  const m = data
  const cat = categoryMeta[m.category] || (isPackage ? categoryMeta.package : { label: '资料', emoji: '📚', tone: 'mist' })
  const sub = !isPackage && subCategoryMeta[m.sub_category]
  const ava = avatarColor(m.uploader_name || m.title || 'sysu')

  /* 顶部 hero 配色 */
  const heroPalette = isPackage
    ? { bg: 'from-[#FFF6EC] to-[#FFE6CB]', kicker: 'text-[--color-honey-700]', emoji: '🎁' }
    : m.category === 'past_exam'
      ? { bg: 'from-[#FFEFE9] to-[#FFD5C7]', kicker: 'text-[--color-kapok-500]', emoji: '📝' }
      : { bg: 'from-[#EEF6F0] to-[#D6E9DA]', kicker: 'text-[--color-camphor-700]', emoji: '✍️' }

  return (
    <div className="flex flex-col gap-6 md:gap-8 animate-fade-up">
      {/* ============== 面包屑 ============== */}
      <nav className="flex items-center gap-2 text-[12.5px] text-[--color-ink-500]">
        <button onClick={() => navigate('/')} className="hover:text-[--color-camphor-700] transition-colors">首页</button>
        <span>/</span>
        {isPackage ? (
          <button onClick={() => navigate('/course-packages')} className="hover:text-[--color-camphor-700] transition-colors">课程资源包</button>
        ) : (
          <button
            onClick={() => navigate(m.category === 'past_exam' ? '/past-exams' : '/study-materials')}
            className="hover:text-[--color-camphor-700] transition-colors"
          >
            {m.category === 'past_exam' ? '历年真题' : '学习资料'}
          </button>
        )}
        <span>/</span>
        <span className="text-[--color-ink-900] truncate max-w-[260px]">{m.title}</span>
      </nav>

      {/* ============== Hero ============== */}
      <section className={`relative overflow-hidden rounded-[28px] border border-[--color-line] bg-gradient-to-br ${heroPalette.bg} px-6 md:px-9 py-7 md:py-8`}>
        <div className="absolute -top-10 -right-8 text-[180px] opacity-15 select-none pointer-events-none rotate-[6deg]">{heroPalette.emoji}</div>
        <div className="relative">
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span className={`text-[11.5px] uppercase tracking-[0.22em] font-semibold ${heroPalette.kicker}`}>
              {cat.emoji} {cat.label}
            </span>
            {sub && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/70 text-[11.5px] font-semibold text-[--color-ink-700] backdrop-blur-sm">
                {sub.emoji} {sub.label}
              </span>
            )}
            {m.year && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/70 text-[11.5px] font-semibold text-[--color-ink-700] backdrop-blur-sm">
                <Calendar className="w-3 h-3" /> {m.year}
              </span>
            )}
          </div>
          <h1 className="text-[26px] md:text-[34px] font-bold tracking-tight text-[--color-ink-900] leading-[1.15] max-w-3xl break-words" style={{ fontFamily: 'var(--font-display)' }}>
            {m.title}
          </h1>
          {m.description && (
            <p className="text-[14.5px] text-[--color-ink-700] mt-3 max-w-2xl leading-relaxed">{m.description}</p>
          )}

          {/* 上传者 / 时间 */}
          <div className="mt-5 flex items-center gap-3 flex-wrap text-[12.5px] text-[--color-ink-500]">
            <span className="inline-flex items-center gap-2 bg-white/85 backdrop-blur-sm border border-[--color-line] rounded-full pl-1 pr-3 py-1">
              <span
                className="w-6 h-6 rounded-full grid place-items-center text-[11px] font-bold"
                style={{ background: ava.bg, color: ava.fg }}
              >
                {avatarLetter(m.uploader_name || (isPackage && m.source_type === 'github' ? 'GitHub' : '同'))}
              </span>
              <span className="text-[--color-ink-900] font-medium">
                {m.uploader_name || (isPackage && m.source_type === 'github' ? 'SYSU_Notebook' : '匿名同学')}
              </span>
            </span>
            <span>· {timeAgo(m.created_at)} 上传</span>
            <span>· 已被收下 {m.download_count || 0} 次</span>
            {isPackage && (
              <span>· 共 {m.total_files || packageItems.length} 个文件</span>
            )}
          </div>
        </div>
      </section>

      {/* ============== 主内容栅格 ============== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-6">
        {/* 左：预览 */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {isPackage ? (
            <>
              {previewItem ? (
                <div className="bg-white border border-[--color-line] rounded-3xl overflow-hidden shadow-[var(--shadow-xs)]">
                  <div className="bg-gradient-to-r from-[--color-cream-100] to-[--color-cream-50] border-b border-[--color-line] px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[13.5px] font-semibold text-[--color-ink-900] min-w-0">
                      <FileText className="w-4 h-4 text-[--color-camphor-500] shrink-0" />
                      <span className="truncate">{previewItem.file_name}</span>
                    </div>
                    <button
                      onClick={() => setPreviewItem(null)}
                      className="text-[12.5px] font-medium text-[--color-camphor-700] hover:text-[--color-camphor-900] inline-flex items-center gap-1 shrink-0"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> 回到列表
                    </button>
                  </div>
                  <FilePreview
                    url={api.previewPackageItem(m.id, previewItem.path)}
                    fileName={previewItem.file_name}
                    fileType={previewItem.file_type}
                  />
                </div>
              ) : (
                <PackageFileTree items={packageItems} onPreview={setPreviewItem} activePath={null} />
              )}
            </>
          ) : (
            <div className="bg-white border border-[--color-line] rounded-3xl overflow-hidden shadow-[var(--shadow-xs)]">
              <div className="bg-gradient-to-r from-[--color-cream-100] to-[--color-cream-50] border-b border-[--color-line] px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[13.5px] font-semibold text-[--color-ink-900]">
                  <FileText className="w-4 h-4 text-[--color-camphor-500]" />
                  <span>预览</span>
                </div>
                <span className="text-[11.5px] text-[--color-ink-500] truncate max-w-[200px]">{m.file_name}</span>
              </div>
              <FilePreview
                url={api.previewMaterial(m.id)}
                fileName={m.file_name}
                fileType={m.file_type}
              />
            </div>
          )}
        </div>

        {/* 右：操作 / 信息 */}
        <aside className="lg:col-span-4 flex flex-col gap-4">
          {/* 下载卡 */}
          <div className="bg-white border border-[--color-line] rounded-3xl p-5 shadow-[var(--shadow-xs)] sticky top-[80px]">
            <button
              onClick={handleDownload}
              className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-full bg-gradient-to-r from-[--color-honey-400] to-[--color-kapok-400] text-white text-[14px] font-bold shadow-[0_14px_28px_-12px_rgba(244,125,44,0.55)] hover:scale-[1.02] active:scale-[0.98] transition-transform"
            >
              <Download className="w-4 h-4" />
              收下{isPackage ? '整个资源包' : '这份资料'}
            </button>
            <p className="text-center text-[12px] text-[--color-ink-500] mt-3">
              {formatSize(m.file_size)} · 已被 {m.download_count || 0} 位同学收下
            </p>
            {isPackage && (
              <p className="text-center text-[11.5px] text-[--color-ink-400] mt-1">
                打包后的 ZIP，里面有 {m.total_files || packageItems.length} 个文件
              </p>
            )}

            <div className="mt-4 pt-4 border-t border-dashed border-[--color-line] text-center">
              <p className="text-[11.5px] text-[--color-ink-500] mb-2">收下了别忘记 ——</p>
              <button
                onClick={() => navigate('/upload')}
                className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[--color-camphor-700] hover:text-[--color-camphor-900]"
              >
                <Sparkles className="w-3.5 h-3.5" /> 自己也回传一份
              </button>
            </div>
          </div>

          {/* 信息卡 */}
          <div className="bg-white border border-[--color-line] rounded-3xl p-5 shadow-[var(--shadow-xs)]">
            <h3 className="text-[14px] font-semibold text-[--color-ink-900] mb-3 flex items-center gap-2">
              <span className="w-1 h-4 bg-[--color-camphor-400] rounded-full" />
              资源信息
            </h3>
            <ul className="flex flex-col divide-y divide-[--color-line-soft]">
              {!isPackage && m.file_type && (
                <InfoRow icon={FileText} label="文件类型" value={m.file_type.replace('.', '').toUpperCase()} />
              )}
              <InfoRow icon={Package} label="文件大小" value={formatSize(m.file_size)} />
              <InfoRow icon={Calendar} label="上传时间" value={formatDate(m.created_at)} />
              {!isPackage && m.year && <InfoRow icon={Calendar} label="资料年份" value={`${m.year} 年`} />}
              {m.department && <InfoRow icon={Building2} label="院系" value={m.department} accent />}
              {m.course_name && <InfoRow icon={BookOpen} label="课程" value={m.course_name} />}
              {!isPackage && m.instructor && <InfoRow icon={User} label="授课老师" value={m.instructor} />}
              {!isPackage && sub && <InfoRow icon={FileText} label="资料类型" value={`${sub.emoji} ${sub.label}`} />}
              {isPackage && m.source_type && (
                <InfoRow
                  icon={ExternalLink}
                  label="资料来源"
                  value={m.source_type === 'github' ? 'GitHub · SYSU_Notebook' : m.source_type === 'lanzou' ? '蓝奏云' : '社区贡献'}
                />
              )}
            </ul>
          </div>

          {/* 上传者卡 */}
          {m.uploader_name && (
            <div className="bg-white border border-[--color-line] rounded-3xl p-5 shadow-[var(--shadow-xs)]">
              <p className="text-[11.5px] uppercase tracking-[0.18em] text-[--color-ink-400] font-semibold mb-3 flex items-center gap-2">
                <Heart className="w-3 h-3 text-[--color-kapok-400]" /> 这份心意来自
              </p>
              <div className="flex items-center gap-3">
                <span
                  className="w-11 h-11 rounded-full grid place-items-center text-[14px] font-bold"
                  style={{ background: ava.bg, color: ava.fg }}
                >
                  {avatarLetter(m.uploader_name)}
                </span>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-[--color-ink-900] truncate">{m.uploader_name}</p>
                  <p className="text-[12px] text-[--color-ink-500]">谢谢你 · 又少一晚熬夜 🌙</p>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* ============== 相关资源 ============== */}
      {!isPackage && related.length > 0 && (
        <section className="mt-4">
          <SectionHeading
            kicker="顺便看看"
            title="同学们一起翻的"
            hint="按相同课程 / 同款关键词，挑出来的相关资料"
            accent="camphor"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {related.map((r) => <ResourceCard key={r.id} material={r} />)}
          </div>
        </section>
      )}
    </div>
  )
}

/* ==========================================================
 * 单行信息
 * ========================================================== */
function InfoRow({ icon: Icon, label, value, accent }) {
  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <span className="flex items-center gap-2 text-[12.5px] text-[--color-ink-500]">
        <Icon className="w-3.5 h-3.5" /> {label}
      </span>
      <span className={`text-[13px] font-semibold text-right truncate ${accent ? 'text-[--color-camphor-700]' : 'text-[--color-ink-900]'}`}>
        {value}
      </span>
    </li>
  )
}
