import { useState, useCallback } from 'react'
import { api } from '../api/client'

export default function ThankButton({ id, initialCount = 0, isPackage = false, size = 'sm' }) {
  const [count, setCount] = useState(initialCount)
  const [thanked, setThanked] = useState(false)
  const [animating, setAnimating] = useState(false)

  const handleThank = useCallback(async () => {
    if (thanked) return
    setAnimating(true)
    setThanked(true)
    setCount((c) => c + 1)
    try {
      const endpoint = isPackage ? api.thankPackage : api.thankMaterial
      await endpoint(id)
    } catch (e) {
      // silent fail — user already got visual feedback
      console.error(e)
    } finally {
      setTimeout(() => setAnimating(false), 600)
    }
  }, [id, thanked, isPackage])

  const sizeClasses = size === 'lg'
    ? 'h-9 px-4 text-[13px]'
    : 'h-7 px-2.5 text-[11.5px]'

  return (
    <button
      onClick={handleThank}
      disabled={thanked}
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold transition-all duration-300 ${sizeClasses} ${
        thanked
          ? 'bg-[--color-kapok-100] text-[--color-kapok-600] cursor-default'
          : 'bg-[--color-cream-100] text-[--color-ink-600] hover:bg-[--color-kapok-100] hover:text-[--color-kapok-600]'
      } ${animating ? 'scale-110' : 'scale-100'}`}
    >
      <span className={`transition-transform duration-300 ${animating ? 'scale-125' : 'scale-100'}`}>
        {thanked ? '🙏' : '✨'}
      </span>
      <span>{thanked ? '少熬一夜' : '谢谢'}</span>
      {count > 0 && (
        <span className="tabular-nums opacity-80">{count}</span>
      )}
    </button>
  )
}
