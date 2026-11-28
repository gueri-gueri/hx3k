import type { ReactNode } from 'react'

// Stroke icons on a 24 grid, drawn for this app.
const PATHS = {
  tones: (
    <>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
    </>
  ),
  wave: <path d="M3 12h2.5M8 7v10M11.5 4v16M15 8v8M18.500 10.500v3M21 12h0" />,
  file: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </>
  ),
  guide: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <circle cx="8" cy="12" r="1.6" />
      <circle cx="13" cy="12" r="1.6" />
      <path d="M17 10.500v3" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="8" cy="17" r="2" />
    </>
  ),
  folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 2.500h8a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  external: (
    <>
      <path d="M14 4h6v6M20 4l-9 9" />
      <path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
    </>
  ),
  back: <path d="M15 5l-7 7 7 7" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  check: <path d="M5 12.500l4.500 4.500L19 7.500" />,
  alert: (
    <>
      <path d="M12 4l9 15.500H3z" />
      <path d="M12 10v4M12 17v.010" />
    </>
  ),
  trash: <path d="M4 7h16M9 7V4.500h6V7M6.500 7l1 12.500h9l1-12.500M10 11v5M14 11v5" />,
  refresh: (
    <>
      <path d="M20 11a8 8 0 0 0-14.500-4M4 13a8 8 0 0 0 14.500 4" />
      <path d="M5 3v4h4M19 21v-4h-4" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V4M7 8.500L12 4l5 4.500" />
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v12M7 11.500l5 4.500 5-4.500" />
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </>
  ),
  firmware: (
    <>
      <rect x="6.500" y="6.500" width="11" height="11" rx="2" />
      <path d="M10 3.500v3M14 3.500v3M10 17.500v3M14 17.500v3M3.500 10h3M3.500 14h3M17.500 10h3M17.500 14h3" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8v.010" />
    </>
  ),
} satisfies Record<string, ReactNode>

export type IconName = keyof typeof PATHS

export function Icon({ name, className }: { name: IconName; className?: string }): ReactNode {
  return (
    <svg
      className={className ? `icon ${className}` : 'icon'}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  )
}

/** The tick beside a verified creator's name. */
export function Verified({ title }: { title: string }): ReactNode {
  return (
    <svg className="verified" viewBox="0 0 24 24" fill="currentColor" role="img" aria-label={title}>
      <title>{title}</title>
      <path d="M12 2l2.400 2.100 3.200-.300 1 3 2.800 1.500-1 3 1 3-2.800 1.500-1 3-3.200-.300L12 20.600l-2.400-2.100-3.200.300-1-3L2.600 14.300l1-3-1-3L5.400 6.800l1-3 3.200.300z" />
      <path d="M8.300 12.300l2.600 2.600 4.800-5.200" fill="none" stroke="var(--t3k-canvas)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
