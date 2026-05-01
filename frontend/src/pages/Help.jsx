import { useNavigate } from 'react-router-dom'
import {
  Heart, Copyright, Upload as UploadIcon, MessageSquare, Code,
  Sparkles, Mail, ArrowRight, Coffee, Leaf,
} from 'lucide-react'
import { Github } from '../components/icons'

const sections = [
  {
    icon: Heart,
    title: '为什么会有这个角落',
    tone: 'kapok',
    body: (
      <p>
        每到期中期末，总会看到同学在校园群里到处问资料，也时常碰见有「倒狗」高价倒卖原本是同学们好心整理的笔记 ——
        本来是免费的善意，被赋上了价签。<br /><br />
        所以在某个周末顺手搭了这个网站，希望中大的师生能多一个可以彼此分享的小角落。
        <span className="text-[--color-ink-900] font-semibold">把信息差抹平，福泽后人。</span>
      </p>
    ),
  },
  {
    icon: Copyright,
    title: '版权这件事',
    tone: 'mist',
    body: (
      <p>
        本网站不持有任何上传资料的版权 —— 资料都属于其原作者 / 整理者。
        所有资料仅供学习交流使用，<span className="text-[--color-ink-900] font-semibold">严禁倒卖或任何商业用途</span>。
        如果你看到自己的内容希望取下，发个邮件，立刻处理。
      </p>
    ),
  },
  {
    icon: UploadIcon,
    title: '上传一份资料 · 注意什么',
    tone: 'honey',
    body: (
      <ul className="list-none space-y-1.5 text-[--color-ink-700]">
        <li>• 大家自行上传，所有人皆可下载，欢迎任何对学弟学妹有用的内容</li>
        <li>• 请<span className="text-[--color-ink-900] font-semibold">不要</span>上传违法违规、含个人隐私的文件</li>
        <li>• ZIP 上传会被自动识别为「课程资源包」，整门课的全套资料一次性带走</li>
        <li>• 留下你的名字（可选）会被显示在首页致谢里</li>
      </ul>
    ),
  },
  {
    icon: MessageSquare,
    title: '反馈与建议',
    tone: 'camphor',
    body: (
      <p>
        前端 / 后端的 bug 与改进，欢迎在 GitHub 上提 Issue 或 PR。
        其它问题或资料下架请求，发邮件到 <span className="text-[--color-camphor-700] font-semibold">zhengzsh5@mail2.sysu.edu.cn</span>，看到就回。
      </p>
    ),
  },
]

const tonePalettes = {
  kapok:   { bg: 'from-[#FFEFE9] to-[#FFD5C7]', icon: 'bg-[--color-kapok-100] text-[--color-kapok-500]', kicker: 'text-[--color-kapok-500]' },
  mist:    { bg: 'from-[#EEF3F8] to-[#D4E0EC]', icon: 'bg-[--color-mist-100] text-[--color-mist-500]', kicker: 'text-[--color-mist-500]' },
  honey:   { bg: 'from-[#FFF6EC] to-[#FFE6CB]', icon: 'bg-[--color-honey-100] text-[--color-honey-700]', kicker: 'text-[--color-honey-700]' },
  camphor: { bg: 'from-[#EEF6F0] to-[#D6E9DA]', icon: 'bg-[--color-camphor-100] text-[--color-camphor-700]', kicker: 'text-[--color-camphor-700]' },
}

