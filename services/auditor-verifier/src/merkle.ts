import crypto from 'crypto';

/**
 * Compute leaf hash from hex string (supports "0x" prefix)
 */
export function hashLeaf(hexRoot: string): Buffer {
  const h = hexRoot.startsWith('0x') ? hexRoot.slice(2) : hexRoot;
  // const bytes = Buffer.from(h, 'hex');
  // return crypto.createHash('sha256').update(bytes).digest();
  return Buffer.from(h, 'hex');
}

/**
 * Combine two buffers: hash( left || right )
 */
function hashPair(a: Buffer, b: Buffer): Buffer {
  // deterministic order: lexicographic - many merkle schemes do this, adjust if your scheme differs
  const left = Buffer.compare(a, b) <= 0 ? a : b;
  const right = Buffer.compare(a, b) <= 0 ? b : a;
  return crypto.createHash('sha256').update(Buffer.concat([left, right])).digest();
}

/**
 * Combine array of hex roots -> final hex root (no 0x prefix)
 */
export function combineRootsHex(hexRoots: string[]): string {
  if (!Array.isArray(hexRoots) || hexRoots.length === 0) {
    throw new Error('no roots');
  }
  let layer = hexRoots.map(r => hashLeaf(r));
  while (layer.length > 1) {
    const next: Buffer[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      if (i + 1 === layer.length) {
        // odd: carry up (hash of single child)
        next.push(layer[i]);
      } else {
        next.push(hashPair(layer[i], layer[i + 1]));
      }
    }
    layer = next;
  }
  return layer[0].toString('hex'); // no 0x
}
