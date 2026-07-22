import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges class names, resolving Tailwind conflicts (last wins). Used by every
 * `Noni*` component and the shadcn primitives underneath them.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
