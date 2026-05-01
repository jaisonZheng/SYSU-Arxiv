import { Heart, Mail, Sparkles } from 'lucide-react'
import { Github } from './icons'

export default function Footer() {
  return (
    <footer className="hidden md:block relative mt-12 border-t border-[--color-line] bg-[--color-cream-100]">
      <div className="max-w-[1180px] mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[--color-camphor-400] to-[--color-camphor-600] grid place-items-center">
              <span className="text-white text-sm font-bold" style={{ fontFamily: 'var(--font-serif)' }}>同</span>
            </div>
            <span className="text-base font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>同窗角落</span>
          </div>
          <p className="text-[13.5px] text-[--color-ink-500] leading-relaxed max-w-xs">
            一个由中大同学共同维护的资料分享小角落。
            <br />笔者愿，把好东西无偿地传递给学弟学妹。
          </p>
          <p className="text-[12px] text-[--color-ink-400]">由 <span className="text-[--color-ink-700] font-medium">中山大学</span> 在校与离校的同学贡献维护</p>
        </div>

        <div className="space-y-3">
          <h4 className="text-[12px] uppercase tracking-[0.18em] text-[--color-ink-400] font-semibold">社区契约</h4>
          <ul className="space-y-1.5 text-[13.5px] text-[--color-ink-700]">
            <li className="flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-[--color-honey-500]" /> 资料免费 · 严禁倒卖</li>
            <li className="flex items-center gap-2"><Heart className="w-3.5 h-3.5 text-[--color-kapok-400]" /> 上传请勿带个人隐私 / 违规内容</li>
            <li className="flex items-center gap-2"><span className="w-3.5 h-3.5 grid place-items-center text-[--color-camphor-500]">✦</span> 收下了别忘记，自己也回传一份</li>
          </ul>
        </div>

        <div className="space-y-3">
          <h4 className="text-[12px] uppercase tracking-[0.18em] text-[--color-ink-400] font-semibold">联系</h4>
          <a href="https://github.com/jaisonZheng/SYSU-Arxiv.git" target="_blank" rel="noopener noreferrer"
             className="inline-flex items-center gap-2 text-[13.5px] text-[--color-ink-700] hover:text-[--color-camphor-600]">
            <Github className="w-4 h-4" /> GitHub · 提 Issue / PR
          </a>
          <a href="mailto:zhengzsh5@mail2.sysu.edu.cn"
             className="flex items-center gap-2 text-[13.5px] text-[--color-ink-700] hover:text-[--color-camphor-600]">
            <Mail className="w-4 h-4" /> zhengzsh5@mail2.sysu.edu.cn
          </a>
          <p className="text-[12px] text-[--color-ink-400] pt-2">
            ©  {new Date().getFullYear()} 同窗角落 · 不收一分钱，靠彼此的善意运转
          </p>
        </div>
      </div>
    </footer>
  )
}
