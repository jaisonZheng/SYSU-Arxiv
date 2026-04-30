import { Link } from 'react-router-dom'
import { Download, FileText, BookOpen } from 'lucide-react'

const categoryColors = {
  past_exam: 'bg-primary/10 text-primary',
  study_material: 'bg-secondary/10 text-secondary',
}

const categoryLabels = {
  past_exam: 'Past Exam',
  study_material: 'Study Material',
}

const subCategoryLabels = {
  lecture: 'Lecture',
  notes: 'Notes',
  mock_exam: 'Mock Exam',
  summary: 'Summary',
  other: 'Other',
}

export default function ResourceCard({ material }) {
  const isZip = material.is_zip_package
  const categoryClass = categoryColors[material.category] || 'bg-gray-100 text-gray-600'
  const categoryLabel = categoryLabels[material.category] || material.category

  const formatSize = (bytes) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <Link
      to={`/material/${material.id}`}
      className="bg-white border border-gray-200 rounded-lg p-5 hover:border-primary hover:shadow-[0px_4px_12px_rgba(0,0,0,0.05)] transition-all cursor-pointer group flex flex-col md:flex-row gap-5"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${categoryClass}`}>
            {categoryLabel}
          </span>
          {material.sub_category && (
            <span className="text-xs text-gray-500">
              {subCategoryLabels[material.sub_category] || material.sub_category}
            </span>
          )}
          {material.year && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              {material.year}
            </span>
          )}
        </div>
        <h3 className="text-base font-semibold text-gray-900 mb-2 group-hover:text-primary transition-colors line-clamp-1">
          {material.title}
        </h3>
        <p className="text-sm text-gray-500 line-clamp-2 mb-3">
          {material.description || `${material.course_name || ''} ${material.department || ''}`.trim() || 'No description'}
        </p>
        <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
          {material.department && (
            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">
              {material.department}
            </span>
          )}
          {material.course_name && (
            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">
              {material.course_name}
            </span>
          )}
          <span className="flex items-center gap-1 text-xs">
            <Download className="w-3.5 h-3.5" />
            {material.download_count}
          </span>
          {material.file_size > 0 && (
            <span className="text-xs">{formatSize(material.file_size)}</span>
          )}
        </div>
      </div>
      <div className="flex-shrink-0 flex items-center justify-center w-full md:w-40 h-28 bg-gray-100 rounded-lg border border-gray-200">
        {isZip ? (
          <FileText className="w-10 h-10 text-gray-400" />
        ) : (
          <BookOpen className="w-10 h-10 text-gray-400" />
        )}
      </div>
    </Link>
  )
}
