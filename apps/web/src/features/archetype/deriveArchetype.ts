import { 
  ARCHETYPE_DOMINANCE_RATIO, 
  hybridNames, 
  pursuits, 
  PursuitKey 
} from '../pursuits/pursuits.config';

export type ArchetypeKind = 'pure' | 'hybrid' | 'default';

export interface DerivedArchetype {
  kind: ArchetypeKind;
  primary: PursuitKey | null;
  secondary: PursuitKey | null;
  name: string;
  baseColor: string;
  accentColor: string;
}

/**
 * Pure function to derive user archetype based on pursuits experience distribution.
 * Decoupled from Zustand or React components for absolute portability.
 */
export function deriveArchetype(pursuitXP: Partial<Record<PursuitKey, number>>): DerivedArchetype {
  // Stable list of pursuits from config order to handle ties deterministically
  const pursuitKeys: PursuitKey[] = [
    'gastronomy',
    'wilds',
    'revelry',
    'athletics',
    'lore',
    'wayfaring',
    'fellowship',
    'discovery'
  ];

  // Map to fully populated entries with 0-fallback
  const entries = pursuitKeys.map(key => ({
    key,
    xp: pursuitXP[key] ?? 0
  }));

  // Calculate total experience
  const totalXP = entries.reduce((sum, item) => sum + item.xp, 0);

  // 1. Edge Case: If total XP is 0, return "Wanderer" (default newcomer state)
  if (totalXP === 0) {
    return {
      kind: 'default',
      primary: null,
      secondary: null,
      name: 'Wanderer',
      baseColor: '#9CA3AF', // Gray-400
      accentColor: '#9CA3AF'
    };
  }

  // Stable sort descending by XP. Ties are broken by original index order
  entries.sort((a, b) => {
    if (b.xp !== a.xp) {
      return b.xp - a.xp; // Descending order
    }
    // Stable tie-break by config index order
    return pursuitKeys.indexOf(a.key) - pursuitKeys.indexOf(b.key);
  });

  const p1 = entries[0];
  const p2 = entries[1];

  const primaryDef = pursuits[p1.key];

  // 2. Edge Case: If secondary has 0 XP, it is a PURE archetype (prevents divide-by-zero)
  if (!p2 || p2.xp === 0) {
    return {
      kind: 'pure',
      primary: p1.key,
      secondary: null,
      name: primaryDef.noun,
      baseColor: primaryDef.color,
      accentColor: primaryDef.color
    };
  }

  const ratio = p1.xp / p2.xp;
  const secondaryDef = pursuits[p2.key];

  // 3. Check dominance ratio to resolve pure vs hybrid
  if (ratio >= ARCHETYPE_DOMINANCE_RATIO) {
    // PURE: Noun of the primary pursuit
    return {
      kind: 'pure',
      primary: p1.key,
      secondary: p2.key,
      name: primaryDef.noun,
      baseColor: primaryDef.color,
      accentColor: primaryDef.color
    };
  } else {
    // HYBRID: Accent colors represent the relationship, name is alphabetically lookup-based
    const pairKey = [p1.key, p2.key].sort().join('+');
    const curatedName = hybridNames[pairKey];
    
    // Generative fallback if not in the curated 28 mapping
    const fallbackName = `${secondaryDef.adjective} ${primaryDef.noun}`;
    const name = curatedName ?? fallbackName;

    return {
      kind: 'hybrid',
      primary: p1.key,
      secondary: p2.key,
      name,
      baseColor: primaryDef.color,
      accentColor: secondaryDef.color
    };
  }
}
