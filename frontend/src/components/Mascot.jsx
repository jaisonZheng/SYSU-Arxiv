/**
 * 榕树橘猫 · 同窗角落吉祥物
 * 一只在榕树下的大橘
 * variant: reading | sleeping | sunshield
 */
export default function Mascot({ size = 240, className = '', variant = 'reading' }) {
  const isSleeping = variant === 'sleeping'
  const isSunshield = variant === 'sunshield'

  const bookRotation = isSunshield ? '-25' : '-8'
  const catHeadY = isSleeping ? 2 : 0
  const eyeOpacity = isSleeping ? 0 : 1
  const closedEyeOpacity = isSleeping ? 1 : 0

  // 橘猫配色
  const orangeDark = '#C45C1A'
  const orangeBody = '#E07B2A'
  const orangeLight = '#F2A65A'
  const belly = '#FFF5E8'

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 240 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="榕树橘猫"
    >
      {/* 榕树 */}
      <g opacity="0.85">
        {/* 树干 - 更粗更矮，像榕树 */}
        <path
          d="M120 210C120 210 100 170 100 130C100 95 110 75 120 60C130 75 140 95 140 130C140 170 120 210 120 210Z"
          fill="var(--color-camphor-500)"
        />
        {/* 气根 */}
        <path d="M108 150Q100 170 102 190" stroke="var(--color-camphor-400)" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M132 145Q140 165 138 185" stroke="var(--color-camphor-400)" strokeWidth="3" strokeLinecap="round" fill="none" />
        {/* 树叶团 - 榕树是大片团状叶子 */}
        <ellipse cx="85" cy="85" rx="28" ry="18" fill="var(--color-camphor-400)" transform="rotate(-20 85 85)" />
        <ellipse cx="155" cy="80" rx="28" ry="18" fill="var(--color-camphor-400)" transform="rotate(20 155 80)" />
        <ellipse cx="75" cy="115" rx="24" ry="15" fill="var(--color-camphor-300)" transform="rotate(-15 75 115)" />
        <ellipse cx="165" cy="110" rx="24" ry="15" fill="var(--color-camphor-300)" transform="rotate(15 165 110)" />
        <ellipse cx="120" cy="55" rx="32" ry="20" fill="var(--color-camphor-500)" />
        <ellipse cx="100" cy="70" rx="22" ry="14" fill="var(--color-camphor-300)" />
        <ellipse cx="140" cy="68" rx="22" ry="14" fill="var(--color-camphor-300)" />
      </g>

      {/* 猫尾巴 */}
      <path
        d="M155 170Q185 165 180 140Q178 125 168 130"
        stroke={orangeDark}
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />

      {/* 猫身体 */}
      <ellipse cx="120" cy="160" rx="35" ry="26" fill={orangeBody} />
      {/* 猫肚子 */}
      <ellipse cx="120" cy="163" rx="20" ry="14" fill={belly} />

      {/* 猫头 */}
      <circle cx="120" cy={130 + catHeadY} r="26" fill={orangeBody} />
      {/* 猫耳朵 */}
      <path d={`M98 ${114 + catHeadY}L92 ${96 + catHeadY}L108 ${108 + catHeadY}`} fill={orangeBody} />
      <path d={`M142 ${114 + catHeadY}L148 ${96 + catHeadY}L132 ${108 + catHeadY}`} fill={orangeBody} />
      <path d={`M100 ${112 + catHeadY}L96 ${100 + catHeadY}L106 ${108 + catHeadY}`} fill={orangeLight} />
      <path d={`M140 ${112 + catHeadY}L144 ${100 + catHeadY}L134 ${108 + catHeadY}`} fill={orangeLight} />

      {/* 猫脸 */}
      <ellipse cx="110" cy={132 + catHeadY} rx="6" ry="7" fill={belly} />
      <ellipse cx="130" cy={132 + catHeadY} rx="6" ry="7" fill={belly} />

      {/* 眼睛 - 睁开 */}
      <g opacity={eyeOpacity}>
        <circle cx="112" cy={130 + catHeadY} r="3" fill="#1B1A18" />
        <circle cx="128" cy={130 + catHeadY} r="3" fill="#1B1A18" />
        <circle cx="113" cy={129 + catHeadY} r="1" fill="white" />
        <circle cx="129" cy={129 + catHeadY} r="1" fill="white" />
      </g>
      {/* 眼睛 - 闭上（睡觉） */}
      <g opacity={closedEyeOpacity}>
        <path d={`M108 ${130 + catHeadY}Q112 ${133 + catHeadY} 116 ${130 + catHeadY}`} stroke="#1B1A18" strokeWidth="1" fill="none" strokeLinecap="round" />
        <path d={`M124 ${130 + catHeadY}Q128 ${133 + catHeadY} 132 ${130 + catHeadY}`} stroke="#1B1A18" strokeWidth="1" fill="none" strokeLinecap="round" />
      </g>

      {/* 鼻子 */}
      <ellipse cx="120" cy={138 + catHeadY} rx="2" ry="1.2" fill="#FFA88C" />
      {/* 嘴 */}
      <path d={`M116 ${141 + catHeadY}Q120 ${144 + catHeadY} 124 ${141 + catHeadY}`} stroke="#1B1A18" strokeWidth="0.8" fill="none" strokeLinecap="round" />
      {/* 胡须 */}
      <path d={`M96 ${136 + catHeadY}H82M96 ${140 + catHeadY}H84`} stroke="#1B1A18" strokeWidth="0.6" strokeLinecap="round" opacity="0.3" />
      <path d={`M144 ${136 + catHeadY}H158M144 ${140 + catHeadY}H156`} stroke="#1B1A18" strokeWidth="0.6" strokeLinecap="round" opacity="0.3" />

      {/* 书 */}
      <g transform={`rotate(${bookRotation} 112 155)`}>
        <rect x="100" y="148" width="24" height="16" rx="2" fill="var(--color-honey-400)" />
        <rect x="102" y="149" width="20" height="14" rx="1" fill="var(--color-honey-300)" />
        <path d="M104 153L120 150M105 157L121 154" stroke="var(--color-honey-500)" strokeWidth="0.6" strokeLinecap="round" />
      </g>

      {/* 飘落的叶子 */}
      <ellipse cx="60" cy="180" rx="7" ry="3.5" fill="var(--color-camphor-300)" transform="rotate(-40 60 180)" opacity="0.7" />
      <ellipse cx="180" cy="190" rx="6" ry="3" fill="var(--color-camphor-300)" transform="rotate(25 180 190)" opacity="0.6" />
      <ellipse cx="50" cy="120" rx="5" ry="2.5" fill="var(--color-camphor-400)" transform="rotate(-60 50 120)" opacity="0.5" />

      {/* 睡觉时的 Zzz */}
      {isSleeping && (
        <g>
          <text x="158" y="95" fontSize="12" fill="#A4BCD3" fontWeight="bold" opacity="0.8">z</text>
          <text x="168" y="86" fontSize="9" fill="#A4BCD3" fontWeight="bold" opacity="0.6">z</text>
        </g>
      )}

      {/* 挡太阳时的太阳 */}
      {isSunshield && (
        <g>
          <circle cx="175" cy="75" r="12" fill="#FFD09C" opacity="0.5" />
          <circle cx="175" cy="75" r="7" fill="#FF9A48" opacity="0.4" />
          <path d="M175 55V62M175 88V95M157 75H164M186 75H193M162 62L166 66M184 84L188 88M162 88L166 84M184 66L188 62" stroke="#FF9A48" strokeWidth="1" opacity="0.3" strokeLinecap="round" />
        </g>
      )}
    </svg>
  )
}
