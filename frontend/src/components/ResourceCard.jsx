import { Link } from 'react-router-dom'
import { Download, BookOpen } from 'lucide-react'
import { api } from '../api/client'

const categoryLabels = {
  past_exam: '历年真题',
  study_material: '学习资料',
}

const subCategoryLabels = {
  past_exam: '试卷真题',
  lecture: '课件',
  notes: '笔记',
  mock_exam: '模拟题',
  exam_answer: '试卷答案',
  textbook_answer: '教材答案',
  summary: '总结',
  other: '其它',
}

export default function ResourceCard({ material }) {
  const categoryLabel = categoryLabels[material.category] || material.category

  const formatSize = (bytes) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleDownload = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const url = api.downloadMaterial(material.id)
    window.open(url, '_blank')
  }

  return (
    <Link
      to={`/material/${material.id}`}
      className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer group flex flex-col md:flex-row gap-4"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className="px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider bg-gray-100 text-gray-700">
            {categoryLabel}
          </span>
          {material.sub_category && (
            <span className="text-xs text-gray-500">
              {subCategoryLabels[material.sub_category] || material.sub_category}
            </span>
          )}
          {material.year && (
            <span className="text-xs text-gray-500">
              {material.year}
            </span>
          )}
        </div>
        <h3 className="text-sm font-semibold text-gray-900 mb-1.5 group-hover:text-primary transition-colors line-clamp-1">
          {material.title}
        </h3>
        <p className="text-sm text-gray-500 line-clamp-2 mb-2">
          {material.description || `${material.course_name || ''} ${material.department || ''}`.trim() || '暂无描述'}
        </p>
        <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
          {material.department && (
            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
              {material.department}
            </span>
          )}
          {material.course_name && (
            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
              {material.course_name}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Download className="w-3 h-3" />
            {material.download_count}
          </span>
          {material.file_size > 0 && (
            <span>{formatSize(material.file_size)}</span>
          )}
        </div>
      </div>
      <div className="flex-shrink-0 flex flex-col items-center justify-center gap-2 w-full md:w-36">
        <div className="flex items-center justify-center w-full h-24 bg-gray-100 rounded-lg border border-gray-200">
          <BookOpen className="w-8 h-8 text-gray-400" />
        </div>
      </div>
    </Link>
  )
}
