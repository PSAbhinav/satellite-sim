// Newton's method for Kepler's equation: M = E - e·sin(E).

export function solveKepler(M: number, e: number, tol = 1e-10, maxIter = 50): number {
  // Normalize mean anomaly to [-π, π] for a good starting guess.
  let m = M % (2 * Math.PI);
  if (m > Math.PI) m -= 2 * Math.PI;
  if (m < -Math.PI) m += 2 * Math.PI;

  let E = e < 0.8 ? m : Math.PI * Math.sign(m || 1);
  for (let i = 0; i < maxIter; i++) {
    const f = E - e * Math.sin(E) - m;
    const fp = 1 - e * Math.cos(E);
    const dE = f / fp;
    E -= dE;
    if (Math.abs(dE) < tol) break;
  }
  return E;
}
