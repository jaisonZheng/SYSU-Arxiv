import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  User, Mail, KeyRound, Lock, LogOut, Pencil, Copy, CheckCircle,
  FileText, Package, Download, Upload, AlertTriangle, X, Eye, EyeOff,
  ChevronRight, Sparkles, Shield
} from 'lucide-react'
import { api } from '../api/client'
import { avatarColor, avatarLetter, timeAgo, formatSize } from '../lib/format'

function compressImage(file, maxSize = 256) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const size = Math.min(img.width, img.height, maxSize)
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      const scale = Math.max(size / img.width, size / img.height)
      const w = img.width * scale
      const h = img.height * scale
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.8)
    }
    img.src = URL.createObjectURL(file)
  })
}

export default function Profile() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [quota, setQuota] = useState(null)
  const [downloads, setDownloads] = useState([])
  const [uploads, setUploads] = useState([])

  const [editingNickname, setEditingNickname] = useState(false)
  const [nicknameInput, setNicknameInput] = useState('')
  const [nicknameSaving, setNicknameSaving] = useState(false)

  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showOldPwd, setShowOldPwd] = useState(false)
  const [showNewPwd, setShowNewPwd] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)

  const [showEmailModal, setShowEmailModal] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [emailCountdown, setEmailCountdown] = useState(0)
  const [emailSaving, setEmailSaving] = useState(false)

  const [toast, setToast] = useState('')
  const avatarInputRef = useRef(null)

  const token = localStorage.getItem('token')

  useEffect(() => {
    if (!token) {
      navigate('/login?redirect=/profile')
      return
    }
    loadAll()
  }, [token, navigate])

  const loadAll = async () => {
    setLoading(true)
    setError('')
    try {
      const [meRes, quotaRes, dlRes, upRes] = await Promise.all([
        api.getMe(),
        api.getMyQuota(),
        api.getMyDownloads(),
        api.getMyUploads(),
      ])
      const u = meRes.user || meRes
      setUser(u)
      localStorage.setItem('user', JSON.stringify(u))
      setNicknameInput(u.nickname || '')
      setQuota(quotaRes)
      setDownloads(dlRes.downloads || dlRes || [])
      setUploads(upRes.uploads || upRes || [])
    } catch (e) {
      setError(e.message || '加载失败')
      if (e.message?.includes('401') || e.message?.includes('unauthorized')) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        navigate('/login?redirect=/profile')
      }
    } finally {
      setLoading(false)
    }
  }

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const blob = await compressImage(file, 256)
      const formData = new FormData()
      formData.append('avatar', blob, 'avatar.jpg')
      const res = await api.updateAvatar(formData)
      const updated = { ...user, avatar_url: res.avatar_url }
      setUser(updated)
      localStorage.setItem('user', JSON.stringify(updated))
      showToast('头像更新成功')
    } catch (err) {
      showToast(err.message || '上传失败')
    }
  }

  const handleSaveNickname = async () => {
    if (!nicknameInput.trim()) return
    setNicknameSaving(true)
    try {
      await api.updateProfile(nicknameInput.trim())
      const updated = { ...user, nickname: nicknameInput.trim() }
      setUser(updated)
      localStorage.setItem('user', JSON.stringify(updated))
      setEditingNickname(false)
      showToast('昵称已更新')
    } catch (err) {
      showToast(err.message || '保存失败')
    } finally {
      setNicknameSaving(false)
    }
  }

  const handleCopyInvite = async () => {
    const code = user?.invite_code || '000000'
    const text = `来破壁计划找资料！注册时填我的邀请码，我们都能多 3 次下载额度～\n邀请码：${code}\n注册链接：https://arxiv.jaison.ink/login`
    try {
      await navigator.clipboard.writeText(text)
      showToast('邀请信息已复制')
    } catch {
      showToast('复制失败')
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (!oldPassword || !newPassword || newPassword.length < 6) {
      showToast('密码至少 6 位')
      return
    }
    setPasswordSaving(true)
    try {
      await api.updatePassword(oldPassword, newPassword)
      setShowPasswordModal(false)
      setOldPassword('')
      setNewPassword('')
      showToast('密码修改成功')
    } catch (err) {
      showToast(err.message || '修改失败')
    } finally {
      setPasswordSaving(false)
    }
  }

  const handleSendEmailCode = async () => {
    if (!newEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      showToast('请输入正确的邮箱')
      return
    }
    if (emailCountdown > 0) return
    try {
      await api.sendCode(newEmail.trim())
      showToast('验证码已发送')
      setEmailCountdown(60)
    } catch (err) {
      showToast(err.message || '发送失败')
    }
  }

  useEffect(() => {
    if (emailCountdown <= 0) return
    const t = setTimeout(() => setEmailCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [emailCountdown])

  const handleChangeEmail = async (e) => {
    e.preventDefault()
    if (!newEmail.trim() || !emailCode.trim()) {
      showToast('请填写完整')
      return
    }
    setEmailSaving(true)
    try {
      await api.updateEmail(newEmail.trim(), emailCode.trim())
      const updated = { ...user, email: newEmail.trim() }
      setUser(updated)
      localStorage.setItem('user', JSON.stringify(updated))
      setShowEmailModal(false)
      setNewEmail('')
      setEmailCode('')
      showToast('邮箱修改成功')
    } catch (err) {
      showToast(err.message || '修改失败')
    } finally {
      setEmailSaving(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/')
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-fade-up max-w-[860px] mx-auto">
        <div className="h-[200px] rounded-3xl shimmer-bar opacity-70" />
        <div className="h-[300px] rounded-3xl shimmer-bar opacity-70" />
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="text-center py-20 max-w-[860px] mx-auto">
        <div className="text-[64px] mb-4 animate-float">🌫️</div>
        <p className="text-[--color-ink-900] font-semibold mb-1">加载失败了</p>
        <p className="text-[13.5px] text-[--color-ink-500] mb-6">{error || '请重新登录'}</p>
        <button
          onClick={() => navigate('/login')}
          className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-[--color-camphor-500] hover:bg-[--color-camphor-600] text-white text-[13.5px] font-semibold shadow-[0_8px_18px_-8px_rgba(45,106,79,0.5)] transition-all"
        >
          去登录
        </button>
      </div>
    )
  }

  const ava = user.nickname ? avatarColor(user.nickname) : avatarColor(user.email || 'U')
  const initial = avatarLetter(user.nickname || user.email || 'U')
  const used = quota?.used_quota || 0
  const total = quota?.total_quota || 3
  const remaining = quota?.remaining ?? (total - used)
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0

  return (
    <div className="flex flex-col gap-6 md:gap-8 animate-fade-up max-w-[860px] mx-auto">
      {/* ========== User Info Card ========== */}
      <section className="relative overflow-hidden rounded-[28px] border border-[--color-line] bg-gradient-to-br from-[#EEF6F0] via-white to-[#FFF6EC] px-6 md:px-9 py-7 md:py-8">
        <div className="absolute -top-10 -right-8 text-[160px] opacity-10 select-none pointer-events-none rotate-[6deg]">👤</div>
        <div className="relative flex flex-col md:flex-row items-start md:items-center gap-5">
          {/* Avatar */}
          <div className="relative group shrink-0">
            <button
              onClick={() => avatarInputRef.current?.click()}
              className="w-20 h-20 rounded-[22px] overflow-hidden border-2 border-[--color-line] hover:border-[--color-camphor-300] transition-colors shadow-[var(--shadow-sm)]"
            >
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <div
                  className="w-full h-full grid place-items-center text-[22px] font-bold"
                  style={{ background: ava.bg, color: ava.fg }}
                >
                  {initial}
                </div>
              )}
            </button>
            <div className="absolute inset-0 rounded-[22px] bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
              <Pencil className="w-5 h-5 text-white" />
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {editingNickname ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={nicknameInput}
                    onChange={(e) => setNicknameInput(e.target.value)}
                    placeholder="昵称"
                    className="h-9 px-3 bg-white border border-[--color-line] rounded-full text-[15px] font-semibold focus:border-[--color-camphor-300] focus:ring-4 focus:ring-[--color-camphor-100] transition"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveNickname}
                    disabled={nicknameSaving}
                    className="h-9 px-4 rounded-full bg-[--color-camphor-500] text-white text-[13px] font-semibold hover:bg-[--color-camphor-600] disabled:opacity-50 transition"
                  >
                    {nicknameSaving ? '保存中…' : '保存'}
                  </button>
                  <button
                    onClick={() => { setEditingNickname(false); setNicknameInput(user.nickname || '') }}
                    className="h-9 px-3 rounded-full bg-[--color-cream-100] text-[--color-ink-600] text-[13px] hover:bg-[--color-cream-200] transition"
                  >
                    取消
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-[22px] md:text-[26px] font-bold text-[--color-ink-900]" style={{ fontFamily: 'var(--font-display)' }}>
                    {user.nickname || user.email?.split('@')[0] || '同学'}
                  </h1>
                  <button
                    onClick={() => setEditingNickname(true)}
                    className="grid place-items-center w-7 h-7 rounded-full text-[--color-ink-400] hover:text-[--color-camphor-700] hover:bg-[--color-camphor-50] transition"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
            <p className="text-[13.5px] text-[--color-ink-500] mt-1 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> {user.email}
            </p>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 border border-[--color-line] text-[12.5px] font-medium text-[--color-ink-700]">
                <KeyRound className="w-3 h-3 text-[--color-honey-500]" />
                邀请码：{user.invite_code || '—'}
              </span>
              <button
                onClick={handleCopyInvite}
                className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-[--color-camphor-50] border border-[--color-camphor-200] text-[12px] font-medium text-[--color-camphor-700] hover:bg-[--color-camphor-100] transition"
              >
                <Copy className="w-3 h-3" /> 复制邀请信息
              </button>
            </div>
          </div>
        </div>

        {/* Quota bar */}
        <div className="mt-6 pt-5 border-t border-dashed border-[--color-line]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12.5px] font-semibold text-[--color-ink-700] flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5 text-[--color-camphor-500]" /> 本周下载额度
            </span>
            <span className="text-[12.5px] text-[--color-ink-500]">
              已用 <span className="font-semibold text-[--color-ink-900]">{used}</span> / 共 <span className="font-semibold text-[--color-ink-900]">{total}</span> / 剩余 <span className="font-semibold text-[--color-camphor-700]">{remaining}</span>
            </span>
          </div>
          <div className="w-full h-2.5 bg-[--color-cream-200] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[--color-camphor-400] to-[--color-camphor-500] transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </section>

      {/* ========== Actions ========== */}
      <section className="bg-white border border-[--color-line] rounded-3xl overflow-hidden shadow-[var(--shadow-xs)]">
        <div className="px-5 py-3 bg-gradient-to-r from-[--color-cream-100] to-[--color-cream-50] border-b border-[--color-line]">
          <h3 className="text-[14px] font-semibold text-[--color-ink-900] flex items-center gap-2">
            <Shield className="w-4 h-4 text-[--color-camphor-500]" /> 账号管理
          </h3>
        </div>
        <div className="divide-y divide-[--color-line-soft]">
          <button
            onClick={() => setShowPasswordModal(true)}
            className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-[--color-cream-50] transition-colors"
          >
            <span className="flex items-center gap-3 text-[13.5px] text-[--color-ink-700]">
              <Lock className="w-4 h-4 text-[--color-ink-400]" /> 修改密码
            </span>
            <ChevronRight className="w-4 h-4 text-[--color-ink-400]" />
          </button>
          <button
            onClick={() => setShowEmailModal(true)}
            className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-[--color-cream-50] transition-colors"
          >
            <span className="flex items-center gap-3 text-[13.5px] text-[--color-ink-700]">
              <Mail className="w-4 h-4 text-[--color-ink-400]" /> 修改/绑定邮箱
            </span>
            <ChevronRight className="w-4 h-4 text-[--color-ink-400]" />
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-[--color-berry-50] transition-colors"
          >
            <span className="flex items-center gap-3 text-[13.5px] text-[--color-berry-600]">
              <LogOut className="w-4 h-4" /> 退出登录
            </span>
            <ChevronRight className="w-4 h-4 text-[--color-berry-500]" />
          </button>
        </div>
      </section>

      {/* ========== Downloads ========== */}
      <section className="bg-white border border-[--color-line] rounded-3xl overflow-hidden shadow-[var(--shadow-xs)]">
        <div className="px-5 py-3 bg-gradient-to-r from-[--color-cream-100] to-[--color-cream-50] border-b border-[--color-line] flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-[--color-ink-900] flex items-center gap-2">
            <Download className="w-4 h-4 text-[--color-honey-500]" /> 下载记录
          </h3>
          <span className="text-[12px] text-[--color-ink-500]">{downloads.length} 条</span>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {downloads.length === 0 ? (
            <div className="px-5 py-8 text-center text-[13px] text-[--color-ink-500]">
              还没有下载记录，去 <Link to="/" className="text-[--color-camphor-700] font-semibold hover:underline">首页</Link> 逛逛吧
            </div>
          ) : (
            <div className="divide-y divide-[--color-line-soft]">
              {downloads.map((item, i) => {
                const isPackage = item.resource_type === 'package'
                const id = item.resource_id
                const title = item.resource_title || item.file_name || '未命名资料'
                return (
                  <Link
                    key={i}
                    to={isPackage ? `/package/${id}` : `/material/${id}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-[--color-cream-50] transition-colors"
                  >
                    <div className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${isPackage ? 'bg-[--color-honey-100] text-[--color-honey-700]' : 'bg-[--color-camphor-50] text-[--color-camphor-700]'}`}>
                      {isPackage ? <Package className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] text-[--color-ink-900] truncate font-medium">{title}</p>
                      <p className="text-[11.5px] text-[--color-ink-500]">{timeAgo(item.created_at)}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[--color-ink-300] shrink-0" />
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* ========== Uploads ========== */}
      <section className="bg-white border border-[--color-line] rounded-3xl overflow-hidden shadow-[var(--shadow-xs)]">
        <div className="px-5 py-3 bg-gradient-to-r from-[--color-cream-100] to-[--color-cream-50] border-b border-[--color-line] flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-[--color-ink-900] flex items-center gap-2">
            <Upload className="w-4 h-4 text-[--color-kapok-500]" /> 上传记录
          </h3>
          <span className="text-[12px] text-[--color-ink-500]">{uploads.length} 条</span>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {uploads.length === 0 ? (
            <div className="px-5 py-8 text-center text-[13px] text-[--color-ink-500]">
              还没有上传记录，<Link to="/upload" className="text-[--color-camphor-700] font-semibold hover:underline">分享一份资料</Link> 吧
            </div>
          ) : (
            <div className="divide-y divide-[--color-line-soft]">
              {uploads.map((item, i) => {
                const isPackage = item.resource_type === 'package'
                const id = item.resource_id
                const title = item.resource_title || item.file_name || '未命名资料'
                return (
                  <Link
                    key={i}
                    to={isPackage ? `/package/${id}` : `/material/${id}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-[--color-cream-50] transition-colors"
                  >
                    <div className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${isPackage ? 'bg-[--color-honey-100] text-[--color-honey-700]' : 'bg-[--color-camphor-50] text-[--color-camphor-700]'}`}>
                      {isPackage ? <Package className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] text-[--color-ink-900] truncate font-medium">{title}</p>
                      <p className="text-[11.5px] text-[--color-ink-500]">{timeAgo(item.created_at)} · {formatSize(item.file_size)}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[--color-ink-300] shrink-0" />
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* ========== Password Modal ========== */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 backdrop-blur-sm animate-fade-up p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-[var(--shadow-lg)] border border-[--color-line]">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[16px] font-bold text-[--color-ink-900] flex items-center gap-2">
                <Lock className="w-5 h-5 text-[--color-camphor-500]" /> 修改密码
              </h3>
              <button onClick={() => setShowPasswordModal(false)} className="w-8 h-8 rounded-full hover:bg-[--color-cream-100] grid place-items-center text-[--color-ink-500]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
              <div>
                <label className="block text-[12.5px] font-semibold text-[--color-ink-700] mb-1.5">旧密码</label>
                <div className="relative">
                  <input
                    type={showOldPwd ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="输入当前密码"
                    className="w-full h-10 px-4 pr-10 bg-[--color-cream-50] border border-[--color-line] rounded-full text-[13.5px] focus:bg-white focus:border-[--color-camphor-300] focus:ring-4 focus:ring-[--color-camphor-100] transition"
                  />
                  <button type="button" onClick={() => setShowOldPwd((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[--color-ink-400]">
                    {showOldPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[12.5px] font-semibold text-[--color-ink-700] mb-1.5">新密码</label>
                <div className="relative">
                  <input
                    type={showNewPwd ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="至少 6 位"
                    className="w-full h-10 px-4 pr-10 bg-[--color-cream-50] border border-[--color-line] rounded-full text-[13.5px] focus:bg-white focus:border-[--color-camphor-300] focus:ring-4 focus:ring-[--color-camphor-100] transition"
                  />
                  <button type="button" onClick={() => setShowNewPwd((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[--color-ink-400]">
                    {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="h-10 px-4 rounded-full bg-white border border-[--color-line] text-[13px] font-medium text-[--color-ink-700] hover:bg-[--color-cream-100]"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="h-10 px-5 rounded-full bg-[--color-camphor-500] hover:bg-[--color-camphor-600] text-white text-[13px] font-semibold shadow-[0_8px_18px_-8px_rgba(45,106,79,0.5)] disabled:opacity-50"
                >
                  {passwordSaving ? '保存中…' : '确认修改'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========== Email Modal ========== */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 backdrop-blur-sm animate-fade-up p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-[var(--shadow-lg)] border border-[--color-line]">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[16px] font-bold text-[--color-ink-900] flex items-center gap-2">
                <Mail className="w-5 h-5 text-[--color-camphor-500]" /> 修改邮箱
              </h3>
              <button onClick={() => setShowEmailModal(false)} className="w-8 h-8 rounded-full hover:bg-[--color-cream-100] grid place-items-center text-[--color-ink-500]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleChangeEmail} className="flex flex-col gap-4">
              <div>
                <label className="block text-[12.5px] font-semibold text-[--color-ink-700] mb-1.5">新邮箱</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="your@mail.sysu.edu.cn"
                  className="w-full h-10 px-4 bg-[--color-cream-50] border border-[--color-line] rounded-full text-[13.5px] focus:bg-white focus:border-[--color-camphor-300] focus:ring-4 focus:ring-[--color-camphor-100] transition"
                />
              </div>
              <div>
                <label className="block text-[12.5px] font-semibold text-[--color-ink-700] mb-1.5">验证码</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={emailCode}
                    onChange={(e) => setEmailCode(e.target.value)}
                    placeholder="6 位验证码"
                    maxLength={6}
                    className="flex-1 h-10 px-4 bg-[--color-cream-50] border border-[--color-line] rounded-full text-[13.5px] focus:bg-white focus:border-[--color-camphor-300] focus:ring-4 focus:ring-[--color-camphor-100] transition"
                  />
                  <button
                    type="button"
                    onClick={handleSendEmailCode}
                    disabled={emailCountdown > 0}
                    className="h-10 px-4 rounded-full text-[13px] font-semibold bg-[--color-camphor-500] text-white hover:bg-[--color-camphor-600] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                  >
                    {emailCountdown > 0 ? `${emailCountdown}s` : '发送验证码'}
                  </button>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="h-10 px-4 rounded-full bg-white border border-[--color-line] text-[13px] font-medium text-[--color-ink-700] hover:bg-[--color-cream-100]"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={emailSaving}
                  className="h-10 px-5 rounded-full bg-[--color-camphor-500] hover:bg-[--color-camphor-600] text-white text-[13px] font-semibold shadow-[0_8px_18px_-8px_rgba(45,106,79,0.5)] disabled:opacity-50"
                >
                  {emailSaving ? '保存中…' : '确认修改'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-up">
          <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[--color-ink-900] text-white text-[13px] font-medium shadow-[var(--shadow-lg)]">
            <CheckCircle className="w-4 h-4 text-[--color-camphor-300]" />
            {toast}
          </div>
        </div>
      )}
    </div>
  )
}