export default function Help() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col gap-8 md:gap-10 max-w-[840px] mx-auto animate-fade-up">
      {/* ============== Hero ============== */}
      <section className="relative overflow-hidden rounded-[28px] border border-[--color-line] bg-gradient-to-br from-[--color-cream-100] via-white to-[--color-camphor-50] px-6 md:px-9 py-8 md:py-10">
        <div className="absolute -top-10 -right-8 text-[180px] opacity-15 select-none pointer-events-none animate-float">🌱</div>
        <div className="relative max-w-2xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-block w-6 h-px bg-[--color-camphor-500]" />
            <span className="text-[11.5px] uppercase tracking-[0.22em] font-semibold text-[--color-camphor-700]">
              About · 关于角落
            </span>
          </div>
          <h1 className="text-[28px] md:text-[36px] font-bold tracking-tight text-[--color-ink-900] leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
            一个小角落，<br />
            想让<span className="text-[--color-camphor-700]">资料</span>回到<span className="text-[--color-kapok-400]">免费</span>的样子
          </h1>
          <p className="text-[14.5px] text-[--color-ink-700] mt-4 leading-relaxed">
            这是中山大学同学之间的资料分享小角落 —— 不收一分钱，靠彼此的善意运转。
            <br />
            <span className="text-[--color-ink-500]">收下了别忘记，自己有空也回传一份。</span>
          </p>
        </div>
      </section>

      {/* ============== 卡片列表 ============== */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
        {sections.map((s) => {
          const palette = tonePalettes[s.tone]
          const Icon = s.icon
          return (
            <div
              key={s.title}
              className={`relative rounded-3xl border border-[--color-line] bg-gradient-to-br ${palette.bg} p-6 overflow-hidden`}
            >
              <div className={`w-11 h-11 rounded-2xl grid place-items-center ${palette.icon} mb-4 shadow-[var(--shadow-xs)]`}>
                <Icon className="w-5 h-5" />
              </div>
              <h2 className="text-[17px] font-bold tracking-tight text-[--color-ink-900] mb-2.5" style={{ fontFamily: 'var(--font-display)' }}>
                {s.title}
              </h2>
              <div className="text-[13.5px] text-[--color-ink-700] leading-relaxed">
                {s.body}
              </div>
            </div>
          )
        })}
      </section>

      {/* ============== 开源贡献 ============== */}
      <section className="rounded-3xl border border-[--color-line] bg-white p-6 md:p-8 shadow-[var(--shadow-xs)]">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[--color-camphor-400] to-[--color-camphor-600] grid place-items-center shadow-[var(--shadow-sm)] shrink-0">
            <Code className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[17px] font-bold tracking-tight text-[--color-ink-900] mb-1" style={{ fontFamily: 'var(--font-display)' }}>
              代码也是开源的
            </h2>
            <p className="text-[13.5px] text-[--color-ink-700] leading-relaxed mb-4">
              整个项目托管在 GitHub，前端 React + Tailwind v4，后端 Go (Gin)。
              欢迎你 fork 一份去搞自己学校的版本，或者直接来这里改进它。
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href="https://github.com/jaisonZheng/SYSU-Arxiv.git"
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-[--color-ink-900] hover:bg-[--color-ink-700] text-white text-[13px] font-semibold transition-colors"
              >
                <Github className="w-4 h-4" /> 去看 GitHub
              </a>
              <a
                href="mailto:zhengzsh5@mail2.sysu.edu.cn"
                className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-white border border-[--color-line] text-[--color-ink-700] text-[13px] font-medium hover:bg-[--color-cream-100] transition-colors"
              >
                <Mail className="w-4 h-4" /> 写封邮件
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ============== 社区契约 ============== */}
      <section className="relative overflow-hidden rounded-3xl border border-[--color-line] bg-gradient-to-br from-[--color-camphor-50] via-white to-[--color-cream-100] p-6 md:p-8">
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-[--color-camphor-100] blur-3xl opacity-50" />
        <div className="relative">
          <p className="text-[11.5px] uppercase tracking-[0.22em] font-semibold text-[--color-camphor-700] mb-2 flex items-center gap-2">
            <Leaf className="w-3.5 h-3.5" /> 角落里的小契约
          </p>
          <h2 className="text-[20px] md:text-[24px] font-bold tracking-tight text-[--color-ink-900] mb-5" style={{ fontFamily: 'var(--font-display)' }}>
            三件可以让这里更暖的事
          </h2>
          <ul className="space-y-3">
            {[
              { emoji: '🌱', t: '不当倒卖者', d: '收下的资料是大家的善意，请不要拿去贩卖牟利。' },
              { emoji: '☕', t: '收一份，传一份', d: '如果你刚好整理过笔记，把它放上来，会让很多人少熬一夜。' },
              { emoji: '🤝', t: '友善地标注与署名', d: '给原作者留个名，别破坏链接，保持信息的来路清晰。' },
            ].map((it) => (
              <li key={it.t} className="flex items-start gap-3 bg-white/80 backdrop-blur-sm border border-[--color-line] rounded-2xl px-4 py-3">
                <span className="text-[24px] leading-none mt-0.5">{it.emoji}</span>
                <div>
                  <p className="text-[14px] font-semibold text-[--color-ink-900]">{it.t}</p>
                  <p className="text-[12.5px] text-[--color-ink-500] mt-0.5">{it.d}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ============== CTA ============== */}
      <section className="text-center py-2">
        <p className="text-[12.5px] text-[--color-ink-400] mb-3 inline-flex items-center gap-1">
          <Coffee className="w-3.5 h-3.5" /> 感谢看到这里
        </p>
        <h3 className="text-[18px] md:text-[22px] font-bold text-[--color-ink-900] mb-4" style={{ fontFamily: 'var(--font-display)' }}>
          准备好让角落更暖一点了吗？
        </h3>
        <div className="inline-flex items-center gap-3 flex-wrap justify-center">
          <button
            onClick={() => navigate('/upload')}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-gradient-to-r from-[--color-honey-400] to-[--color-kapok-400] text-white text-[13.5px] font-semibold shadow-[0_12px_28px_-12px_rgba(244,125,44,0.55)] hover:scale-[1.03] transition-transform"
          >
            <Sparkles className="w-4 h-4" /> 我也来分享一份
          </button>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-white border border-[--color-line] text-[--color-ink-700] text-[13.5px] font-medium hover:bg-[--color-cream-100] transition-colors"
          >
            先看看大家在分享什么 <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>
    </div>
  )
}
