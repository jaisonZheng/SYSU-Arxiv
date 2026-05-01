import { Heart, Copyright, Upload, MessageSquare, Code } from 'lucide-react'

const sections = [
  {
    icon: Heart,
    title: '网站初心',
    content:
      '笔者每至期中期末，往往找倒狗买资料，其往往非资料整理者，更非资料生产者，却重复收取费用。故在周末顺手搭建此网站，以供中大师生使用。希望大家能多多上传资料，以抹平信息差，以福泽后人。',
  },
  {
    icon: Copyright,
    title: '版权声明',
    content:
      '本网站不具有对网站上任何资料的版权，资料仅供学习分享，严禁倒卖或进行其他商业行为。',
  },
  {
    icon: Upload,
    title: '上传说明',
    content:
      '同学和老师们可以自行上传资料，上传后所有人皆可下载，请勿上传违法违规内容。',
  },
  {
    icon: MessageSquare,
    title: '反馈与建议',
    content:
      '网站前端后端相关问题，可以在 GitHub 上面提 Issue；其他问题，可以发邮件到 zhengzsh5@mail2.sysu.edu.cn。',
  },
]

export default function Help() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">帮助中心</h1>

      <div className="grid gap-3">
        {sections.map((section) => {
          const Icon = section.icon
          return (
            <div
              key={section.title}
              className="bg-white rounded-lg border border-gray-200 p-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-50 shrink-0">
                  <Icon className="w-4 h-4 text-gray-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-semibold text-gray-900 mb-1.5">
                    {section.title}
                  </h2>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {section.content}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-50 shrink-0">
            <Code className="w-4 h-4 text-gray-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-gray-900 mb-1.5">
              开源与贡献
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              本项目开源在 GitHub 上，欢迎提交 Issue 和 PR 参与贡献。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
