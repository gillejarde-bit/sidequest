import { create } from 'zustand';
import { 
  PursuitKey, 
  LEVEL_CURVE_K 
} from './pursuits.config';
import { deriveArchetype, DerivedArchetype } from '../archetype/deriveArchetype';

export interface PursuitsState {
  // State
  pursuitXP: Record<PursuitKey, number>;
  activeBorderId: string;
  unlockedBadgeIds: string[];

  // Actions
  addXP: (key: PursuitKey, amount: number) => void;
  resetXP: () => void;
  setBorder: (borderId: string) => void;
  toggleBadge: (badgeId: string) => void;

  // Derived Getters (Helper methods to access derived state cleanly)
  getTotalXP: () => number;
  getLevel: () => number;
  getXPProgress: () => {
    xpIntoCurrentLevel: number;
    xpForNextLevelTotal: number;
    progressPercent: number;
  };
  getArchetype: () => DerivedArchetype;
}

const initialXP: Record<PursuitKey, number> = {
  gastronomy: 0,
  wilds: 0,
  revelry: 0,
  athletics: 0,
  lore: 0,
  wayfaring: 0,
  fellowship: 0,
  discovery: 0
};

export const usePursuitsStore = create<PursuitsState>((set, get) => ({
  // Initial State
  pursuitXP: { ...initialXP },
  activeBorderId: 'standard',
  unlockedBadgeIds: [],

  // Actions
  addXP: (key, amount) => {
    set(state => ({
      pursuitXP: {
        ...state.pursuitXP,
        [key]: Math.max(0, (state.pursuitXP[key] ?? 0) + amount)
      }
    }));
  },

  resetXP: () => {
    set({
      pursuitXP: { ...initialXP }
    });
  },

  setBorder: (borderId) => {
    set({ activeBorderId: borderId });
  },

  toggleBadge: (badgeId) => {
    set(state => {
      const exists = state.unlockedBadgeIds.includes(badgeId);
      const newBadges = exists
        ? state.unlockedBadgeIds.filter(id => id !== badgeId)
        : [...state.unlockedBadgeIds, badgeId];
      return { unlockedBadgeIds: newBadges };
    });
  },

  // Derived Getters
  getTotalXP: () => {
    const { pursuitXP } = get();
    return Object.values(pursuitXP).reduce((sum, val) => sum + val, 0);
  },

  getLevel: () => {
    const totalXP = get().getTotalXP();
    return Math.floor(Math.sqrt(totalXP / LEVEL_CURVE_K)) + 1;
  },

  getXPProgress: () => {
    const totalXP = get().getTotalXP();
    const currentLevel = get().getLevel();
    
    // XP boundary definitions
    const xpForCurrentLevel = (currentLevel - 1) * (currentLevel - 1) * LEVEL_CURVE_K;
    const xpForNextLevelTotal = currentLevel * currentLevel * LEVEL_CURVE_K;
    
    const xpIntoCurrentLevel = totalXP - xpForCurrentLevel;
    const range = xpForNextLevelTotal - xpForCurrentLevel;
    const progressPercent = range > 0 ? Math.min(100, Math.max(0, (xpIntoCurrentLevel / range) * 100)) : 0;

    return {
      xpIntoCurrentLevel,
      xpForNextLevelTotal,
      progressPercent
    };
  },

  getArchetype: () => {
    const { pursuitXP } = get();
    return deriveArchetype(pursuitXP);
  }
}));
