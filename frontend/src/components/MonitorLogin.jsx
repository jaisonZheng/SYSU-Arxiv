import { useState } from 'react'
import { Shield, Eye, EyeOff } from 'lucide-react'

export default function MonitorLogin({ onLogin, error }) {
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!password.trim()) return
    setLoading(true)
    await onLogin(password.trim())
    setLoading(false)
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-[400px] bg-white border border-[--color-line] rounded-3xl p-8 shadow-[var(--shadow-xs)]"
      >
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[--color-camphor-100] to-[--color-camphor-50] border border-[--color-camphor-200] grid place-items-center mb-5">
          <Shield className="w-6 h-6 text-[--color-camphor-600]" />
        </div>
        <h1 className="text-[22px] font-bold text-[--color-ink-900] mb-1" style={{ fontFamily: 'var(--font-display)' }}>
          管理员监视器
        </h1>
        <p className="text-[13.5px] text-[--color-ink-500] mb-6">
          输入管理员密码进入监控面板
        </p>

        <div className="relative mb-4">
          <input
            type={show ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="管理员密码"
            className="w-full h-12 pl-4 pr-11 bg-white border border-[--color-line] rounded-2xl text-[14px] placeholder-[--color-ink-400] focus:border-[--color-camphor-300] focus:ring-4 focus:ring-[--color-camphor-100] transition shadow-[var(--shadow-xs)]"
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[--color-ink-400] hover:text-[--color-ink-600]"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {error && (
          <div className="mb-4 text-[12.5px] text-[--color-berry-600] bg-[--color-berry-50] border border-[--color-berry-100] rounded-xl px-3 py-2">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 rounded-2xl bg-[--color-camphor-500] hover:bg-[--color-camphor-600] disabled:opacity-60 text-white text-[14px] font-semibold transition-colors shadow-[0_8px_20px_-10px_rgba(45,106,79,0.5)]"
        >
          {loading ? '验证中…' : '进入监控面板'}
        </button>
      </form>
    </div>
  )
}
