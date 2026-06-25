import { useState } from 'react'
import { X, Copy, Check, Upload, Sparkles } from 'lucide-react'
import ModalPortal from './ModalPortal'

export default function QuotaModal({ onClose, onNavigateUpload }) {
  const [copied, setCopied] = useState(false)

  const handleCopyInvite = async () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const inviteCode = user?.invite_code || ''
    const text = `一起来「破壁计划」找资料吧！\n\n中大人的资料共享社区，笔记、试卷、课程包全免费。\n\n注册链接：https://arxiv.jaison.ink/login${inviteCode ? `?invite=${inviteCode}` : ''}\n\n${inviteCode ? `使用我的邀请码注册，双方本周各 +3 次下载额度！` : ''}`

    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleUploadClick = () => {
    onClose()
    if (onNavigateUpload) onNavigateUpload()
  }

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

        {/* Modal */}
        <div className="relative bg-white rounded-3xl border border-[--color-line] shadow-[var(--shadow-lg)] max-w-[420px] w-full p-6 md:p-7 animate-fade-up">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[--color-cream-100] hover:bg-[--color-cream-200] grid place-items-center text-[--color-ink-500] hover:text-[--color-ink-900] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Icon */}
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[--color-honey-200] to-[--color-kapok-200] grid place-items-center text-2xl mb-4">
            🌙
          </div>

          {/* Title */}
          <h3 className="text-[18px] font-bold text-[--color-ink-900] mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            本周免费额度已用完
          </h3>

          {/* Description */}
          <p className="text-[13.5px] text-[--color-ink-500] leading-relaxed mb-5">
            每个同学每周有 3 次免费下载机会。
            <br />
            你可以：
          </p>

          <ol className="space-y-3 mb-6">
            <li className="flex items-start gap-3 text-[13.5px] text-[--color-ink-700]">
              <span className="w-6 h-6 rounded-full bg-[--color-honey-100] text-[--color-honey-700] text-[12px] font-bold grid place-items-center shrink-0 mt-0.5">1</span>
              <span>邀请一位新同学注册，双方本周各 <strong className="text-[--color-honey-700]">+3 次</strong> 额度；</span>
            </li>
            <li className="flex items-start gap-3 text-[13.5px] text-[--color-ink-700]">
              <span className="w-6 h-6 rounded-full bg-[--color-camphor-100] text-[--color-camphor-700] text-[12px] font-bold grid place-items-center shrink-0 mt-0.5">2</span>
              <span>上传一份资料/课程包/经验攻略，本周 <strong className="text-[--color-camphor-700]">+3 次</strong> 额度。</span>
            </li>
          </ol>

          {/* Actions */}
          <div className="flex flex-col gap-2.5">
            <button
              onClick={handleCopyInvite}
              className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-full bg-gradient-to-r from-[--color-honey-400] to-[--color-kapok-400] text-white text-[13.5px] font-semibold shadow-[0_12px_28px_-12px_rgba(244,125,44,0.55)] hover:scale-[1.02] active:scale-[0.98] transition-transform"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  邀请信息已复制
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  复制邀请信息
                </>
              )}
            </button>

            <button
              onClick={handleUploadClick}
              className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-full bg-[--color-camphor-50] border border-[--color-camphor-200] text-[--color-camphor-700] text-[13.5px] font-semibold hover:bg-[--color-camphor-100] transition-colors"
            >
              <Upload className="w-4 h-4" />
              去上传资料
            </button>

            <button
              onClick={onClose}
              className="w-full inline-flex items-center justify-center gap-2 h-10 text-[13px] text-[--color-ink-400] hover:text-[--color-ink-600] transition-colors"
            >
              稍后再说
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}
