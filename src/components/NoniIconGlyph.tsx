import type { ComponentType } from 'react'

import {
  Book,
  Globe,
  Heart,
  Image,
  Music,
  Phone,
  Play,
  Sun,
  Tv,
  Video,
  type LucideProps,
} from 'lucide-react'

import type { IconKey } from '@/lib/config'

const GLYPHS: Record<IconKey, ComponentType<LucideProps>> = {
  play: Play,
  tv: Tv,
  photos: Image,
  phone: Phone,
  video: Video,
  music: Music,
  globe: Globe,
  book: Book,
  heart: Heart,
  weather: Sun,
}

/**
 * Renders a glyph from the bundled icon library (DESIGN.md -> Icon glyph
 * library) by key. Backed by lucide-react rather than separate SVG files — same
 * fixed set of keys, no assets to maintain.
 */
export function NoniIconGlyph({ icon, ...props }: { icon: IconKey } & LucideProps) {
  const Glyph = GLYPHS[icon]
  return <Glyph strokeWidth={1.8} {...props} />
}
