import type { ReactNode } from 'react'

/** Label + optional hint above a control; shared by the Admin forms. */
export function NoniField({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-ink">{label}</span>
      {hint && <span className="-mt-1 text-[13px] text-muted">{hint}</span>}
      {children}
    </div>
  )
}
