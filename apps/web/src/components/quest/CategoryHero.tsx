// A low-poly, faceted "category scene" used as the quest hero image instead of a
// generic photo. Every quest gets a hand-built scene tinted to its category, in
// the cozy campfire palette. Pure SVG — no assets, no network.

interface CategoryHeroProps {
  category?: string | null
  className?: string
}

interface Palette {
  a: string // accent mid
  b: string // accent deep
  c: string // accent light / highlight
}

const PALETTES: Record<string, Palette> = {
  Food: { a: '#F2741E', b: '#C2410C', c: '#FFCB6B' },
  Outdoors: { a: '#5FA88F', b: '#3E7A66', c: '#CFE3DA' },
  Nightlife: { a: '#9B6BC9', b: '#6E4A9C', c: '#E4D4F2' },
  Culture: { a: '#5B8FD8', b: '#3E66A6', c: '#D4E2F2' },
  Fitness: { a: '#F2741E', b: '#C2410C', c: '#FFCB6B' },
  Gaming: { a: '#E2655B', b: '#B0443C', c: '#F6D7A8' },
  Default: { a: '#F6A623', b: '#D8861A', c: '#FFE0A8' },
}

function Motif({ category, p }: { category: string; p: Palette }) {
  switch (category) {
    case 'Outdoors':
      return (
        <g>
          <circle cx="300" cy="48" r="20" fill={p.c} opacity="0.85" />
          <polygon points="170,96 205,40 240,96" fill={p.b} />
          <polygon points="205,40 240,96 222,96" fill={p.a} />
          <polygon points="135,96 165,52 195,96" fill={p.a} />
          <polygon points="165,52 195,96 180,96" fill={p.b} />
          <polygon points="250,96 240,70 232,96" fill={p.b} />
          <polygon points="262,96 252,66 242,96" fill={p.a} />
        </g>
      )
    case 'Nightlife':
      return (
        <g>
          <circle cx="285" cy="46" r="22" fill={p.c} />
          <circle cx="276" cy="42" r="20" fill="#1E140E" />
          <polygon points="22,40 26,52 30,40" fill={p.c} />
          <polygon points="120,30 124,42 128,30" fill={p.c} />
          <polygon points="160,86 200,52 240,86" fill={p.a} />
          <rect x="198" y="86" width="4" height="20" fill={p.b} />
          <rect x="186" y="106" width="28" height="5" fill={p.b} />
        </g>
      )
    case 'Culture':
      return (
        <g>
          <polygon points="160,40 240,40 250,56 150,56" fill={p.c} />
          <rect x="165" y="56" width="12" height="50" fill={p.a} />
          <rect x="194" y="56" width="12" height="50" fill={p.b} />
          <rect x="223" y="56" width="12" height="50" fill={p.a} />
          <rect x="150" y="106" width="100" height="8" fill={p.b} />
        </g>
      )
    case 'Fitness':
      return (
        <g>
          <rect x="150" y="68" width="100" height="12" rx="2" fill={p.a} />
          <rect x="138" y="56" width="16" height="36" rx="2" fill={p.b} />
          <rect x="124" y="62" width="12" height="24" rx="2" fill={p.c} />
          <rect x="246" y="56" width="16" height="36" rx="2" fill={p.b} />
          <rect x="264" y="62" width="12" height="24" rx="2" fill={p.c} />
        </g>
      )
    case 'Gaming':
      return (
        <g>
          <rect x="150" y="52" width="100" height="48" rx="20" fill={p.a} />
          <rect x="168" y="70" width="8" height="22" fill={p.b} />
          <rect x="159" y="79" width="22" height="8" fill={p.b} />
          <circle cx="226" cy="72" r="6" fill={p.c} />
          <circle cx="240" cy="84" r="6" fill={p.c} />
        </g>
      )
    case 'Food':
      return (
        <g>
          <polygon points="170,58 250,58 242,104 178,104" fill={p.a} />
          <polygon points="170,58 250,58 246,72 174,72" fill={p.c} />
          <path d="M250 66 q22 6 0 26" stroke={p.b} strokeWidth="7" fill="none" />
          <polygon points="196,30 200,46 204,30" fill={p.c} opacity="0.7" />
          <polygon points="214,26 218,44 222,26" fill={p.c} opacity="0.7" />
        </g>
      )
    default:
      return (
        <g>
          <polygon points="200,34 226,70 200,106 174,70" fill={p.a} />
          <polygon points="200,34 226,70 200,70" fill={p.c} />
          <polygon points="200,106 174,70 200,70" fill={p.b} />
          <circle cx="200" cy="70" r="7" fill={p.c} />
        </g>
      )
  }
}

export function CategoryHero({ category, className }: CategoryHeroProps) {
  const key = category && PALETTES[category] ? category : 'Default'
  const p = PALETTES[key]
  return (
    <svg
      viewBox="0 0 400 150"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-hidden="true"
    >
      {/* faceted dusk sky */}
      <polygon points="0,0 400,0 400,52 0,84" fill="#241811" />
      <polygon points="0,84 400,52 400,150 0,150" fill="#1E140E" />
      <polygon points="0,0 150,0 0,60" fill="#2A1C14" />
      <polygon points="400,0 250,0 400,46" fill="#2A1C14" />
      {/* category motif */}
      <Motif category={key} p={p} />
      {/* faceted ground hills in the category colour */}
      <polygon points="0,150 0,112 140,128 0,150" fill={p.b} opacity="0.9" />
      <polygon points="0,150 140,128 280,138 400,116 400,150" fill={p.a} opacity="0.85" />
      <polygon points="150,150 300,126 400,144 400,150" fill={p.b} opacity="0.8" />
    </svg>
  )
}
