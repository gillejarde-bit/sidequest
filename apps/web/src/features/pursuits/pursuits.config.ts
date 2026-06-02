// Config constants for the SideQuest Pursuits + Archetype Engine (Proof of Concept)

export const ARCHETYPE_DOMINANCE_RATIO = 1.4;
// NOTE: product owner originally suggested 1.7, but their worked example
// (50 Gastronomy / 35 Wilds = 1.43 -> PURE Gourmand) requires a ratio of ~1.4.
// We configure this to 1.4 to satisfy the Gourmand worked example.

export const LEVEL_CURVE_K = 100;
// Total level is computed as: Math.floor(Math.sqrt(totalXP / LEVEL_CURVE_K)) + 1

export interface PursuitDefinition {
  key: string;
  noun: string;       // Used as noun for PURE archetypes and primary hybrid naming
  adjective: string;  // Used as adjective for secondary hybrid naming fallback
  color: string;      // Premium curated HSL-tailored hex colors
}

export type PursuitKey = 
  | 'gastronomy'
  | 'wilds'
  | 'revelry'
  | 'athletics'
  | 'lore'
  | 'wayfaring'
  | 'fellowship'
  | 'discovery';

export const pursuits: Record<PursuitKey, PursuitDefinition> = {
  gastronomy: {
    key: 'gastronomy',
    noun: 'Gourmand',
    adjective: 'Epicurean',
    color: '#F59E0B' // Amber
  },
  wilds: {
    key: 'wilds',
    noun: 'Ranger',
    adjective: 'Wild',
    color: '#22C55E' // Green
  },
  revelry: {
    key: 'revelry',
    noun: 'Reveler',
    adjective: 'Riotous',
    color: '#A855F7' // Violet
  },
  athletics: {
    key: 'athletics',
    noun: 'Contender',
    adjective: 'Vigorous',
    color: '#3B82F6' // Blue
  },
  lore: {
    key: 'lore',
    noun: 'Loremaster',
    adjective: 'Storied',
    color: '#6366F1' // Indigo
  },
  wayfaring: {
    key: 'wayfaring',
    noun: 'Wayfarer',
    adjective: 'Roaming',
    color: '#14B8A6' // Teal
  },
  fellowship: {
    key: 'fellowship',
    noun: 'Companion',
    adjective: 'Kindred',
    color: '#F43F5E' // Rose
  },
  discovery: {
    key: 'discovery',
    noun: 'Pathfinder',
    adjective: 'Intrepid',
    color: '#06B6D4' // Cyan
  }
};

// Curated lookup table for all 28 hybrid archetypes
// Key = the two alphabetical pursuit keys joined by "+"
export const hybridNames: Record<string, string> = {
  "athletics+discovery":   "Freerunner",     // finds routes, parkours new terrain
  "athletics+fellowship":  "Captain",        // leads the squad in team sport
  "athletics+gastronomy":  "Provisioner",    // fuels the body; trains hard, eats big
  "athletics+lore":        "Tactician",      // student of the game
  "athletics+revelry":     "Gladiator",      // competition + roaring crowd
  "athletics+wayfaring":   "Globetrotter",   // travels to compete / stay active
  "athletics+wilds":       "Mountaineer",    // climbs, trail-runs, sport in the wild
  "discovery+fellowship":  "Lodestar",       // the star friends follow to new places
  "discovery+gastronomy":  "Truffle Hunter", // sniffs out hidden food spots
  "discovery+lore":        "Sleuth",         // uncovers hidden history / obscure finds
  "discovery+revelry":     "Nighthawk",      // prowls for secret/underground nightlife
  "discovery+wayfaring":   "Voyager",        // explorer of genuinely new ground
  "discovery+wilds":       "Pathbreaker",    // forges into untouched wilderness
  "fellowship+gastronomy": "Hearthkeeper",   // feeds their inner circle; hosts dinners
  "fellowship+lore":       "Gamemaster",     // runs game night; gathers the group
  "fellowship+revelry":    "Ringleader",     // rallies the crew and runs the party
  "fellowship+wayfaring":  "Navigator",      // steers the crew's journeys
  "fellowship+wilds":      "Trailmate",      // the ride-or-die you camp & hike with
  "gastronomy+lore":       "Connoisseur",    // cultured palate; food as art & history
  "gastronomy+revelry":    "Bon Vivant",     // lives well — feasting + festivity
  "gastronomy+wayfaring":  "Spice Trader",   // chases flavor across the map
  "gastronomy+wilds":      "Forager",        // finds and eats off the land
  "lore+revelry":          "Bard",           // music, performance, the night's storyteller
  "lore+wayfaring":        "Pilgrim",        // travels to places of meaning & history
  "lore+wilds":            "Druid",          // wisdom of the land
  "revelry+wayfaring":     "Jetsetter",      // chases the scene city to city
  "revelry+wilds":         "Wildfire",       // bonfires, beach parties, open-air festivals
  "wayfaring+wilds":       "Trailblazer",    // blazes wild routes across regions
};
