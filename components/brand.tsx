import Link from 'next/link'

export function Brand({ onNavigate }: { onNavigate?: () => void } = {}) {
  return (
    <Link
      className="brand"
      href="/"
      onClick={onNavigate}
      aria-label="U Drive Car Rental Kathmandu — home"
    >
      <img
        className="brand-logo"
        src="/images/u-drive-logo.webp"
        alt="U Drive Car Rental"
        width={1000}
        height={320}
      />
    </Link>
  )
}
export function Wheel({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9.4" />
      <circle cx="12" cy="12" r="2.1" />
      <path d="m3.1 8.9 6.9 2.2m10.9-2.2L14 11.1M12 14.2v7.2M5.1 14.7l3.6.5 1.3 5.7m8.9-6.2-3.6.5-1.3 5.7" />
    </svg>
  )
}
