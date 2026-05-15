/**
 * 1€ Filter for low-latency real-time smoothing of noisy 1D signals.
 *
 * Reference: Casiez et al. "1€ Filter: A Simple Speed-based Low-pass Filter
 * for Noisy Input in Interactive Systems" (CHI 2012).
 *   https://gery.casiez.net/1euro/
 *
 * Trade-off between jitter and lag is adaptive: when the signal moves slowly
 * the cutoff frequency drops (more smoothing); when it moves fast the cutoff
 * rises (less lag). Tuned per coordinate in CameraStream for bbox stability.
 */

export interface OneEuroFilterConfig {
  /** Minimum cutoff frequency in Hz. Lower = more smoothing at rest. */
  minCutoff: number;
  /** Speed coefficient. Higher = follows fast motion sooner. */
  beta: number;
  /** Cutoff frequency for derivative low-pass. */
  dCutoff: number;
}

const DEFAULT_CONFIG: OneEuroFilterConfig = {
  minCutoff: 1.0,
  beta: 0.012,
  dCutoff: 1.0,
};

class LowPass {
  private hatX: number | null = null;

  reset(): void {
    this.hatX = null;
  }

  filter(x: number, alpha: number): number {
    if (this.hatX === null) {
      this.hatX = x;
    } else {
      this.hatX = alpha * x + (1 - alpha) * this.hatX;
    }
    return this.hatX;
  }
}

function smoothingFactor(teMs: number, cutoffHz: number): number {
  const teSec = Math.max(teMs, 1) / 1000;
  const r = 2 * Math.PI * cutoffHz * teSec;
  return r / (r + 1);
}

export class OneEuroFilter {
  private readonly cfg: OneEuroFilterConfig;
  private readonly xFilter = new LowPass();
  private readonly dxFilter = new LowPass();
  private lastValue: number | null = null;
  private lastTimestampMs: number | null = null;

  constructor(config: Partial<OneEuroFilterConfig> = {}) {
    this.cfg = { ...DEFAULT_CONFIG, ...config };
  }

  reset(): void {
    this.xFilter.reset();
    this.dxFilter.reset();
    this.lastValue = null;
    this.lastTimestampMs = null;
  }

  filter(value: number, timestampMs: number): number {
    if (this.lastTimestampMs === null || this.lastValue === null) {
      this.lastTimestampMs = timestampMs;
      this.lastValue = value;
      return this.xFilter.filter(value, 1.0);
    }

    const teMs = timestampMs - this.lastTimestampMs;
    if (teMs <= 0) {
      return this.lastValue;
    }

    const dxRaw = (value - this.lastValue) * (1000 / teMs);
    const dxHat = this.dxFilter.filter(dxRaw, smoothingFactor(teMs, this.cfg.dCutoff));
    const cutoff = this.cfg.minCutoff + this.cfg.beta * Math.abs(dxHat);
    const hatX = this.xFilter.filter(value, smoothingFactor(teMs, cutoff));

    this.lastValue = hatX;
    this.lastTimestampMs = timestampMs;
    return hatX;
  }
}

/**
 * Convenience: independent 1€ filter for each component of a 4-tuple
 * bounding box (x1, y1, x2, y2). Each axis is filtered separately because
 * they're statistically independent under most face motion.
 */
export class OneEuroBoxFilter {
  private readonly fx1: OneEuroFilter;
  private readonly fy1: OneEuroFilter;
  private readonly fx2: OneEuroFilter;
  private readonly fy2: OneEuroFilter;

  constructor(config: Partial<OneEuroFilterConfig> = {}) {
    this.fx1 = new OneEuroFilter(config);
    this.fy1 = new OneEuroFilter(config);
    this.fx2 = new OneEuroFilter(config);
    this.fy2 = new OneEuroFilter(config);
  }

  filter(
    box: { x1: number; y1: number; x2: number; y2: number },
    timestampMs: number,
  ): { x1: number; y1: number; x2: number; y2: number } {
    return {
      x1: this.fx1.filter(box.x1, timestampMs),
      y1: this.fy1.filter(box.y1, timestampMs),
      x2: this.fx2.filter(box.x2, timestampMs),
      y2: this.fy2.filter(box.y2, timestampMs),
    };
  }

  reset(): void {
    this.fx1.reset();
    this.fy1.reset();
    this.fx2.reset();
    this.fy2.reset();
  }
}
