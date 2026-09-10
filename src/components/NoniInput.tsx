import type { ComponentProps, ReactNode } from 'react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface NoniInputProps extends ComponentProps<typeof Input> {
  /** Optional icon rendered inside the field, on the left (e.g. a search glass). */
  leadingIcon?: ReactNode
}

/**
 * The NoniOS text field — the shadcn `Input` primitive is never used directly
 * (AGENTS.md -> Stack Rules). 40 px tall on the design canvas, surface
 * background, thin border, as in the Admin prototype.
 */
export function NoniInput({ leadingIcon, className, ...props }: NoniInputProps) {
  const field = (
    <Input
      className={cn('h-10 bg-surface text-[15px] text-ink', leadingIcon && 'pl-[38px]', className)}
      {...props}
    />
  )
  if (!leadingIcon) return field
  return (
    <div className="relative w-full">
      <span className="pointer-events-none absolute top-1/2 left-[13px] flex -translate-y-1/2 text-muted [&_svg]:size-[17px]">
        {leadingIcon}
      </span>
      {field}
    </div>
  )
}
