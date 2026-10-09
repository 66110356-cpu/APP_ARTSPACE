function NavIcon({ name }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round'
  }

  const iconPaths = {
    home: (
      <>
        <path d="m3 10 9-7 9 7" />
        <path d="M5 9v11h14V9" />
        <path d="M9 20v-6h6v6" />
      </>
    ),
    explore: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m16 16 4.5 4.5" />
        <path d="m14 8-2 4-4 2 2-4 4-2Z" />
      </>
    ),
    artists: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
        <path d="M16 5.5a3 3 0 0 1 0 5.8" />
        <path d="M17 14.5a5.5 5.5 0 0 1 3.5 5" />
      </>
    ),
    saved: (
      <>
        <path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4-6 4V4.5Z" />
        <path d="M9 7h6" />
      </>
    ),
    about: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5" />
        <path d="M12 8h.01" />
      </>
    ),
    peeper: (
      <>
        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),
    maker: (
      <>
        <path d="m14.5 5.5 4 4" />
        <path d="m4 20 4.3-1 10.9-10.9a2.1 2.1 0 0 0-3-3L5.3 16 4 20Z" />
        <path d="M4 20h5" />
      </>
    )
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="22"
      height="22"
      {...common}
    >
      {iconPaths[name]}
    </svg>
  )
}

export default NavIcon
