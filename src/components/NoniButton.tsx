import type { ComponentProps } from 'react'

import { Button } from '@/components/ui/button'

/**
 * The NoniOS button. The shadcn `Button` primitive is never used directly in
 * screens — everything goes through this wrapper (see AGENTS.md -> Stack Rules),
 * so NoniOS-specific sizing and variants have a single place to live.
 */
// ponytail: thin passthrough seed — grows NoniOS variants when Home/Admin need them
export function NoniButton(props: ComponentProps<typeof Button>) {
  return <Button {...props} />
}
