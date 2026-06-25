import { useCallback, useEffect, useState } from 'react'
import {
  Users, UserPlus, Gift, Download, Upload,
  RefreshCw, LogOut, Shield, TrendingUp,
} from 'lucide-react'
import { api, ADMIN_TOKEN_KEY } from '../api/client'
import SectionHeading from '../components/SectionHeading'
import { LoadingShimmer } from '../components/States'
import RankingTable from '../components/RankingTable'
import TrendChart from '../components/TrendChart'
import MonitorLogin from '../components/MonitorLogin'

const loadState = {
  idle: 'idle',
  loading: 'loading',
  error: 'error',
}

export default function Monitor() {
  const [token, setToken] = useState(() => sessionStorage.getItem(ADMIN_TOKEN_KEY))
  const [loginError, setLoginError] = useState('')
  const [status, setStatus] = useState(token ? loadState.loading : loadState.idle)
  const [data, setData] = useState({
    overview: null,
    searchTop: [],
    searchEmpty: [],
    downloadsTop: [],
    trends: [],
    invitersTop: [],
  })
  const [lastUpdated, setLastUpdated] = useState(null)

  const isAuthenticated = !!token

  const loadAll = useCallback(async () => {
    setStatus(loadState.loading)
    try {
      const [
        overview,
        searchTop,
        searchEmpty,
        downloadsTop,
        trends,
        invitersTop,
      ] = await Promise.all([
        api.getAdminOverview(),
        api.getAdminSearchTop(),
        api.getAdminSearchEmpty(),
        api.getAdminDownloadsTop(),
        api.getAdminTrends(),
        api.getAdminInvitersTop(),
      ])
      setData({
        overview,
        searchTop: searchTop.items || [],
        searchEmpty: searchEmpty.items || [],
        downloadsTop: downloadsTop.items || [],
        trends: trends.items || [],
        invitersTop: invitersTop.items || [],
      })
      setLastUpdated(new Date())
      setStatus(loadState.idle)
    } catch (e) {
      if (e.status === 401 || e.status === 403) {
        sessionStorage.removeItem(ADMIN_TOKEN_KEY)
        setToken(null)
        setLoginError('登录已过期，请重新输入密码')
      }
      setStatus(loadState.error)
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return
    // Intentional: load dashboard data on auth state change; loadAll is async and gates its own state updates.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll()
  }, [isAuthenticated, loadAll])

  const handleLogin = async (password) => {
    setLoginError('')
    try {
      const res = await api.adminLogin(password)
      sessionStorage.setItem(ADMIN_TOKEN_KEY, res.token)
      setToken(res.token)
    } catch (e) {
      setLoginError(e.message || '密码错误')
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY)
    setToken(null)
    setData({
      overview: null,
      searchTop: [],
      searchEmpty: [],
      downloadsTop: [],
      trends: [],
      invitersTop: [],
    })
  }

  if (!isAuthenticated) {
    return <MonitorLogin onLogin={handleLogin} error={loginError} />
  }

  const overview = data.overview || {}

  return (
    <div className="flex flex-col gap-6 md:gap-8 max-w-[1280px] mx-auto px-4 pb-12">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <SectionHeading
          kicker="ADMIN"
          title="监控面板"
          hint="系统实时数据概览"
          accent="camphor"
        />
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-[12px] text-[--color-ink-400]">
              更新于 {lastUpdated.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <button
            onClick={loadAll}
            disabled={status === loadState.loading}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-white border border-[--color-line] text-[--color-ink-700] hover:bg-[--color-cream-50] hover:border-[--color-camphor-200] transition-colors text-[13px] font-medium disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${status === loadState.loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-white border border-[--color-line] text-[--color-ink-700] hover:bg-[--color-berry-50] hover:border-[--color-berry-100] hover:text-[--color-berry-600] transition-colors text-[13px] font-medium"
          >
            <LogOut className="w-4 h-4" />
            退出
          </button>
        </div>
      </div>

      {status === loadState.loading && !data.overview ? (
        <LoadingShimmer rows={6} />
      ) : status === loadState.error && !data.overview ? (
        <div className="p-8 text-center bg-white border border-[--color-line] rounded-3xl text-[--color-ink-500]">
          数据加载失败，请重试
        </div>
      ) : (
        <>
          {/* Overview cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard
              label="总注册"
              value={overview.total_users || 0}
              suffix="人"
              icon={Users}
              tone="camphor"
            />
            <StatCard
              label="今日新增"
              value={overview.new_users_today || 0}
              suffix="人"
              icon={UserPlus}
              tone="honey"
            />
            <StatCard
              label="本周新增"
              value={overview.new_users_this_week || 0}
              suffix="人"
              icon={TrendingUp}
              tone="camphor"
            />
            <StatCard
              label="邀请使用"
              value={overview.invited_users || 0}
              suffix="人"
              icon={Gift}
              tone="kapok"
            />
            <StatCard
              label="总下载"
              value={overview.total_downloads || 0}
              suffix="次"
              icon={Download}
              tone="honey"
            />
            <StatCard
              label="总上传"
              value={overview.total_uploads || 0}
              suffix="份"
              icon={Upload}
              tone="mist"
            />
          </div>

          {/* Trends */}
          <section className="bg-white border border-[--color-line] rounded-3xl p-5 shadow-[var(--shadow-xs)]">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-[--color-camphor-500]" />
              <h3 className="text-[14px] font-semibold text-[--color-ink-900]">近 30 天趋势</h3>
            </div>
            <TrendChart data={data.trends} />
          </section>

          {/* Search rankings */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <RankingTable
              title="搜索热榜前 50"
              items={data.searchTop.map((item) => ({ ...item, key: item.query }))}
              emptyHint="还没有搜索记录"
              tone="honey"
              columns={[
                { key: 'rank', label: '排名', className: 'w-12 text-center', render: (_, idx) => idx + 1 },
                { key: 'query', label: '搜索词' },
                { key: 'count', label: '次数', className: 'w-20 text-right tabular-nums' },
              ]}
            />
            <RankingTable
              title="无结果搜索前 50"
              items={data.searchEmpty.map((item) => ({ ...item, key: item.query }))}
              emptyHint="暂无无结果搜索"
              tone="kapok"
              columns={[
                { key: 'rank', label: '排名', className: 'w-12 text-center', render: (_, idx) => idx + 1 },
                { key: 'query', label: '搜索词' },
                { key: 'count', label: '次数', className: 'w-20 text-right tabular-nums' },
              ]}
            />
          </div>

          {/* Download ranking */}
          <RankingTable
            title="资源下载热度榜前 50"
            items={data.downloadsTop.map((item) => ({ ...item, key: `${item.type}-${item.id}` }))}
            emptyHint="还没有下载记录"
            tone="honey"
            maxHeight="520px"
            columns={[
              { key: 'rank', label: '排名', className: 'w-12 text-center', render: (_, idx) => idx + 1 },
              { key: 'title', label: '资源名称' },
              { key: 'type', label: '类型', className: 'w-24', render: (item) => (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${item.type === 'package' ? 'bg-[--color-honey-100] text-[--color-honey-700]' : 'bg-[--color-camphor-100] text-[--color-camphor-700]'}`}>
                  {item.type === 'package' ? '课程包' : '资料'}
                </span>
              ) },
              { key: 'download_count', label: '下载量', className: 'w-24 text-right tabular-nums' },
            ]}
          />

          {/* Inviters ranking */}
          <RankingTable
            title="邀请达人榜前 50"
            items={data.invitersTop.map((item) => ({ ...item, key: item.inviter_id }))}
            emptyHint="还没有邀请记录"
            tone="camphor"
            columns={[
              { key: 'rank', label: '排名', className: 'w-12 text-center', render: (_, idx) => idx + 1 },
              { key: 'inviter_email', label: '邀请人邮箱' },
              { key: 'invite_count', label: '邀请数', className: 'w-24 text-right tabular-nums' },
            ]}
          />

          {/* Footer note */}
          <div className="flex items-center gap-2 text-[12px] text-[--color-ink-400]">
            <Shield className="w-3.5 h-3.5" />
            仅管理员可访问此页面 · 数据每日凌晨自动滚动累计
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({ label, value, suffix, icon: Icon, tone }) {
  const toneMap = {
    camphor: 'from-[--color-camphor-100] to-[--color-camphor-50] text-[--color-camphor-600]',
    honey: 'from-[--color-honey-100] to-[--color-honey-50] text-[--color-honey-600]',
    kapok: 'from-[--color-kapok-100] to-[--color-kapok-50] text-[--color-kapok-600]',
    mist: 'from-[--color-mist-100] to-[--color-mist-50] text-[--color-mist-600]',
  }
  return (
    <div className="bg-white border border-[--color-line] rounded-2xl p-4 shadow-[var(--shadow-xs)] flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${toneMap[tone]} grid place-items-center shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] text-[--color-ink-500] mb-0.5">{label}</div>
        <div className="text-[18px] font-bold text-[--color-ink-900] tabular-nums truncate">
          {value.toLocaleString('zh-CN')}
          <span className="text-[11px] font-medium text-[--color-ink-400] ml-0.5">{suffix}</span>
        </div>
      </div>
    </div>
  )
}
