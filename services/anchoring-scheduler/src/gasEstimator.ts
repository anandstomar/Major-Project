// Simple gas estimator stub. Replace with real estimator (on-chain gas prices)
export function estimateGasForLeaves(leafCount: number): number {
  // naive: 5000 gas per leaf + 20000 base
  return Math.max(20000, 5000 * leafCount);
}
