// 共享的小工具：时间问候、相对时间、文件大小、子分类标签
// ----------------------------------------------------------------

export const subCategoryMeta = {
  lecture:         { label: '课件',       emoji: '📚', tone: 'mist' },
  notes:           { label: '笔记',       emoji: '✍️', tone: 'honey' },
  mock_exam:       { label: '模拟题',     emoji: '🎯', tone: 'kapok' },
  exam_answer:     { label: '试卷答案',   emoji: '🗝️', tone: 'camphor' },
  textbook_answer: { label: '教材答案',   emoji: '📖', tone: 'camphor' },
  summary:         { label: '总结',       emoji: '🌟', tone: 'honey' },
  other:           { label: '其它',       emoji: '🍡', tone: 'mist' },
}

export const categoryMeta = {
  past_exam:      { label: '历年真题',  emoji: '📝', tone: 'kapok' },
  study_material: { label: '学习资料',  emoji: '📓', tone: 'camphor' },
  package:        { label: '课程资源包', emoji: '🎁', tone: 'honey' },
}

const toneClass = {
  camphor: { bg: 'bg-[--color-camphor-50]', text: 'text-[--color-camphor-700]', ring: 'ring-[--color-camphor-200]' },
  honey:   { bg: 'bg-[--color-honey-50]',   text: 'text-[--color-honey-700]',   ring: 'ring-[--color-honey-200]' },
  kapok:   { bg: 'bg-[--color-kapok-50]',   text: 'text-[--color-kapok-500]',   ring: 'ring-[--color-kapok-200]' },
  mist:    { bg: 'bg-[--color-mist-50]',    text: 'text-[--color-mist-500]',    ring: 'ring-[--color-mist-200]' },
}
export const tone = (key) => toneClass[key] || toneClass.mist

// —— 一天里的不同问候语 —— //
export function greet() {
  const h = new Date().getHours()
  if (h < 5)  return { hi: '夜深了',     emoji: '🌙', sub: '复习累了就先睡，明早再来吧' }
  if (h < 9)  return { hi: '早上好',     emoji: '☀️', sub: '一杯咖啡，从一份资料开始今天' }
  if (h < 12) return { hi: '上午好',     emoji: '🍃', sub: '校园里的樟树正绿，趁状态收一份笔记吧' }
  if (h < 14) return { hi: '中午好',     emoji: '🥢', sub: '吃饱了再看，专注力会好得多' }
  if (h < 18) return { hi: '下午好',     emoji: '🌻', sub: '阳光正暖，来逛一圈最近的资料' }
  if (h < 22) return { hi: '晚上好',     emoji: '🌆', sub: '一起把信息差抹平，让明天更轻松' }
  return        { hi: '夜里好',     emoji: '🌌', sub: '夜里专属的安静时段，最适合收下一份好资料' }
}

// —— 相对时间 —— //
export function timeAgo(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const diff = (Date.now() - date.getTime()) / 1000
  if (diff < 60)        return '刚刚'
  if (diff < 60 * 10)   return `${Math.floor(diff/60)} 分钟前`
  if (diff < 60 * 60)   return `${Math.floor(diff/60)} 分钟前`
  if (diff < 60 * 60 * 24)  return `${Math.floor(diff/3600)} 小时前`
  if (diff < 60 * 60 * 24 * 7) return `${Math.floor(diff/86400)} 天前`
  if (diff < 60 * 60 * 24 * 30) return `${Math.floor(diff/(86400*7))} 周前`
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

export function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
}

export function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

// 暖色系的随机鼓励语，用于空状态、加载中
const cheers = {
  loading: ['翻找笔记中…', '从书架里抽取…', '正在拾取 ✨', '稍等，资料在路上…'],
  empty:   ['这里还没人来过 · 第一棒交给你', '空着也好看，不过有内容会更暖', '暂无内容，要不上传一份？'],
  thanks:  ['谢谢你！这份资料会让很多人开心 ✨', '又少一晚熬夜，谢谢你 🌙', '你的好意已经被收下啦 ❤️'],
}
export const cheer = (kind) => {
  const arr = cheers[kind] || []
  return arr[Math.floor(Math.random() * arr.length)] || ''
}

// 取得用户名首字（中文取末字，英文取首字母）
export function avatarLetter(name = '') {
  if (!name) return '同'
  const s = name.trim()
  if (!s) return '同'
  // 如果含中文，取末字
  if (/[\u4e00-\u9fa5]/.test(s)) return s.slice(-1)
  return s[0].toUpperCase()
}

// 暖色系的头像背景（按字符 hash 选）
export const avatarPalettes = [
  { bg: '#FFD09C', fg: '#A94C0F' },
  { bg: '#A8D0B0', fg: '#1B4533' },
  { bg: '#FFA88C', fg: '#A82640' },
  { bg: '#A4BCD3', fg: '#3D6890' },
  { bg: '#E7DAC4', fg: '#3F3A33' },
  { bg: '#D6E9DA', fg: '#235740' },
  { bg: '#FAC8C9', fg: '#A82640' },
  { bg: '#FFE6CB', fg: '#A94C0F' },
]
export function avatarColor(name = '') {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return avatarPalettes[h % avatarPalettes.length]
}
