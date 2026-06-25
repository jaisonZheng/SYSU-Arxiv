import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Trophy, Download, Package, FileText } from 'lucide-react'
import { api } from '../api/client'
import SectionHeading from '../components/SectionHeading'
import { LoadingShimmer, EmptyState } from '../components/States'

export default function HotRanking() {
  const navigate = useNavigate()
  const [packages, setPackages] = useState([])
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [pkgs, mats] = await Promise.all([
          api.listPackages({ page_size: 20, sort_by: 'download_count' }).catch(() => null),
          api.listMaterials({ page_size: 20, sort_by: 'download_count' }).catch(() => null),
        ])
        setPackages(pkgs?.items || [])
        setMaterials(mats?.items || [])
      } catch (e) {
        console.error('Failed to load rankings:', e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  return (
    <div className="flex flex-col gap-8 md:gap-10">
      {/* 面包屑 */}
      <nav className="flex items-center gap-2 text-[12.5px] text-[--color-ink-500]">
        <button onClick={() => navigate('/')} className="hover:text-[--color-camphor-700] transition-colors">首页</button>
        <span>/</span>
        <span className="text-[--color-ink-900]">热门排行榜</span>
      </nav>

      {/* 标题说明 */}
      <section className="relative overflow-hidden rounded-[28px] border border-[--color-line] bg-gradient-to-br from-[#FFF6EC] to-[#FFE6CB] px-6 md:px-9 py-7 md:py-8">
        <div className="absolute -top-10 -right-8 text-[180px] opacity-15 select-none pointer-events-none rotate-[6deg]">🏆</div>
        <div className="relative">
          <span className="text-[11.5px] uppercase tracking-[0.22em] font-semibold text-[--color-honey-700]">
            排行榜说明
          </span>
          <h1 className="text-[26px] md:text-[34px] font-bold tracking-tight text-[--color-ink-900] leading-[1.15] mt-2 mb-3" style={{ fontFamily: 'var(--font-display)' }}>
            今日热门是怎么算出来的？
          </h1>
          <p className="text-[14.5px] text-[--color-ink-700] max-w-2xl leading-relaxed">
            「今日热门」按课程包的总下载次数（download_count）降序排列，取前 8 名展示。
            名字里的「今日」更像一句招呼，并非只统计当天。
          </p>
        </div>
      </section>

      {/* 两个榜单 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* 热门课程包 */}
        <section>
          <SectionHeading
            kicker="TOP 20"
            title="热门课程包"
            hint="按下载次数排序"
            accent="honey"
          />
          {loading ? (
            <LoadingShimmer rows={5} />
          ) : packages.length === 0 ? (
            <EmptyState emoji="🎁" title="暂无课程包" hint="还没有人上传课程包" />
          ) : (
            <div className="bg-white border border-[--color-line] rounded-3xl overflow-hidden shadow-[var(--shadow-xs)]">
              <div className="divide-y divide-[--color-line-soft]">
                {packages.map((pkg, i) => (
                  <RankingItem
                    key={pkg.id}
                    rank={i + 1}
                    title={pkg.course_name || pkg.title}
                    count={pkg.download_count || 0}
                    icon={<Package className="w-4 h-4" />}
                    onClick={() => navigate(`/package/${pkg.id}`)}
                  />
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 热门单资料 */}
        <section>
          <SectionHeading
            kicker="TOP 20"
            title="热门单资料"
            hint="按下载次数排序"
            accent="camphor"
          />
          {loading ? (
            <LoadingShimmer rows={5} />
          ) : materials.length === 0 ? (
            <EmptyState emoji="📄" title="暂无资料" hint="还没有人上传资料" />
          ) : (
            <div className="bg-white border border-[--color-line] rounded-3xl overflow-hidden shadow-[var(--shadow-xs)]">
              <div className="divide-y divide-[--color-line-soft]">
                {materials.map((m, i) => (
                  <RankingItem
                    key={m.id}
                    rank={i + 1}
                    title={m.title}
                    count={m.download_count || 0}
                    icon={<FileText className="w-4 h-4" />}
                    onClick={() => navigate(`/material/${m.id}`)}
                  />
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function RankingItem({ rank, title, count, icon, onClick }) {
  const rankColor = rank <= 3
    ? 'bg-gradient-to-br from-[--color-honey-300] to-[--color-kapok-300] text-white'
    : 'bg-[--color-cream-100] text-[--color-ink-500]'

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-[--color-cream-50] transition-colors"
    >
      <span className={`w-7 h-7 rounded-lg grid place-items-center text-[12px] font-bold shrink-0 ${rankColor}`}>
        {rank}
      </span>
      <span className="text-[--color-ink-400] shrink-0">{icon}</span>
      <span className="flex-1 text-[13.5px] font-medium text-[--color-ink-900] truncate text-left">
        {title}
      </span>
      <span className="inline-flex items-center gap-1 text-[12px] text-[--color-ink-500] shrink-0">
        <Download className="w-3.5 h-3.5" />
        {count}
      </span>
    </button>
  )
}
