import { create } from 'zustand';
import { 
  PursuitKey, 
  LEVEL_CURVE_K,
  pursuits
} from './pursuits.config';
import { deriveArchetype, DerivedArchetype } from '../archetype/deriveArchetype';
import { persistPursuitXP } from './pursuitsData';
import { useToastStore } from '../../stores/toastStore';

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
  hydrateStore: (records: { pursuit_key: string; xp: number }[]) => void;
  grantPursuitXP: (
    grants: { pursuit: PursuitKey; amount: number }[],
    opts?: { reason?: string; localOnly?: boolean }
  ) => Promise<void>;

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
    // Dev Panel trigger or quick update
    get().grantPursuitXP([{ pursuit: key, amount }], { reason: 'Dev Mode' });
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

  hydrateStore: (records) => {
    const mergedXP = { ...initialXP };
    records.forEach(rec => {
      const key = rec.pursuit_key as PursuitKey;
      if (mergedXP[key] !== undefined) {
        mergedXP[key] = rec.xp;
      }
    });
    set({ pursuitXP: mergedXP });
  },

  grantPursuitXP: async (grants, opts) => {
    const { addToast } = useToastStore.getState();
    const oldArchetype = get().getArchetype();

    // 1. Compute optimistic state
    const previousXP = { ...get().pursuitXP };
    const nextXP = { ...previousXP };

    grants.forEach(g => {
      nextXP[g.pursuit] = Math.max(0, (nextXP[g.pursuit] ?? 0) + g.amount);
    });

    // Apply optimistic update
    set({ pursuitXP: nextXP });

    const newArchetype = get().getArchetype();

    // Show toast: consolidated summary if reason is provided, else individual
    if (opts?.reason) {
      const summaryText = grants.map(g => `+${g.amount} ${pursuits[g.pursuit]?.noun || g.pursuit}`).join(' · ');
      addToast({
        message: `${opts.reason}: ${summaryText}`
      });
    } else {
      grants.forEach(g => {
        const noun = pursuits[g.pursuit]?.noun || g.pursuit;
        addToast({
          message: `+${g.amount} XP: ${noun}`
        });
      });
    }

    // Check if archetype changed
    if (oldArchetype.name !== newArchetype.name && oldArchetype.name !== 'Wanderer') {
      addToast({
        message: `🎉 You have become a ${newArchetype.name}! (Archetype evolved)`
      });
    }

    // If localOnly is true, bypass database persistence (trigger handles it)
    if (opts?.localOnly) {
      return;
    }

    // 2. Persist to database
    // TODO: move XP authority server-side
    const persistPromises = grants.map(g => persistPursuitXP(g.pursuit, g.amount));
    const results = await Promise.all(persistPromises);

    const firstError = results.find(r => !r.success)?.error;
    if (firstError) {
      console.error('Failed to persist XP grant. Rolling back optimistic update.', firstError);
      // Rollback
      set({ pursuitXP: previousXP });
      addToast({
        message: '⚠️ Connection error. XP progress could not be saved.'
      });
    }
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
