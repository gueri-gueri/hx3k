import type { ReactNode } from 'react'
import hx3kLogoUrl from '../assets/logo/hx3k-logo.svg'
import hx3kMarkUrl from '../assets/logo/hx3k-mark.svg'
import t3kMarkUrl from '../assets/brand/t3k-mark.svg'
import tone3000LogoUrl from '../assets/brand/tone3000-logo.svg'

// TONE3000's official assets (its "TONE3000 Logos" pack), shown as they are.
// Its rule: users see the full TONE3000 logo before the shorter T3K mark. The
// full logo is on the splash and on every screen's sidebar; the mark goes in
// compact places (the Browse button, the marker on a converted capture).

/** The full logo: entry points and first exposure. */
export function Tone3000Logo({ className }: { className?: string }): ReactNode {
  return <img className={className ? `t3k-logo ${className}` : 't3k-logo'} src={tone3000LogoUrl} alt="TONE3000" draggable={false} />
}

/**
 * The compact mark: buttons and origin markers. `decorative` when the words
 * beside it already name TONE3000, so it is not read out twice.
 */
export function T3KMark({ className, decorative }: { className?: string; decorative?: boolean }): ReactNode {
  return <img className={className ? `t3k-mark ${className}` : 't3k-mark'} src={t3kMarkUrl} alt={decorative ? '' : 'TONE3000'} draggable={false} />
}

// This app's own logo: "HX" on the dark tile, "3K" on the primary blue. Flat
// letters drawn for it, with no red and no relief, so it is not taken for
// TONE3000's. Both pictures read out the app's full name.

/** The horizontal logo: the top of the menu and the splash. */
export function Hx3kLogo({ className }: { className?: string }): ReactNode {
  return <img className={className ? `hx3k-logo ${className}` : 'hx3k-logo'} src={hx3kLogoUrl} alt="HX3K" draggable={false} />
}

/** The square mark: where the menu is only a rail. */
export function Hx3kMark({ className }: { className?: string }): ReactNode {
  return <img className={className ? `hx3k-mark ${className}` : 'hx3k-mark'} src={hx3kMarkUrl} alt="HX3K" draggable={false} />
}
