import { Check } from 'lucide-react'

export default function Checkbox({ checked, onChange, label, disabled }) {
  return (
    <label
      className={`inline-flex items-center gap-2 cursor-pointer select-none ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      <div className="relative flex items-center justify-center shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="peer sr-only"
        />
        <div
          className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-colors
            ${checked
              ? 'bg-primary border-primary'
              : 'bg-white border-outline hover:border-on-surface-variant'
            }
          `}
        >
          <Check
            className={`w-3 h-3 text-on-primary transition-transform duration-150 ${
              checked ? 'scale-100' : 'scale-0'
            }`}
            strokeWidth={2.5}
          />
        </div>
      </div>
      {label && (
        <span className="text-sm text-on-surface-variant">{label}</span>
      )}
    </label>
  )
}
