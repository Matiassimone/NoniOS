import logo from '@/assets/logos/256x256.png'

/**
 * The NoniOS brand mark — an illustrated face. Static by design: it never
 * rotates, even as a loading indicator (CLAUDE.md -> Visual Identity). Animate a
 * ring *around* it if motion is needed.
 */
export function NoniLogo({ size = 30, className }: { size?: number; className?: string }) {
  return (
    <img
      src={logo}
      width={size}
      height={size}
      alt=""
      draggable={false}
      className={className}
      style={{ width: size, height: size }}
    />
  )
}
