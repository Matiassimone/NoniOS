import type { ComponentProps } from 'react'

import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

/** The NoniOS toggle — wraps the shadcn/radix `Switch`, sized for the Admin canvas. */
export function NoniSwitch({ className, ...props }: ComponentProps<typeof Switch>) {
  return (
    <Switch className={cn('h-7 w-12 [&_[data-slot=switch-thumb]]:size-6', className)} {...props} />
  )
}
