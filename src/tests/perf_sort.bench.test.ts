import { describe, it, expect } from 'vitest';
import { BoksCode } from '../types';
import { CODE_STATUS } from '../constants/codeStatus';
import { CODE_TYPES } from '../utils/constants';
import { sortCodes } from '../utils/codeUtils';

describe('Sort Codes Performance', () => {
  // --- Baseline Logic (Copy from useCodeLogic.ts) ---
  const baselineSort = (codes: BoksCode[]) => {
    return [...codes].sort((a, b) => {
      // Helper function to get priority group
      const getPriority = (code: BoksCode) => {
        // Priority 1: Pending codes (PENDING_ADD, PENDING_DELETE)
        if (code.status === CODE_STATUS.PENDING_ADD || code.status === CODE_STATUS.PENDING_DELETE) {
          return 1;
        }
        // Priority 2: Active codes (ON_DEVICE and not used)
        if (code.status === CODE_STATUS.ON_DEVICE || code.status === 'synced') {
          // For single-use codes, check if they've been used
          if (code.type === CODE_TYPES.SINGLE) {
            // Note: We can't use deriveCodeMetadata here due to circular dependency
            // For now, we'll just check if it's a single-use code
          }
          // For multi-use codes, check if they've been fully used
          if (code.type === CODE_TYPES.MULTI) {
            // If uses >= maxUses, they're considered used (priority 3)
            if (
              code.uses !== undefined &&
              code.maxUses !== undefined &&
              code.uses >= code.maxUses
            ) {
              return 3;
            }
          }
          // Otherwise, they're active (priority 2)
          return 2;
        }
        // Priority 3: Used codes (default case)
        return 3;
      };

      // Get priorities for both codes
      const priorityA = getPriority(a);
      const priorityB = getPriority(b);

      // If priorities are different, sort by priority
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // If priorities are the same, sort by creation date (descending - newest first)
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();

      // Handle potential NaN values
      if (isNaN(dateA) && isNaN(dateB)) return 0;
      if (isNaN(dateA)) return 1;
      if (isNaN(dateB)) return -1;

      return dateB - dateA;
    });
  };

  it('benchmarks baseline vs optimized sort', () => {
    // Generate data
    const COUNT = 10000;
    const codes: BoksCode[] = [];
    const statuses = [
        CODE_STATUS.PENDING_ADD,
        CODE_STATUS.PENDING_DELETE,
        CODE_STATUS.ON_DEVICE,
        CODE_STATUS.REJECTED
    ];
    const types = [CODE_TYPES.MASTER, CODE_TYPES.SINGLE, CODE_TYPES.MULTI];

    for (let i = 0; i < COUNT; i++) {
        codes.push({
            id: `code-${i}`,
            device_id: 'device-1',
            author_id: 'user-1',
            type: types[i % types.length] as any,
            code: '123456',
            name: `Code ${i}`,
            status: statuses[i % statuses.length] as any,
            created_at: new Date(Date.now() - Math.floor(Math.random() * 10000000000)).toISOString(),
            sync_status: 'created',
            uses: i % 5,
            maxUses: 3
        });
    }

    // Measure Baseline
    const startBaseline = performance.now();
    const resultBaseline = baselineSort(codes);
    const endBaseline = performance.now();
    const timeBaseline = endBaseline - startBaseline;

    // Measure Optimized
    const startOptimized = performance.now();
    const resultOptimized = sortCodes(codes);
    const endOptimized = performance.now();
    const timeOptimized = endOptimized - startOptimized;

    console.log(`Sort Benchmark (N=${COUNT}):`);
    console.log(`Baseline Time: ${timeBaseline.toFixed(2)}ms`);
    console.log(`Optimized Time: ${timeOptimized.toFixed(2)}ms`);
    console.log(`Speedup: ${(timeBaseline / timeOptimized).toFixed(2)}x`);

    expect(timeOptimized).toBeLessThan(timeBaseline);

    // Verify results are identical (sanity check on IDs)
    expect(resultBaseline.length).toBe(resultOptimized.length);
    for(let i=0; i<resultBaseline.length; i++) {
        expect(resultBaseline[i].id).toBe(resultOptimized[i].id);
    }
  });
});
