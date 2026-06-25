import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Mail, Lock, KeyRound, ArrowLeft, Sparkles, Eye, EyeOff, UserPlus, LogIn } from 'lucide-react'
import { api } from '../api/client'

export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'

  const [mode, setMode] = useState(localStorage.getItem('token') ? 'login' : 'register') // 'login' | 'register'
  const [useCode, setUseCode] = useState(false) // login mode: password vs code
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Countdown timer for send code button
  useEffect(() => {
    if (countdown <= 0) return
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  const validateEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)

  const handleSendCode = async () => {
    setError('')
    setSuccessMsg('')
    if (!email.trim()) {
      setError('请输入邮箱地址')
      return
    }
    if (!validateEmail(email)) {
      setError('邮箱格式不正确')
      return
    }
    if (countdown > 0) return
    try {
      await api.sendCode(email.trim(), mode)
      setSuccessMsg('验证码已发送，请查收邮件')
      setCountdown(60)
    } catch (e) {
      setError(e.message || '发送失败，请稍后重试')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')

    if (!email.trim()) {
      setError('请输入邮箱地址')
      return
    }
    if (!validateEmail(email)) {
      setError('邮箱格式不正确')
      return
    }

    if (mode === 'register') {
      if (!code.trim()) {
        setError('请输入验证码')
        return
      }
      if (!password || password.length < 6) {
        setError('密码至少 6 位')
        return
      }
      setLoading(true)
      try {
        const res = await api.register({
          email: email.trim(),
          code: code.trim(),
          password,
          invite_code: inviteCode.trim() || undefined,
        })
        localStorage.setItem('token', res.token)
        localStorage.setItem('user', JSON.stringify({
          id: res.user_id,
          email: email.trim(),
          invite_code: res.invite_code,
        }))
        navigate(redirect)
      } catch (err) {
        setError(err.message || '注册失败')
      } finally {
        setLoading(false)
      }
    } else {
      // login mode
      if (useCode) {
        if (!code.trim()) {
          setError('请输入验证码')
          return
        }
        setLoading(true)
        try {
          const res = await api.login({ email: email.trim(), code: code.trim() })
          localStorage.setItem('token', res.token)
          localStorage.setItem('user', JSON.stringify({
            id: res.user_id,
            email: email.trim(),
            invite_code: res.invite_code,
          }))
          navigate(redirect)
        } catch (err) {
          setError(err.message || '登录失败')
        } finally {
          setLoading(false)
        }
      } else {
        if (!password) {
          setError('请输入密码')
          return
        }
        setLoading(true)
        try {
          const res = await api.login({ email: email.trim(), password })
          localStorage.setItem('token', res.token)
          localStorage.setItem('user', JSON.stringify({
            id: res.user_id,
            email: email.trim(),
            invite_code: res.invite_code,
          }))
          navigate(redirect)
        } catch (err) {
          setError(err.message || '登录失败')
        } finally {
          setLoading(false)
        }
      }
    }
  }

  return (
    <div className="flex flex-col gap-7 max-w-[480px] mx-auto pt-4 md:pt-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[28px] border border-[--color-line] bg-gradient-to-br from-[#FFF6EC] via-white to-[#FFEFE9] px-6 md:px-9 py-7 md:py-8 text-center">
        <div className="absolute -top-6 -right-6 text-[140px] opacity-15 select-none pointer-events-none animate-float">🔐</div>
        <div className="relative">
          <div className="mb-2">
            <span className="text-[11.5px] uppercase tracking-[0.22em] font-semibold text-[--color-kapok-500]">
              破壁计划
            </span>
          </div>
          <h1 className="text-[26px] md:text-[30px] font-bold tracking-tight text-[--color-ink-900] leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
            {mode === 'login' ? '欢迎回来' : '加入破壁计划'}
          </h1>
          <p className="text-[14px] text-[--color-ink-700] mt-2 leading-relaxed">
            {mode === 'login'
              ? '登录后可以收藏资料、追踪下载额度'
              : '注册即享每周下载额度，邀请好友双方都能多 3 次'}
          </p>
        </div>
      </section>

      {/* Form card */}
      <section className="bg-white border border-[--color-line] rounded-3xl p-5 md:p-7 shadow-[var(--shadow-xs)]">
        {/* Mode toggle */}
        <div className="relative flex items-center h-12 p-1 mb-6 rounded-full bg-[--color-cream-100] border border-[--color-line]">
          {/* sliding thumb */}
          <div
            className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full bg-gradient-to-r from-[--color-honey-400] to-[--color-kapok-400] shadow-[0_4px_12px_-4px_rgba(244,125,44,0.45)] transition-all duration-200 ease-out"
            style={{ left: mode === 'login' ? '4px' : '50%' }}
          />
          <button
            type="button"
            onClick={() => { setMode('login'); setError(''); setSuccessMsg('') }}
            className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 h-full rounded-full text-[14px] font-bold transition-colors ${
              mode === 'login' ? 'text-white' : 'text-[--color-ink-500]'
            }`}
            aria-pressed={mode === 'login'}
          >
            <LogIn className="w-4 h-4" /> 登录
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(''); setSuccessMsg('') }}
            className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 h-full rounded-full text-[14px] font-bold transition-colors ${
              mode === 'register' ? 'text-white' : 'text-[--color-ink-500]'
            }`}
            aria-pressed={mode === 'register'}
          >
            <UserPlus className="w-4 h-4" /> 注册
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Email */}
          <div>
            <label className="block text-[12.5px] font-semibold text-[--color-ink-700] mb-1.5">
              邮箱 <span className="text-[--color-kapok-400]">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[--color-ink-400] pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@mail.sysu.edu.cn"
                className="w-full h-10 pl-10 pr-4 bg-[--color-cream-50] border border-[--color-line] rounded-full text-[13.5px] placeholder-[--color-ink-400] focus:bg-white focus:border-[--color-camphor-300] focus:ring-4 focus:ring-[--color-camphor-100] transition"
              />
            </div>
          </div>

          {/* Password or Code toggle (login only) */}
          {mode === 'login' && (
            <div className="flex items-center justify-between">
              <span className="text-[12.5px] text-[--color-ink-500]">登录方式</span>
              <button
                type="button"
                onClick={() => { setUseCode((v) => !v); setError(''); setPassword(''); setCode('') }}
                className="text-[12.5px] font-medium text-[--color-camphor-600] hover:text-[--color-camphor-800] underline-offset-4 hover:underline"
              >
                {useCode ? '改用密码登录' : '用验证码登录'}
              </button>
            </div>
          )}

          {/* Password */}
          {!(mode === 'login' && useCode) && (
            <div>
              <label className="block text-[12.5px] font-semibold text-[--color-ink-700] mb-1.5">
                密码 {mode === 'register' && <span className="text-[--color-kapok-400]">*</span>}
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[--color-ink-400] pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? '至少 6 位' : '输入密码'}
                  className="w-full h-10 pl-10 pr-10 bg-[--color-cream-50] border border-[--color-line] rounded-full text-[13.5px] placeholder-[--color-ink-400] focus:bg-white focus:border-[--color-camphor-300] focus:ring-4 focus:ring-[--color-camphor-100] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[--color-ink-400] hover:text-[--color-ink-600]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Code */}
          {(mode === 'register' || (mode === 'login' && useCode)) && (
            <div>
              <label className="block text-[12.5px] font-semibold text-[--color-ink-700] mb-1.5">
                验证码 <span className="text-[--color-kapok-400]">*</span>
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[--color-ink-400] pointer-events-none" />
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="6 位验证码"
                    maxLength={6}
                    className="w-full h-10 pl-10 pr-4 bg-[--color-cream-50] border border-[--color-line] rounded-full text-[13.5px] placeholder-[--color-ink-400] focus:bg-white focus:border-[--color-camphor-300] focus:ring-4 focus:ring-[--color-camphor-100] transition"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={countdown > 0 || loading}
                  className="h-10 px-4 rounded-full text-[13px] font-semibold bg-[--color-camphor-500] text-white hover:bg-[--color-camphor-600] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                >
                  {countdown > 0 ? `${countdown}s` : '发送验证码'}
                </button>
              </div>
            </div>
          )}

          {/* Invite code (register only) */}
          {mode === 'register' && (
            <div>
              <label className="block text-[12.5px] font-semibold text-[--color-ink-700] mb-1.5">
                邀请码 <span className="text-[--color-ink-400] font-normal">（可选）</span>
              </label>
              <div className="relative">
                <Sparkles className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[--color-ink-400] pointer-events-none" />
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="有邀请码可以双方各 +3 下载额度"
                  className="w-full h-10 pl-10 pr-4 bg-[--color-cream-50] border border-[--color-line] rounded-full text-[13.5px] placeholder-[--color-ink-400] focus:bg-white focus:border-[--color-camphor-300] focus:ring-4 focus:ring-[--color-camphor-100] transition"
                />
              </div>
            </div>
          )}

          {/* Error / Success */}
          {error && (
            <div className="text-[13px] text-[--color-berry-600] bg-[--color-berry-50] border border-[--color-berry-100] rounded-2xl px-4 py-2.5">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="text-[13px] text-[--color-camphor-700] bg-[--color-camphor-50] border border-[--color-camphor-200] rounded-2xl px-4 py-2.5">
              {successMsg}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-full bg-gradient-to-r from-[--color-honey-400] to-[--color-kapok-400] text-white text-[14.5px] font-bold shadow-[0_14px_28px_-12px_rgba(244,125,44,0.55)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all mt-1"
          >
            {loading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {mode === 'login' ? '正在登录…' : '正在注册…'}
              </>
            ) : (
              <>
                {mode === 'login' ? <LogIn className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                {mode === 'login' ? '登录' : '注册'}
              </>
            )}
          </button>
        </form>

        {/* Back to home */}
        <div className="mt-5 text-center">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 text-[12.5px] text-[--color-ink-500] hover:text-[--color-ink-700] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> 先不登录，回首页逛逛
          </button>
        </div>
      </section>
    </div>
  )
}
