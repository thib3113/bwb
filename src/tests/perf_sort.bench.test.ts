import { describe, it, expect } from 'vitest';
import { BoksCode, CodeStatus, CodeType } from '../types';
import { CODE_STATUS } from '../constants/codeStatus';

// --- Original Logic (Copied for Baseline) ---
const sortCodesByPriorityOriginal = (codes: BoksCode[]) => {
  const sorted = [...codes].sort((a, b) => {
    // Helper function to get priority group
    const getPriority = (code: BoksCode) => {
      // Priority 1: Pending codes (PENDING_ADD, PENDING_DELETE)
      if (code.status === CODE_STATUS.PENDING_ADD || code.status === CODE_STATUS.PENDING_DELETE) {
        return 1;
      }
      // Priority 2: Active codes (ON_DEVICE and not used)
      if (code.status === CODE_STATUS.ON_DEVICE || code.status === 'synced') {
        // For single-use codes, check if they've been used
        if (code.type === CodeType.SINGLE) {
          // Note: We can't use deriveCodeMetadata here due to circular dependency
          // For now, we'll just check if it's a single-use code
        }
        // For multi-use codes, check if they've been fully used
        if (code.type === CodeType.MULTI) {
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
  return sorted;
};

// --- Optimized Logic (Schwartzian Transform) ---
const sortCodesByPriorityOptimized = (codes: BoksCode[]) => {
  const getPriority = (code: BoksCode) => {
    if (code.status === CODE_STATUS.PENDING_ADD || code.status === CODE_STATUS.PENDING_DELETE) {
      return 1;
    }
    if (code.status === CODE_STATUS.ON_DEVICE || code.status === 'synced') {
      if (code.type === CodeType.MULTI) {
        if (
          code.uses !== undefined &&
          code.maxUses !== undefined &&
          code.uses >= code.maxUses
        ) {
          return 3;
        }
      }
      return 2;
    }
    return 3;
  };

  return codes
    .map((code) => {
      const date = new Date(code.created_at).getTime();
      return {
        code,
        priority: getPriority(code),
        date: isNaN(date) ? -Infinity : date, // Use -Infinity to push NaNs to the end (since we sort desc) ??
        // Wait, original logic:
        // if isNaN(dateA) return 1; -> A is greater than B -> A goes after B
        // if isNaN(dateB) return -1; -> B is greater than A -> B goes after A
        // So NaN is "smaller" than any valid date in descending sort?
        // Let's trace:
        // sort((a,b) => dateB - dateA) -> Descending.
        // If A is NaN: returns 1. means A > B in sort order? No, sort(a,b) > 0 means b comes first.
        // So A (NaN) is "larger" index-wise? i.e. comes later in the array.
        // So NaN is "smaller" value-wise.
        // -Infinity works for that if we sort by `dateB - dateA`.
        isNaNDate: isNaN(date),
      };
    })
    .sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      // Date Descending
      // Handle NaN exactly as original
      if (a.isNaNDate && b.isNaNDate) return 0;
      if (a.isNaNDate) return 1;
      if (b.isNaNDate) return -1;

      return b.date - a.date;
    })
    .map((item) => item.code);
};

describe('Sort Codes Performance', () => {
  it('benchmarks original vs optimized sort', () => {
    const CODE_COUNT = 5000;
    const codes: BoksCode[] = [];
    const statuses: CodeStatus[] = [
      CODE_STATUS.PENDING_ADD,
      CODE_STATUS.ON_DEVICE,
      CODE_STATUS.PENDING_DELETE,
      'synced' as CodeStatus,
      'rejected' as CodeStatus
    ];

    // Generate random codes
    for (let i = 0; i < CODE_COUNT; i++) {
      const status = statuses[i % statuses.length];
      const type =
        i % 3 === 0 ? CodeType.MULTI : i % 2 === 0 ? CodeType.SINGLE : CodeType.MASTER;

      codes.push({
        id: `code-${i}`,
        device_id: 'device-1',
        author_id: 'user-1',
        type,
        code: `123${i}`,
        name: `Code ${i}`,
        status,
        created_at: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
        sync_status: 'created',
        uses: i % 5,
        maxUses: 5
      });
    }

    // Add some bad dates
    codes.push({ ...codes[0], id: 'bad-date-1', created_at: 'invalid-date' });
    codes.push({ ...codes[1], id: 'bad-date-2', created_at: 'another-bad-one' });


    const startOriginal = performance.now();
    const sortedOriginal = sortCodesByPriorityOriginal(codes);
    const endOriginal = performance.now();

    const startOptimized = performance.now();
    const sortedOptimized = sortCodesByPriorityOptimized(codes);
    const endOptimized = performance.now();

    console.log(`Original Sort Time (${CODE_COUNT} codes): ${(endOriginal - startOriginal).toFixed(2)}ms`);
    console.log(`Optimized Sort Time (${CODE_COUNT} codes): ${(endOptimized - startOptimized).toFixed(2)}ms`);

    // Verification: Arrays should be identical
    expect(sortedOptimized.length).toBe(sortedOriginal.length);

    // Check order
    for(let i=0; i<sortedOriginal.length; i++) {
        expect(sortedOptimized[i].id).toBe(sortedOriginal[i].id);
    }
  });
});
