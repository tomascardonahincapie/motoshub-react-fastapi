/** Isotipo de MotosHub: una rueda estilizada con el acento de la marca. */
export default function Logo({ className = 'h-9 w-9' }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="logo-motoshub" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ff8347" />
          <stop offset="1" stopColor="#e8480a" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="20" stroke="url(#logo-motoshub)" strokeWidth="3" />
      <circle cx="24" cy="24" r="6.5" fill="url(#logo-motoshub)" />
      {/* Radios de la rueda */}
      <g stroke="url(#logo-motoshub)" strokeWidth="2.4" strokeLinecap="round" opacity="0.85">
        <path d="M24 10.5v5" />
        <path d="M24 32.5v5" />
        <path d="M37.5 24h-5" />
        <path d="M15.5 24h-5" />
        <path d="m33.5 14.5-3.5 3.5" />
        <path d="m18 30-3.5 3.5" />
        <path d="m33.5 33.5-3.5-3.5" />
        <path d="m18 18-3.5-3.5" />
      </g>
    </svg>
  );
}
