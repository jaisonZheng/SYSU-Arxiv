import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, Sparkles, ArrowRight, FileText, BookOpen, Package, Clock, Heart,
  Coffee, Sun
} from 'lucide-react'
import { api } from '../api/client'
import AnimatedCounter from '../components/AnimatedCounter'
import ResourceCard from '../components/ResourceCard'
import SectionHeading, { ViewAllLink } from '../components/SectionHeading'
import Mascot from '../components/Mascot'
import { EmptyState, LoadingBubble, LoadingShimmer } from '../components/States'
import {
  greet, timeAgo, formatSize, avatarLetter, avatarColor, categoryMeta,
} from '../lib/format'

const heroTags = [
  { label: '历年真题', emoji: '📝', to: '/past-exams' },
  { label: '学习笔记', emoji: '✍️', to: '/study-materials?sub_category=notes' },
  { label: '完整课程包', emoji: '🎁', to: '/course-packages' },
  { label: '复习总结', emoji: '🌟', to: '/study-materials?sub_category=summary' },
]

export default function Home() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [packages, setPackages] = useState([])
  const [recentMaterials, setRecentMaterials] = useState([])
  const [stats, setStats] = useState({ exams: 0, materials: 0, packages: 0 })
  const [totalDownloads, setTotalDownloads] = useState(0)
  const [totalUploads, setTotalUploads] = useState(0)
  const [totalThanks, setTotalThanks] = useState(0)
  const [contributors, setContributors] = useState([])
  const [loading, setLoading] = useState(true)

  const hello = useMemo(() => greet(), [])

  useEffect(() => {
    let cancelled = false
    const loadData = async () => {
      setLoading(true)
      const safe = (p) => p.catch(() => null)
      const [pkgs, recent, exams, mats, dls, ups, thx] = await Promise.all([
        safe(api.listPackages({ page_size: 8, sort_by: 'download_count' })),
        safe(api.listMaterials({ page_size: 6, sort_by: 'created_at' })),
        safe(api.listMaterials({ category: 'past_exam', page_size: 1 })),
        safe(api.listMaterials({ category: 'study_material', page_size: 1 })),
        safe(api.getTotalDownloads()),
        safe(api.getTotalUploads()),
        safe(api.getTotalThanks()),
      ])
      if (cancelled) return
      setPackages(pkgs?.items || [])
      setRecentMaterials(recent?.items || [])
      setStats({
        exams:    exams?.total    || 0,
        materials: mats?.total    || 0,
        packages: pkgs?.total     || 0,
      })
      setTotalDownloads(dls?.total_downloads ?? 0)
      setTotalUploads(ups?.total_uploads ?? 0)
      setTotalThanks(thx?.total_thanks ?? 0)

      // 从最近上传里提取贡献者
      const seen = new Map()
      ;(recent?.items || []).forEach((m) => {
        const name = m.uploader_name || '匿名同学'
        if (!seen.has(name)) seen.set(name, { name, count: 0, latest: m.created_at })
        seen.get(name).count += 1
      })
      ;(pkgs?.items || []).forEach((p) => {
        const name = p.uploader_name || (p.source_type === 'github' ? 'SYSU_Notebook' : 'Jaison')
        if (!seen.has(name)) seen.set(name, { name, count: 0, latest: p.created_at })
        seen.get(name).count += 1
      })
      setContributors(Array.from(seen.values()).slice(0, 8))
      setLoading(false)
    }
    loadData()
    return () => { cancelled = true }
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    if (search.trim()) navigate(`/past-exams?search=${encodeURIComponent(search.trim())}`)
  }

  /* ========================================================
   *  Hero
   * ======================================================== */
  return (
    <div className="flex flex-col gap-12 md:gap-16 animate-fade-up">
      <section className="relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* 左侧 文案 */}
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 border border-[--color-line] text-[12.5px] font-medium text-[--color-ink-700] mb-5 backdrop-blur-md">
              <Sun className="w-3.5 h-3.5 text-[--color-honey-500]" />
              <span className="hidden sm:inline">{hello.hi}，欢迎回到角落</span>
              <span className="sm:hidden">{hello.hi}</span>
              <span className="text-[--color-ink-300]">·</span>
              <span className="text-[--color-ink-500]">{hello.sub}</span>
            </div>

            <h1
              className="text-[34px] md:text-[52px] font-extrabold tracking-tight text-[--color-ink-900] leading-[1.05] mb-4"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              一份笔记，
              <span className="relative inline-block">
                <span className="relative z-10 text-[--color-camphor-700]">少熬一夜</span>
                <span className="absolute left-0 right-0 bottom-1 h-3 bg-[--color-honey-200] -z-0 rounded-sm" />
              </span>
              <br />
              一起把信息差，
              <span className="text-[--color-kapok-400]">抹平 ✨</span>
            </h1>

            <p className="text-[15.5px] md:text-[16.5px] text-[--color-ink-500] leading-relaxed max-w-xl mb-7">
              这是<span className="text-[--color-ink-900] font-semibold">中山大学同学之间</span>的资料分享小角落 ——
              不收一分钱，靠彼此的善意运转。把你手里的好东西，传递给后面的人。
            </p>

            {/* 搜索 */}
            <form onSubmit={handleSearch} className="relative mb-5 max-w-xl">
              <div className="absolute inset-0 -m-[2px] rounded-full bg-gradient-to-r from-[--color-camphor-300] via-[--color-honey-300] to-[--color-kapok-300] opacity-30 blur-sm" />
              <div className="relative flex items-center bg-white border border-[--color-line] rounded-full shadow-[var(--shadow-sm)] focus-within:shadow-[var(--shadow)] transition-shadow">
                <Search className="absolute left-5 w-5 h-5 text-[--color-ink-400]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="想找什么？比如「数据结构 真题」「操作系统 笔记」"
                  className="w-full h-14 pl-14 pr-32 bg-transparent text-[15px] placeholder-[--color-ink-400] focus:outline-none"
                />
                <button
                  type="submit"
                  className="absolute right-2 inline-flex items-center gap-1.5 h-11 px-5 rounded-full bg-[--color-camphor-500] hover:bg-[--color-camphor-600] text-white text-sm font-semibold transition-colors shadow-[0_8px_18px_-8px_rgba(45,106,79,0.5)]"
                >
                  开始翻找
                </button>
              </div>
            </form>

            {/* 标签快捷 */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[12.5px] text-[--color-ink-400]">大家在找：</span>
              {heroTags.map((t) => (
                <button
                  key={t.label}
                  onClick={() => navigate(t.to)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[--color-line] text-[13px] text-[--color-ink-700] hover:border-[--color-camphor-300] hover:text-[--color-camphor-700] hover:bg-[--color-camphor-50] transition-all"
                >
                  <span className="text-[14px]">{t.emoji}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* 右侧 视觉 */}
          <div className="lg:col-span-5 relative">
            <HeroVisual hello={hello} packages={packages} contributors={contributors} />
          </div>
        </div>
      </section>

      {/* ====== 三个分类大卡 ====== */}
      <section>
        <SectionHeading
          kicker="想找什么"
          title="今天来角落里看看？"
          hint="按分类挑一个开始 ——  挑到了好的，记得也上传一份。"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
          <CategoryCard
            to="/course-packages"
            tone="honey"
            kicker="一站式"
            title="课程资源包"
            desc="按整门课打包，课件、真题、作业一起带走 🎁"
            stat={`${stats.packages} 门课程`}
            count={stats.packages}
          />
          <CategoryCard
            to="/past-exams"
            tone="kapok"
            kicker="考前必看"
            title="历年真题"
            desc="期末别裸考 —— 从去年的卷子里偷点灵感 📝"
            stat={`${stats.exams} 份真题`}
            count={stats.exams}
          />
          <CategoryCard
            to="/study-materials"
            tone="camphor"
            kicker="日常充电"
            title="学习资料"
            desc="同学们整理的笔记、课件与总结，常常比教材清晰 ✍️"
            stat={`${stats.materials} 份资料`}
            count={stats.materials}
          />
        </div>
      </section>

      {/* ====== 共度时光 / 计数 ====== */}
      <section>
        <SectionHeading
          kicker="今天又一起"
          title="少熬了 X 个夜"
          hint="所有数字都在小幅跳动 —— 每一次加一，背后是一位同学少熬一夜。"
          accent="honey"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
          <AnimatedCounter
            value={totalDownloads}
            label="累计被收下"
            hint="同学们已经从这里搬走了多少份资料"
            suffix="次"
            tone="honey"
            pad={6}
          />
          <AnimatedCounter
            value={stats.packages + stats.exams + stats.materials}
            label="角落里现在有"
            hint="背后是无数次「我也传一份」"
            suffix="份"
            tone="camphor"
            pad={5}
          />
          <AnimatedCounter
            value={totalThanks}
            label="累计被感谢"
            hint="每一次「少熬一夜」都是真心的"
            suffix="次"
            tone="kapok"
            pad={5}
          />
        </div>
      </section>

      {/* ====== 热门课程包 ====== */}
      <section>
        <SectionHeading
          kicker="今日热门"
          title="同学们最常翻的课程包"
          hint="按下载次数排，越往前越是「考前救命级」"
          action={<ViewAllLink onClick={() => navigate('/course-packages')}>更多课程包</ViewAllLink>}
          accent="honey"
        />
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-[200px] rounded-3xl shimmer-bar opacity-70" />)}
          </div>
        ) : packages.length === 0 ? (
          <EmptyState emoji="🎁" title="暂时还没有课程包" hint="把整门课的资料打包成 zip 上传，让学弟学妹一键搞定。"
            action={<button onClick={() => navigate('/upload')} className="btn-primary hover:btn-primary-hover">分享一份</button>}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {packages.slice(0, 8).map((pkg, i) => (
              <PackageCard key={pkg.id} pkg={pkg} index={i} onClick={() => navigate(`/package/${pkg.id}`)} />
            ))}
          </div>
        )}
      </section>

      {/* ====== 刚刚的分享 ====== */}
      <section>
        <SectionHeading
          kicker="刚刚发生"
          title="角落里最新的几份心意"
          hint="按时间倒序 —— 最上面的是几分钟前刚被放下的 ✨"
          action={<ViewAllLink onClick={() => navigate('/study-materials')}>看更多动态</ViewAllLink>}
          accent="camphor"
        />
        {loading ? (
          <LoadingShimmer rows={3} />
        ) : recentMaterials.length === 0 ? (
          <EmptyState emoji="🌱" title="角落里还很安静" hint="等待第一份心意 —— 也许是你的笔记？"
            action={<button onClick={() => navigate('/upload')} className="btn-primary hover:btn-primary-hover">分享一份</button>}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {recentMaterials.slice(0, 6).map((m) => <ResourceCard key={m.id} material={m} />)}
          </div>
        )}
      </section>

      {/* ====== 致谢 ====== */}
      <section className="relative">
        <div className="rounded-3xl bg-gradient-to-br from-[--color-cream-100] via-white to-[--color-camphor-50] p-8 md:p-10 overflow-hidden relative shadow-[var(--shadow-sm)]">
          <div className="absolute -top-12 -right-10 text-[180px] opacity-10 select-none pointer-events-none">🤝</div>
          <div className="relative">
            <p className="inline-flex items-center gap-2 text-[12.5px] uppercase tracking-[0.22em] font-semibold text-[--color-camphor-600] mb-3">
              <Heart className="w-3.5 h-3.5" /> 致最近的贡献者们
            </p>
            <h2 className="text-[24px] md:text-[28px] font-bold tracking-tight text-[--color-ink-900] leading-tight max-w-xl mb-2" style={{ fontFamily: 'var(--font-display)' }}>
              这些名字让今天的角落更暖一点
            </h2>
            <p className="text-[14px] text-[--color-ink-500] mb-6 max-w-xl">
              没有他们就没有这个角落。下次你也可以在这里。
            </p>
            <div className="flex items-start gap-3 flex-wrap">
              {contributors.length === 0 ? (
                <p className="text-sm text-[--color-ink-400]">还在等第一位贡献者…</p>
              ) : contributors.map((c) => {
                const ava = avatarColor(c.name)
                return (
                  <div key={c.name} className="flex items-center gap-2.5 bg-white/85 backdrop-blur-sm border border-[--color-line] rounded-full pl-1.5 pr-3.5 py-1.5">
                    <span className="w-7 h-7 rounded-full grid place-items-center text-[12px] font-bold" style={{ background: ava.bg, color: ava.fg }}>
                      {avatarLetter(c.name)}
                    </span>
                    <span className="text-[13px] font-medium text-[--color-ink-900]">{c.name}</span>
                    <span className="text-[11px] text-[--color-ink-400]">+{c.count}</span>
                  </div>
                )
              })}
            </div>

            <div className="mt-7 flex items-center gap-3">
              <button
                onClick={() => navigate('/upload')}
                className="inline-flex items-center gap-2 h-11 px-5 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-[--color-honey-400] to-[--color-kapok-400] shadow-[0_12px_28px_-12px_rgba(244,125,44,0.55)] hover:scale-[1.03] transition-transform"
              >
                <Sparkles className="w-4 h-4" /> 我也来分享一份
              </button>
              <button
                onClick={() => navigate('/help')}
                className="inline-flex items-center gap-2 h-11 px-5 rounded-full text-sm font-medium text-[--color-ink-700] bg-white border border-[--color-line] hover:bg-[--color-cream-100]"
              >
                了解角落 <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

/* ============================================================
 * 子组件：Hero 视觉装饰
 * ============================================================ */
function HeroVisual({ hello, packages, contributors }) {
  const featured = packages[0]
  const c1 = contributors[0]
  const c2 = contributors[1]
  return (
    <div className="relative h-[340px] md:h-[420px] flex items-center justify-center">
      {/* 橘猫主体 - 占据右侧整块 */}
      <div className="relative animate-float" style={{ filter: 'drop-shadow(0 18px 30px rgba(120,60,20,0.18))' }}>
        <Mascot size={280} variant={hello.mascot} />
        {hello.mascotLabel && (
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white/90 backdrop-blur-sm border border-[--color-line] rounded-full px-3.5 py-1.5 text-[12px] font-semibold text-[--color-ink-700] shadow-[var(--shadow-xs)]">
            {hello.mascotLabel}
          </span>
        )}
      </div>

      {/* 浮卡 1：今日推荐 */}
      {featured && (
        <div className="absolute top-2 left-0 md:left-[-14px] bg-white rounded-2xl shadow-[var(--shadow)] border border-[--color-line] p-3 pr-4 max-w-[230px] animate-float" style={{ animationDelay: '0.4s' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[--color-honey-200] to-[--color-honey-300] grid place-items-center text-lg shrink-0">🎁</div>
            <div className="min-w-0">
              <p className="text-[10.5px] font-semibold text-[--color-honey-600] uppercase tracking-wider">今日热门</p>
              <p className="text-[13px] font-semibold text-[--color-ink-900] truncate" title={featured.title}>{featured.course_name || featured.title}</p>
            </div>
          </div>
        </div>
      )}

      {/* 浮卡 2：贡献者（桌面端显示，手机端隐藏避免遮挡） */}
      {c1 && (
        <div className="hidden md:block absolute bottom-4 right-0 md:right-[-12px] bg-white rounded-2xl shadow-[var(--shadow)] border border-[--color-line] p-3.5 max-w-[240px] animate-float" style={{ animationDelay: '1.2s' }}>
          <div className="flex items-center gap-2 mb-2">
            <Heart className="w-3.5 h-3.5 text-[--color-kapok-400]" />
            <p className="text-[10.5px] font-semibold text-[--color-kapok-500] uppercase tracking-wider">谢谢同学们</p>
          </div>
          <div className="flex items-center -space-x-2">
            {[c1, c2].filter(Boolean).map((c) => {
              const ava = avatarColor(c.name)
              return (
                <span key={c.name} className="w-7 h-7 rounded-full grid place-items-center text-[11.5px] font-bold ring-2 ring-white" style={{ background: ava.bg, color: ava.fg }}>
                  {avatarLetter(c.name)}
                </span>
              )
            })}
            <span className="ml-3 text-[12.5px] text-[--color-ink-700]">最近又有人来分享 ✨</span>
          </div>
        </div>
      )}

    </div>
  )
}

/* 三个分类大卡 */
function CategoryCard({ to, tone, kicker, title, desc, stat }) {
  const navigate = useNavigate()
  const palettes = {
    honey:   { bg: 'from-[#FFF6EC] to-[#FFE6CB]', dot: 'bg-[--color-honey-400]', kicker: 'text-[--color-honey-700]', emoji: '🎁' },
    kapok:   { bg: 'from-[#FFEFE9] to-[#FFD5C7]', dot: 'bg-[--color-kapok-400]', kicker: 'text-[--color-kapok-500]', emoji: '📝' },
    camphor: { bg: 'from-[#EEF6F0] to-[#D6E9DA]', dot: 'bg-[--color-camphor-500]', kicker: 'text-[--color-camphor-700]', emoji: '✍️' },
  }
  const p = palettes[tone] || palettes.honey
  return (
    <button
      onClick={() => navigate(to)}
      className={`group relative overflow-hidden rounded-3xl bg-gradient-to-br ${p.bg} p-6 md:p-7 text-left shadow-[var(--shadow-sm)] transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[var(--shadow-lg)]`}
    >
      <div className="absolute -top-8 -right-6 text-[140px] opacity-15 select-none pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:rotate-[6deg]">
        {p.emoji}
      </div>
      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
          <span className={`text-[11px] uppercase tracking-[0.22em] font-semibold ${p.kicker}`}>{kicker}</span>
        </div>
        <h3 className="text-[22px] font-bold tracking-tight text-[--color-ink-900] mb-2" style={{ fontFamily: 'var(--font-display)' }}>{title}</h3>
        <p className="text-[13.5px] text-[--color-ink-700] leading-relaxed mb-6 max-w-[18rem]">{desc}</p>
        <div className="flex items-center justify-between">
          <span className="text-[12.5px] text-[--color-ink-500] tabular-nums">{stat}</span>
          <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-[--color-ink-900] group-hover:gap-2 transition-all">
            进去看看 <ArrowRight className="w-4 h-4" />
          </span>
        </div>
      </div>
    </button>
  )
}

/* 单个 课程包 卡片 */
function PackageCard({ pkg, index, onClick }) {
  const tones = ['honey', 'camphor', 'kapok', 'mist']
  const tone = tones[index % tones.length]
  const p = {
    honey:   { bg: 'from-[#FFF6EC] to-[#FFE6CB]', emoji: '📚', accent: 'text-[--color-honey-700]' },
    camphor: { bg: 'from-[#EEF6F0] to-[#D6E9DA]', emoji: '🌿', accent: 'text-[--color-camphor-700]' },
    kapok:   { bg: 'from-[#FFEFE9] to-[#FFD5C7]', emoji: '🌺', accent: 'text-[--color-kapok-500]' },
    mist:    { bg: 'from-[#EEF3F8] to-[#D4E0EC]', emoji: '🪶', accent: 'text-[--color-mist-500]' },
  }[tone]
  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden rounded-3xl bg-gradient-to-br ${p.bg} p-5 text-left shadow-[var(--shadow-sm)] transition-all duration-500 hover:-translate-y-1 hover:shadow-[var(--shadow-lg)]`}
    >
      <div className="absolute -top-3 -right-3 text-[64px] opacity-20 group-hover:scale-110 transition-transform duration-500">{p.emoji}</div>
      <div className="relative">
        <p className={`text-[10.5px] uppercase tracking-[0.18em] font-semibold ${p.accent} mb-1`}>课程包 · {pkg.source_type === 'github' ? 'GitHub' : pkg.source_type === 'lanzou' ? '蓝奏云' : '社区'}</p>
        <h3 className="text-[16px] font-bold text-[--color-ink-900] line-clamp-2 leading-snug mb-2" style={{ fontFamily: 'var(--font-display)' }}>
          {pkg.course_name || pkg.title}
        </h3>
        <p className="text-[12.5px] text-[--color-ink-500] line-clamp-2 leading-relaxed mb-4">{pkg.description || '这门课的全套资料，挑你需要的'}</p>
        <div className="flex items-center justify-between text-[12px] text-[--color-ink-700]">
          <span className="inline-flex items-center gap-1">
            <Package className="w-3.5 h-3.5" /> {pkg.total_files || '?'} 个文件
          </span>
          <span className="inline-flex items-center gap-1 font-semibold">
            收下 <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </button>
  )
}
