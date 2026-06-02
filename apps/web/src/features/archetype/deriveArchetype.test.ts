import { deriveArchetype } from './deriveArchetype';
declare let process: any;

interface TestCase {
  name: string;
  input: Parameters<typeof deriveArchetype>[0];
  expectedKind: 'pure' | 'hybrid' | 'default';
  expectedName: string;
  expectedPrimary: string | null;
  expectedSecondary: string | null;
}

const testCases: TestCase[] = [
  {
    name: 'G gastronomy: 50, wilds: 35 (ratio 1.43 >= 1.4) -> PURE Gourmand',
    input: { gastronomy: 50, wilds: 35 },
    expectedKind: 'pure',
    expectedName: 'Gourmand',
    expectedPrimary: 'gastronomy',
    expectedSecondary: 'wilds'
  },
  {
    name: 'G gastronomy: 50, wilds: 40 (ratio 1.25 < 1.4) -> HYBRID Forager',
    input: { gastronomy: 50, wilds: 40 },
    expectedKind: 'hybrid',
    expectedName: 'Forager',
    expectedPrimary: 'gastronomy',
    expectedSecondary: 'wilds'
  },
  {
    name: 'G wilds: 50, gastronomy: 40 (ratio 1.25 < 1.4) -> HYBRID Forager',
    input: { wilds: 50, gastronomy: 40 },
    expectedKind: 'hybrid',
    expectedName: 'Forager',
    expectedPrimary: 'wilds',
    expectedSecondary: 'gastronomy'
  },
  {
    name: 'G Empty input (0 XP) -> DEFAULT Wanderer',
    input: {},
    expectedKind: 'default',
    expectedName: 'Wanderer',
    expectedPrimary: null,
    expectedSecondary: null
  },
  {
    name: 'G Single pursuit (lore: 10) -> PURE Loremaster',
    input: { lore: 10 },
    expectedKind: 'pure',
    expectedName: 'Loremaster',
    expectedPrimary: 'lore',
    expectedSecondary: null
  }
];

function runTests() {
  console.log('=== RUNNING ARCHETYPE ENGINE TEST SUITE ===');
  let passedCount = 0;
  let failedCount = 0;

  testCases.forEach((tc, index) => {
    try {
      const result = deriveArchetype(tc.input);

      // Assert Kind
      if (result.kind !== tc.expectedKind) {
        throw new Error(`Expected kind "${tc.expectedKind}", but got "${result.kind}"`);
      }

      // Assert Name
      if (result.name !== tc.expectedName) {
        throw new Error(`Expected name "${tc.expectedName}", but got "${result.name}"`);
      }

      // Assert Primary
      if (result.primary !== tc.expectedPrimary) {
        throw new Error(`Expected primary "${tc.expectedPrimary}", but got "${result.primary}"`);
      }

      // Assert Secondary
      if (result.secondary !== tc.expectedSecondary) {
        throw new Error(`Expected secondary "${tc.expectedSecondary}", but got "${result.secondary}"`);
      }

      // Specific color checks for hybrid order reversal
      if (tc.input.wilds === 50 && tc.input.gastronomy === 40) {
        // wilds (primary) -> Green (#22C55E), gastronomy (secondary) -> Amber (#F59E0B)
        if (result.baseColor !== '#22C55E' || result.accentColor !== '#F59E0B') {
          throw new Error(`Expected colors (base: #22C55E, accent: #F59E0B) for wilds-dominant Forager, but got (base: ${result.baseColor}, accent: ${result.accentColor})`);
        }
      } else if (tc.input.gastronomy === 50 && tc.input.wilds === 40) {
        // gastronomy (primary) -> Amber (#F59E0B), wilds (secondary) -> Green (#22C55E)
        if (result.baseColor !== '#F59E0B' || result.accentColor !== '#22C55E') {
          throw new Error(`Expected colors (base: #F59E0B, accent: #22C55E) for gastronomy-dominant Forager, but got (base: ${result.baseColor}, accent: ${result.accentColor})`);
        }
      }

      console.log(`[PASS] Test #${index + 1}: ${tc.name}`);
      passedCount++;
    } catch (error: any) {
      console.error(`[FAIL] Test #${index + 1}: ${tc.name}`);
      console.error(`       Reason: ${error.message}`);
      failedCount++;
    }
  });

  console.log('\n=== TEST RESULTS SUMMARY ===');
  console.log(`PASSED: ${passedCount}`);
  console.log(`FAILED: ${failedCount}`);

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
