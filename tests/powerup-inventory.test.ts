import { describe, it, expect } from 'vitest';

describe('Power-up Inventory State Machine & Non-Negative Clamp Invariant', () => {
  it('should acquire +3, use -1 three times, reach 0, and forbid -1 on further use', () => {
    let inventoryQuantity = 0;
    const transactions: Array<{ type: string; qty: number; balanceAfter: number }> = [];

    function processAcquire(qty: number) {
      const before = inventoryQuantity;
      inventoryQuantity += qty;
      transactions.push({ type: 'ACQUIRED', qty, balanceAfter: inventoryQuantity });
    }

    function processUse(requestedQty: number) {
      const before = inventoryQuantity;
      const actualDeduction = Math.min(requestedQty, before);
      inventoryQuantity = Math.max(0, before - actualDeduction);
      const txType = actualDeduction > 0 ? 'USED' : 'UNKNOWN';
      transactions.push({ type: txType, qty: -actualDeduction, balanceAfter: inventoryQuantity });
      return actualDeduction;
    }

    // Step 1: ACQUIRED +3
    processAcquire(3);
    expect(inventoryQuantity).toBe(3);
    expect(transactions[0].balanceAfter).toBe(3);

    // Step 2: USED -1
    processUse(1);
    expect(inventoryQuantity).toBe(2);

    // Step 3: USED -1
    processUse(1);
    expect(inventoryQuantity).toBe(1);

    // Step 4: USED -1
    processUse(1);
    expect(inventoryQuantity).toBe(0);

    // Step 5: Attempt to USE another -1 when balance is 0
    const deducted = processUse(1);
    expect(deducted).toBe(0); // Nothing could be deducted
    expect(inventoryQuantity).toBe(0); // Clamped at 0, never -1!
    expect(transactions[transactions.length - 1].balanceAfter).toBe(0);
    expect(transactions[transactions.length - 1].type).toBe('UNKNOWN');
  });
});
