import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Download, FileText, ArrowLeft, Package, FileIcon, Image, FileCode } from 'lucide-react'
import { api } from '../api/client'
import ResourceCard from '../components/ResourceCard'

function FilePreview({ url, mimeType, fileName, fileType }) {
  const ext = (fileType || fileName || '').toLowerCase()

  if (ext.includes('pdf') || ext.endsWith('.pdf')) {
    return (
      <div className="w-full aspect-[4/3] bg-gray-100">
        <iframe src={url} className="w-full h-full border-0" title={fileName} />
      </div>
    )
  }

  if (ext.includes('image') || ext.endsWith('.png') || ext.endsWith('.jpg') || ext.endsWith('.jpeg') || ext.endsWith('.gif')) {
    return (
      <div className="w-full bg-gray-100 flex items-center justify-center p-4">
        <img src={url} alt={fileName} className="max-w-full max-h-[600px] object-contain" />
      </div>
    )
  }

  if (ext.endsWith('.txt') || ext.endsWith('.md') || ext.endsWith('.c') || ext.endsWith('.cpp') || ext.endsWith('.h') || ext.endsWith('.py') || ext.endsWith('.js') || ext.endsWith('.html')) {
    return (
      <div className="w-full bg-gray-50 p-4 overflow-auto max-h-[600px]">
        <iframe src={url} className="w-full h-[500px] border-0" title={fileName} />
      </div>
    )
  }

  // Microsoft Office Online Viewer for doc/docx/ppt/pptx/xls/xlsx
  if (ext.endsWith('.doc') || ext.endsWith('.docx') || ext.endsWith('.ppt') || ext.endsWith('.pptx') || ext.endsWith('.xls') || ext.endsWith('.xlsx')) {
    const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`
    const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fullUrl)}`
    return (
      <div className="w-full aspect-[4/3] bg-gray-100">
        <iframe src={viewerUrl} className="w-full h-full border-0" title={fileName} />
      </div>
    )
  }

  return (
    <div className="w-full aspect-[4/3] bg-gray-100 flex items-center justify-center">
      <div className="text-center p-8">
        <FileIcon className="w-14 h-14 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-400">暂不支持在线预览此格式</p>
        <p className="text-xs text-gray-400 mt-1">请下载后查看</p>
      </div>
    </div>
  )
}

