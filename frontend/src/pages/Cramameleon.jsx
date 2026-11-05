import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, BookOpen, Files, Sparkles, ShieldCheck } from 'lucide-react'
import { API_BASE, cramameleonBase, getCramameleonConfig } from '../api/client'

function AuthorizeCramameleon() {
  const location = useLocation()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    const login = () => navigate(`/login?mode=login&redirect=${encodeURIComponent(location.pathname + location.search)}`, { replace: true })
    async function authorize() {
      const token = localStorage.getItem('token')
      if (!token) {
        login()
        return
      }
      const config = await getCramameleonConfig(signal)
      if (!config.enabled) throw new Error('Cramameleon 暂不可用，请稍后重试。')
      const query = new URLSearchParams(location.search)
      const data = Object.fromEntries(['client_id', 'redirect_uri', 'response_type', 'state', 'code_challenge', 'code_challenge_method', 'scope'].map(key => [key, query.get(key) || '']))
      data.context = JSON.parse(query.get('context') || '{}')
      const response = await fetch(`${API_BASE}${cramameleonBase}/authorize`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data), signal,
      })
      signal.throwIfAborted()
      if (response.status === 401) {
        if (localStorage.getItem('token') === token) {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
        }
        login()
        return
      }
      const result = await response.json()
      if (!response.ok) throw new Error(result.error?.message || '连接失败，请从资料页重新进入。')
      const target = new URL(result.redirect_url)
      if (target.origin !== new URL(config.appStartUrl).origin || target.pathname !== '/api/auth/old-site/callback') throw new Error('授权地址不正确，请重新进入。')
      signal.throwIfAborted()
      window.location.replace(target.href)
    }
    authorize().catch(e => {
      if (!signal.aborted) setError(e instanceof SyntaxError ? '入口已失效，请从资料页重新进入。' : e.message)
    })
    return () => controller.abort()
  }, [location.pathname, location.search, navigate])

  return <section className="max-w-[920px] mx-auto rounded-3xl border border-[var(--color-line)] bg-white p-6">
    {error ? <><p role="alert">{error}</p><Link to="/cramameleon">返回 AI复习</Link></> : <p role="status">正在进入 Cramameleon…</p>}
  </section>
}

function CramameleonLanding() {
  const location = useLocation()
  const [config, setConfig] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    getCramameleonConfig(controller.signal).then(setConfig).catch(e => {
      if (!controller.signal.aborted) setError(e.message)
    })
    return () => controller.abort()
  }, [])

  function enter() {
    const target = new URL(config.appStartUrl)
    const incoming = new URLSearchParams(location.search)
    for (const key of ['materialId', 'packageId', 'itemId']) {
      const value = incoming.get(key)
      if (value && /^[1-9][0-9]*$/.test(value)) target.searchParams.set(key, value)
    }
    window.location.assign(target.href)
  }

  return <div className="max-w-[920px] mx-auto flex flex-col gap-6">
    <section className="relative overflow-hidden rounded-[28px] border border-[var(--color-line)] bg-gradient-to-br from-[#EDF5EF] via-[#FFFCF7] to-[#FFF0DF] p-6 md:p-10">
      <div className="grid md:grid-cols-[1.5fr_1fr] gap-8 items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold tracking-wide text-[var(--color-camphor-700)]"><Sparkles className="w-4 h-4" /> 破壁计划 · AI复习</span>
          <h1 className="mt-4 text-[30px] md:text-[40px] font-bold leading-tight tracking-tight text-[var(--color-ink-900)]" style={{ fontFamily: 'var(--font-display)' }}>把课程资料，<br />变成复习的起点</h1>
          <p className="mt-4 text-[15px] leading-7 text-[var(--color-ink-700)]">Cramameleon 帮你梳理知识、理解难点和练习巩固。从熟悉的课程资料出发，也可以带上自己的文件。</p>
          <button style={{ color: '#fff' }} onClick={enter} disabled={!config?.enabled} className="mt-6 inline-flex items-center justify-center gap-2 min-h-12 px-6 py-3 rounded-full bg-[var(--color-camphor-600)] hover:bg-[var(--color-camphor-700)] text-white font-semibold shadow-[var(--shadow-xs)] disabled:opacity-50 transition-colors">进入 Cramameleon<ArrowRight className="w-4 h-4" /></button>
          <p className="mt-3 text-[12px] leading-5 text-[var(--color-ink-500)]">使用当前破壁计划账号，无需另设密码。</p>
        </div>
        <div className="rounded-3xl border border-white/80 bg-white/75 p-6 shadow-[var(--shadow-xs)]">
          <BookOpen className="w-8 h-8 text-[var(--color-camphor-600)]" />
          <p className="mt-4 text-lg font-bold text-[var(--color-ink-900)]">选好资料，再开始学习</p>
          <p className="mt-2 text-sm leading-6 text-[var(--color-ink-700)]">搜索课程 · 查看目录<br />确认读取 · 提问复习</p>
          <div className="mt-5 border-t border-[var(--color-line)] pt-4 text-[13px] leading-6 text-[var(--color-ink-500)]">可搜索课程资料、预览并直接导入。</div>
        </div>
      </div>
    </section>
    <section className="grid md:grid-cols-2 gap-4">
      <div className="rounded-3xl border border-[var(--color-line)] bg-white p-6"><Files className="w-5 h-5 text-[var(--color-camphor-600)]" /><h2 className="mt-3 font-bold">资料按需带入</h2><p className="mt-2 text-sm leading-6 text-[var(--color-ink-500)]">先看课程包目录，只选需要的文件。支持文本 PDF、Word、PPT、Markdown 和 TXT，单份最多 20 MB。</p></div>
      <div className="rounded-3xl border border-[var(--color-line)] bg-white p-6"><ShieldCheck className="w-5 h-5 text-[var(--color-camphor-600)]" /><h2 className="mt-3 font-bold">使用当前账号</h2><p className="mt-2 text-sm leading-6 text-[var(--color-ink-500)]">进入后将使用当前账号的身份与资料访问权限。资料由 Cramameleon 服务端解析，提问时使用相关片段。</p></div>
    </section>
    {error && <p role="alert" className="rounded-2xl border border-[var(--color-berry-100)] bg-[var(--color-berry-50)] p-4 text-sm text-[var(--color-berry-600)]">{error}</p>}
    {config && !config.enabled && <p role="status" className="text-sm text-[var(--color-ink-500)]">学习助手正在准备中，请稍后再来。</p>}
  </div>
}

export default function Cramameleon({ authorize = false }) {
  return authorize ? <AuthorizeCramameleon /> : <CramameleonLanding />
}
