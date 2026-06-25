import { useState } from 'react'
import { X, Copy, Check, Upload, Sparkles, Link2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import ModalPortal from './ModalPortal'

export default function DownloadShareModal({ onClose, remaining = 0 }) {
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)

  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const inviteCode = user?.invite_code || ''
  const siteUrl = 'https://arxiv.jaison.ink'

  const shareText = `一起来「破壁计划」找资料吧 🎓\n\n这是中大人的资料共享社区：笔记、试卷、课程包、经验攻略全免费。\n\n👉 ${siteUrl}${inviteCode ? `\n\n注册时填我的邀请码【${inviteCode}】，咱俩本周各 +3 次下载额度～` : ''}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = shareText
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
    }
    setTimeout(() => setCopied(false), 2000)
  }

  const handleUpload = () => {
    onClose()
    navigate('/upload')
  }

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
        <div className="relative bg-white rounded-3xl border border-[--color-line] shadow-[var(--shadow-lg)] max-w-[460px] w-full p-6 md:p-7 animate-fade-up">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[--color-cream-100] hover:bg-[--color-cream-200] grid place-items-center text-[--color-ink-500] hover:text-[--color-ink-900] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[--color-camphor-200] to-[--color-honey-200] grid place-items-center text-2xl mb-4">
            🤝
          </div>

          <h3 className="text-[18px] font-bold text-[--color-ink-900] mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            资料已经收下啦
          </h3>

          <p className="text-[13.5px] text-[--color-ink-500] leading-relaxed mb-5">
            破壁计划靠大家无偿分享运转。如果你身边也有需要的同学，
            把下面这段文字发给他，一起拆掉信息差。
          </p>

          <div className="bg-[--color-cream-50] border border-[--color-line] rounded-2xl p-4 mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12.5px] font-semibold text-[--color-ink-700] flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5" /> 分享给好友
              </span>
              {inviteCode && (
                <span className="text-[11.5px] text-[--color-honey-700] bg-[--color-honey-100] px-2 py-0.5 rounded-full font-medium">
                  邀请码 {inviteCode}
                </span>
              )}
            </div>
            <p className="text-[12.5px] text-[--color-ink-600] leading-relaxed whitespace-pre-line mb-3">{shareText}</p>
            <button
              onClick={handleCopy}
              className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-full bg-[--color-camphor-50] border border-[--color-camphor-200] text-[--color-camphor-700] text-[13px] font-semibold hover:bg-[--color-camphor-100] transition-colors"
            >
              {copied ? <><Check className="w-4 h-4" /> 已复制</> : <><Copy className="w-4 h-4" /> 复制这段分享语</>}
            </button>
          </div>

          <div className="flex items-center gap-3 mb-5 p-3 rounded-2xl bg-gradient-to-r from-[--color-honey-50] to-[--color-cream-50] border border-[--color-line]">
            <div className="w-10 h-10 rounded-full bg-white grid place-items-center shadow-[var(--shadow-xs)] shrink-0">
              <Sparkles className="w-4 h-4 text-[--color-honey-500]" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-[--color-ink-900]">本次消耗 1 次下载额度</p>
              <p className="text-[12px] text-[--color-ink-500]">本周还剩 <span className="font-semibold text-[--color-camphor-700]">{remaining}</span> 次</p>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <button
              onClick={handleUpload}
              className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-full bg-gradient-to-r from-[--color-honey-400] to-[--color-kapok-400] text-white text-[13.5px] font-semibold shadow-[0_12px_28px_-12px_rgba(244,125,44,0.55)] hover:scale-[1.02] active:scale-[0.98] transition-transform"
            >
              <Upload className="w-4 h-4" /> 上传一份资料，再赚 3 次额度
            </button>
            <button
              onClick={onClose}
              className="w-full inline-flex items-center justify-center gap-2 h-10 text-[13px] text-[--color-ink-400] hover:text-[--color-ink-600] transition-colors"
            >
              继续逛逛
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}
