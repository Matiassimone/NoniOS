import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

/** Flat surface card: `--surface`, thin border, 14 px radius (DESIGN.md -> Radii). */
export function NoniCard({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('rounded-[14px] border border-border bg-surface p-9', className)}
      {...props}
    />
  )
}
