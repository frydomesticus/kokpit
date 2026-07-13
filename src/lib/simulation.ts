export interface SimulationResult {
  mean: number;
  stdDev: number;
  drift: number;
  p5: number;
  p50: number;
  p95: number;
  successProbability: number; // 0 to 100 percentage
  histogram: { binStart: number; binEnd: number; count: number; isTargetBin: boolean }[];
}

export function runMonteCarloSimulation(
  nets: number[],
  remainingSundays: number,
  driftPerWeek: number,
  targetNet: number,
  iterations: number = 5000
): SimulationResult {
  if (nets.length === 0) {
    return {
      mean: 0,
      stdDev: 3,
      drift: 0,
      p5: 0,
      p50: 0,
      p95: 0,
      successProbability: 0,
      histogram: []
    };
  }

  // Calculate Mean
  const sum = nets.reduce((acc, val) => acc + val, 0);
  const mean = sum / nets.length;

  // Calculate Standard Deviation (fallback to 3 if < 2 elements)
  let stdDev = 3;
  if (nets.length >= 2) {
    const varianceSum = nets.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0);
    // Sample standard deviation (N-1)
    const variance = varianceSum / (nets.length - 1);
    stdDev = Math.sqrt(variance);
    // Guard against 0 standard deviation
    if (stdDev < 0.1) stdDev = 1.0;
  }

  // Learning Drift
  const drift = remainingSundays * driftPerWeek;

  // Perform iterations draws using Box-Muller
  const draws: number[] = [];
  let targetMetCount = 0;

  for (let i = 0; i < iterations; i++) {
    // Generate standard normal z
    let u1 = Math.random();
    let u2 = Math.random();
    // Avoid Math.log(0)
    while (u1 === 0) u1 = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

    // net_i = clamp(μ + drift + z·σ, 0, 120)
    let net = mean + drift + z * stdDev;
    if (net < 0) net = 0;
    if (net > 120) net = 120;

    draws.push(net);
    if (net >= targetNet) {
      targetMetCount++;
    }
  }

  // Sort draws to find percentiles
  draws.sort((a, b) => a - b);

  const p5 = draws[Math.floor(0.05 * iterations)];
  const p50 = draws[Math.floor(0.50 * iterations)];
  const p95 = draws[Math.floor(0.95 * iterations)];
  const successProbability = (targetMetCount / iterations) * 100;

  // Create 30 histogram bins from 0 to 120
  // Each bin has a width of 120 / 30 = 4 points.
  const numBins = 30;
  const binWidth = 120 / numBins;
  const histogram: { binStart: number; binEnd: number; count: number; isTargetBin: boolean }[] = [];

  for (let i = 0; i < numBins; i++) {
    const binStart = i * binWidth;
    const binEnd = (i + 1) * binWidth;
    histogram.push({
      binStart,
      binEnd,
      count: 0,
      isTargetBin: targetNet >= binStart && targetNet < binEnd
    });
  }

  // Populate bins
  for (const draw of draws) {
    let binIdx = Math.floor(draw / binWidth);
    if (binIdx >= numBins) binIdx = numBins - 1;
    if (binIdx < 0) binIdx = 0;
    histogram[binIdx].count++;
  }

  return {
    mean: parseFloat(mean.toFixed(2)),
    stdDev: parseFloat(stdDev.toFixed(2)),
    drift: parseFloat(drift.toFixed(2)),
    p5: parseFloat(p5.toFixed(2)),
    p50: parseFloat(p50.toFixed(2)),
    p95: parseFloat(p95.toFixed(2)),
    successProbability: parseFloat(successProbability.toFixed(1)),
    histogram
  };
}
