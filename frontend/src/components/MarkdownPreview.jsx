import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { Loader2, AlertCircle } from 'lucide-react'

/* ==========================================================
 * Markdown 预览
 * 文本通过 props.url fetch 拿到，用 react-markdown 渲染。
 * 支持 GFM（表格/任务列表/删除线）、$...$ / $$...$$ 公式。
 * ========================================================== */
export default function MarkdownPreview({ url, fileName }) {
  // url 变化时通过 key 重新挂载内层，自然回到初始 loading 状态，
  // 避免在 effect 体内同步调用 setState。
  return <MarkdownPreviewInner key={url} url={url} fileName={fileName} />
}

function MarkdownPreviewInner({ url, fileName }) {
  const [content, setContent] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    fetch(url)
      .then(async (r) => {
        if (!r.ok) throw new Error(`加载失败 (HTTP ${r.status})`)
        return r.text()
      })
      .then((t) => { if (alive) setContent(t) })
      .catch((e) => { if (alive) setError(e?.message || '加载失败') })
    return () => { alive = false }
  }, [url])

  if (error) {
    return (
      <div className="w-full aspect-[4/3] bg-[--color-cream-100] flex items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 text-[--color-berry-500]" />
          <p className="text-[13.5px] text-[--color-ink-700] font-medium">预览加载失败</p>
          <p className="text-[12px] text-[--color-ink-500] mt-1">{error}</p>
        </div>
      </div>
    )
  }

  if (content === null) {
    return (
      <div className="w-full aspect-[4/3] bg-[--color-cream-50] flex items-center justify-center">
        <div className="flex items-center gap-2 text-[13px] text-[--color-ink-500]">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>正在打开“{fileName}”…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="md-preview w-full bg-[--color-cream-50] p-5 md:p-7 max-h-[640px] overflow-y-auto">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: (p) => <h1 {...p} className="text-[26px] font-bold tracking-tight text-[--color-ink-900] mt-7 mb-4 pb-2 border-b border-[--color-line]" style={{ fontFamily: 'var(--font-display)' }} />,
          h2: (p) => <h2 {...p} className="text-[21px] font-bold tracking-tight text-[--color-ink-900] mt-6 mb-3" style={{ fontFamily: 'var(--font-display)' }} />,
          h3: (p) => <h3 {...p} className="text-[17px] font-semibold text-[--color-ink-900] mt-5 mb-2" />,
          h4: (p) => <h4 {...p} className="text-[15px] font-semibold text-[--color-ink-700] mt-4 mb-2" />,
          h5: (p) => <h5 {...p} className="text-[14px] font-semibold text-[--color-ink-700] mt-3 mb-2" />,
          h6: (p) => <h6 {...p} className="text-[13px] font-semibold text-[--color-ink-500] mt-3 mb-2 uppercase tracking-wider" />,
          p: (p) => <p {...p} className="text-[14.5px] leading-[1.75] text-[--color-ink-700] my-3" />,
          a: (p) => <a {...p} target="_blank" rel="noopener noreferrer" className="text-[--color-camphor-700] underline decoration-[--color-camphor-200] underline-offset-2 hover:text-[--color-camphor-900] hover:decoration-[--color-camphor-500] transition-colors" />,
          ul: (p) => <ul {...p} className="my-3 pl-5 space-y-1.5 list-disc marker:text-[--color-camphor-400]" />,
          ol: (p) => <ol {...p} className="my-3 pl-5 space-y-1.5 list-decimal marker:text-[--color-camphor-400] marker:font-semibold" />,
          li: (p) => <li {...p} className="text-[14.5px] leading-[1.7] text-[--color-ink-700] pl-1" />,
          blockquote: (p) => <blockquote {...p} className="my-4 pl-4 border-l-[3px] border-[--color-camphor-300] bg-[--color-camphor-50]/60 rounded-r-xl py-2 pr-3 text-[14px] text-[--color-ink-700] italic" />,
          hr: (p) => <hr {...p} className="my-6 border-0 border-t border-dashed border-[--color-line]" />,
          img: (p) => <img {...p} className="max-w-full rounded-xl my-3 shadow-[var(--shadow-sm)]" />,
          table: (p) => (
            <div className="my-4 overflow-x-auto rounded-xl border border-[--color-line]">
              <table {...p} className="w-full text-[13px] border-collapse" />
            </div>
          ),
          thead: (p) => <thead {...p} className="bg-[--color-cream-100]" />,
          tbody: (p) => <tbody {...p} className="bg-white" />,
          tr: (p) => <tr {...p} className="border-t border-[--color-line-soft] [&:nth-child(even)]:bg-[--color-cream-50]/60" />,
          th: (p) => <th {...p} className="px-3 py-2 text-left font-semibold text-[--color-ink-900]" />,
          td: (p) => <td {...p} className="px-3 py-2 text-[--color-ink-700]" />,
          pre: (p) => <pre {...p} className="my-4 p-4 rounded-2xl bg-[#1B1A18] text-[#F2EADC] text-[13px] leading-[1.6] overflow-x-auto shadow-[var(--shadow-sm)]" />,
          code: ({ className, children, ...p }) => {
            const isInline = !className
            if (isInline) {
              return <code {...p} className="px-1.5 py-0.5 rounded-md bg-[--color-cream-200] text-[--color-kapok-500] text-[13px] font-mono">{children}</code>
            }
            return <code {...p} className={className}>{children}</code>
          },
          input: (p) => <input {...p} disabled className="w-3.5 h-3.5 accent-[--color-camphor-500] align-middle mr-1.5" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