function PackageFileTree({ items, packageId, onPreview }) {
  const [expanded, setExpanded] = useState({})

  // Build tree structure
  const tree = {}
  items.forEach(item => {
    const parts = item.path.split('/')
    let current = tree
    parts.forEach((part, idx) => {
      if (!current[part]) {
        current[part] = { _isFile: idx === parts.length - 1, _item: item, _children: {} }
      }
      current = current[part]._children
    })
  })

  const toggle = (path) => {
    setExpanded(prev => ({ ...prev, [path]: !prev[path] }))
  }

  const renderTree = (node, path = '') => {
    return Object.entries(node).map(([name, data]) => {
      const fullPath = path ? `${path}/${name}` : name
      if (data._isFile) {
        const item = data._item
        const isImage = item.mime_type?.includes('image') || item.file_type?.match(/\.(png|jpg|jpeg|gif)$/i)
        const isPdf = item.mime_type?.includes('pdf') || item.file_type?.includes('pdf')
        const isText = item.mime_type?.includes('text') || item.file_type?.match(/\.(txt|md|c|cpp|h|py|js|html)$/i)
        const isOffice = item.file_type?.match(/\.(docx?|pptx?|xlsx?)$/i)
        const canPreview = isImage || isPdf || isText || isOffice

        return (
          <div key={fullPath} className="flex items-center gap-2 py-1 px-2 hover:bg-gray-50 rounded text-sm">
            {isImage && <Image className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
            {isPdf && <FileText className="w-3.5 h-3.5 text-red-400 shrink-0" />}
            {isText && <FileCode className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
            {!isImage && !isPdf && !isText && <FileIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
            <span className="truncate flex-1 text-gray-700">{name}</span>
            <span className="text-xs text-gray-400 shrink-0">{(item.file_size / 1024).toFixed(1)} KB</span>
            {canPreview && (
              <button
                onClick={() => onPreview(item)}
                className="text-xs text-primary hover:underline shrink-0"
              >
                预览
              </button>
            )}
          </div>
        )
      }

      const isOpen = expanded[fullPath] !== false
      return (
        <div key={fullPath}>
          <button
            onClick={() => toggle(fullPath)}
            className="flex items-center gap-1.5 py-1 px-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded w-full text-left"
          >
            <span className="text-xs select-none">{isOpen ? '▼' : '▶'}</span>
            <Package className="w-3.5 h-3.5 text-gray-400" />
            {name}
          </button>
          {isOpen && (
            <div className="ml-4 border-l border-gray-200 pl-2">
              {renderTree(data._children, fullPath)}
            </div>
          )}
        </div>
      )
    })
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-200 p-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Package className="w-4 h-4" />
          <span>资源包内容</span>
        </div>
        <span className="text-xs text-gray-400">{items.length} 个文件</span>
      </div>
      <div className="p-2 max-h-[500px] overflow-y-auto">
        {renderTree(tree)}
      </div>
    </div>
  )
}

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
    loadData()
  }, [id, isPackage])

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

  const handleDownload = () => {
    if (!data) return
    const url = isPackage ? api.downloadPackage(data.id) : api.downloadMaterial(data.id)
    window.open(url, '_blank')
  }

  const handlePreviewItem = (item) => {
    setPreviewItem(item)
  }

  const formatSize = (bytes) => {
    if (!bytes) return '未知'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('zh-CN')
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400">加载中...</div>
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">{error || '资源未找到'}</p>
        <button onClick={() => navigate('/')} className="text-primary hover:underline">
          返回首页
        </button>
      </div>
    )
  }

  const m = data

  return (
    <div className="flex flex-col gap-5">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button onClick={() => navigate('/')} className="hover:text-primary transition-colors">首页</button>
        <span>/</span>
        {isPackage ? (
          <button onClick={() => navigate('/course-packages')} className="hover:text-primary transition-colors">课程资源包</button>
        ) : (
          <button onClick={() => navigate(m.category === 'past_exam' ? '/past-exams' : '/study-materials')} className="hover:text-primary transition-colors">
            {m.category === 'past_exam' ? '历年真题' : '学习资料'}
          </button>
        )}
        <span>/</span>
        <span className="text-gray-900 truncate max-w-[200px]">{m.title}</span>
      </div>

      {/* Header */}
      <div className="flex justify-between items-start gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-gray-900 leading-tight break-words">{m.title}</h1>
          <p className="text-sm text-gray-500 mt-1.5">{m.description || `${m.course_name || ''}`.trim()}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {!isPackage && m.category === 'past_exam' && (
            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-semibold uppercase tracking-wider rounded">历年真题</span>
          )}
          {!isPackage && m.category === 'study_material' && (
            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-semibold uppercase tracking-wider rounded">学习资料</span>
          )}
          {isPackage && (
            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-semibold uppercase tracking-wider rounded">资源包</span>
          )}
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column - Preview */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {isPackage ? (
            <>
              {previewItem ? (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 border-b border-gray-200 p-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <FileText className="w-4 h-4" />
                      <span>{previewItem.file_name}</span>
                    </div>
                    <button onClick={() => setPreviewItem(null)} className="text-xs text-gray-500 hover:text-gray-700">
                      返回文件列表
                    </button>
                  </div>
                  <FilePreview
                    url={api.previewPackageItem(m.id, previewItem.path)}
                    mimeType={previewItem.mime_type}
                    fileName={previewItem.file_name}
                    fileType={previewItem.file_type}
                  />
                </div>
              ) : (
                <PackageFileTree items={packageItems} packageId={m.id} onPreview={handlePreviewItem} />
              )}
            </>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-200 p-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <FileText className="w-4 h-4" />
                  <span>文件预览</span>
                </div>
                <span className="text-xs text-gray-400">{m.file_name}</span>
              </div>
              <FilePreview
                url={api.previewMaterial(m.id)}
                mimeType={m.mime_type}
                fileName={m.file_name}
                fileType={m.file_type}
              />
            </div>
          )}
        </div>

        {/* Right Column - Meta & Actions */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Actions */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col gap-3">
            <button
              onClick={handleDownload}
              className="w-full h-9 bg-primary text-white rounded-md flex items-center justify-center gap-2 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Download className="w-4 h-4" />
              下载{isPackage ? '资源包' : '文件'}
            </button>
            <div className="text-center text-xs text-gray-500">
              {formatSize(m.file_size)} · {m.download_count} 次下载
            </div>
            {isPackage && (
              <div className="text-center text-xs text-gray-500">
                共 {m.total_files || packageItems.length} 个文件
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col gap-3">
            <h3 className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2">资源信息</h3>
            <div className="flex flex-col gap-2">
              {m.file_type && !isPackage && (
                <div className="flex justify-between items-center py-1 border-b border-gray-100">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">文件类型</span>
                  <span className="text-sm text-gray-900 font-medium">{m.file_type}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-1 border-b border-gray-100">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">文件大小</span>
                <span className="text-sm text-gray-900 font-medium">{formatSize(m.file_size)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-gray-100">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">上传时间</span>
                <span className="text-sm text-gray-900 font-medium">{formatDate(m.created_at)}</span>
              </div>
              {!isPackage && m.year && (
                <div className="flex justify-between items-center py-1 border-b border-gray-100">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">年份</span>
                  <span className="text-sm text-gray-900 font-medium">{m.year}</span>
                </div>
              )}
              {m.department && (
                <div className="flex justify-between items-center py-1 border-b border-gray-100">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">院系</span>
                  <span className="text-sm text-primary font-medium">{m.department}</span>
                </div>
              )}
              {m.course_name && (
                <div className="flex justify-between items-center py-1 border-b border-gray-100">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">课程</span>
                  <span className="text-sm text-gray-900 font-medium">{m.course_name}</span>
                </div>
              )}
              {!isPackage && m.instructor && (
                <div className="flex justify-between items-center py-1 border-b border-gray-100">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">授课教师</span>
                  <span className="text-sm text-gray-900 font-medium">{m.instructor}</span>
                </div>
              )}
              {!isPackage && m.sub_category && (
                <div className="flex justify-between items-center py-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">类型</span>
                  <span className="text-sm text-gray-900 font-medium">
                    {m.sub_category === 'past_exam' && '试卷真题'}
                    {m.sub_category === 'lecture' && '课件'}
                    {m.sub_category === 'notes' && '笔记'}
                    {m.sub_category === 'mock_exam' && '模拟题'}
                    {m.sub_category === 'exam_answer' && '试卷答案'}
                    {m.sub_category === 'textbook_answer' && '教材答案'}
                    {m.sub_category === 'summary' && '总结'}
                    {m.sub_category === 'other' && '其它'}
                  </span>
                </div>
              )}
              {isPackage && m.source_type && (
                <div className="flex justify-between items-center py-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">来源</span>
                  <span className="text-sm text-gray-900 font-medium">{m.source_type === 'github' ? 'GitHub' : 'Jaison'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Uploader */}
          {m.uploader_name && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col gap-3">
              <h3 className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2">贡献者</h3>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-sm font-bold">
                  {m.uploader_name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-gray-900">{m.uploader_name}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Related Resources */}
      {!isPackage && related.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200">
            <div className="w-1 h-5 bg-primary rounded-full" />
            <h2 className="text-xl font-semibold tracking-tight text-gray-900">相关资源</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {related.map((r) => (
              <ResourceCard key={r.id} material={r} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
