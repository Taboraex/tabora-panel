import { GAMING_GRADES } from '@config/constants';

/**
 * Scoring for gaming endpoints.
 *
 * The generic scanner asks "does this edge respond, and how fast". That is the
 * wrong question for gaming. A route that averages 40 ms but swings between 20
 * and 200 feels far worse in a match than one that sits steadily on 90: the
 * game's interpolation can hide constant delay, but every jitter spike is a
 * rubber-band. Packet loss is worse still.
 *
 * So we sample each candidate several times and rank on stability, not speed.
 */

export interface Sample {
    /** Round-trip in ms, or -1 when the probe failed. */
    ms: number;
}

export interface EndpointStats {
    address: string;
    port: number;
    /** Median RTT of the successful probes. -1 when every probe failed. */
    medianMs: number;
    /** Median absolute deviation — spread of the RTTs, in ms. */
    jitterMs: number;
    /** Fraction of probes that failed, 0..1. */
    lossRate: number;
    /** Composite: lower is better. */
    score: number;
    grade: string;
    samples: number;
    ok: boolean;
}

export function median(values: number[]): number {
    if (!values.length) return -1;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2
        ? sorted[mid]
        : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/**
 * Median of successive differences — packet delay variation, as RFC 3550
 * defines jitter.
 *
 * Two rejected alternatives, both of which measure the wrong thing:
 *
 *   - Standard deviation lets one 2000 ms outlier (a retransmit, a browser GC
 *     pause) condemn an otherwise excellent edge.
 *   - Median absolute deviation ignores up to half the samples, so a route
 *     alternating 40/200/40/200 reports a *tiny* deviation and looks stable.
 *     That pattern is precisely what rubber-bands a match.
 *
 * Measuring the change between consecutive probes catches the alternating case
 * (large successive deltas) while a lone spike still moves the median barely
 * at all, because only two of the deltas involve it.
 */
export function jitter(values: number[]): number {
    if (values.length < 2) return 0;
    const deltas: number[] = [];
    for (let i = 1; i < values.length; i++) {
        deltas.push(Math.abs(values[i] - values[i - 1]));
    }
    return Math.round(median(deltas));
}

/**
 * Composite score, lower is better.
 *
 * Jitter is doubled because instability hurts more than latency, and loss is
 * multiplied by 500 ms so even a few percent outranks any latency advantage —
 * a lossy route is unplayable regardless of how fast its good packets are.
 */
export function scoreOf(medianMs: number, jitterMs: number, lossRate: number): number {
    if (medianMs < 0) return Infinity;
    return medianMs + 2 * jitterMs + 500 * lossRate;
}

export function gradeOf(score: number): string {
    for (const { grade, maxScore } of GAMING_GRADES) {
        if (score <= maxScore) return grade;
    }
    return 'D';
}

/** Reduce raw probe samples for one endpoint into ranked statistics. */
export function summarise(address: string, port: number, samples: Sample[]): EndpointStats {
    const good = samples.filter((s) => s.ms >= 0).map((s) => s.ms);
    const lossRate = samples.length ? 1 - good.length / samples.length : 1;

    // Everything failed: report it as unusable rather than inventing a score.
    if (!good.length) {
        return {
            address, port,
            medianMs: -1, jitterMs: 0, lossRate: 1,
            score: Infinity, grade: 'D', samples: samples.length, ok: false,
        };
    }

    const med = median(good);
    const jit = jitter(good);
    const score = scoreOf(med, jit, lossRate);

    return {
        address, port,
        medianMs: med,
        jitterMs: jit,
        lossRate: Number(lossRate.toFixed(3)),
        score: Math.round(score),
        grade: gradeOf(score),
        samples: samples.length,
        ok: true,
    };
}

/** Best-first. Unreachable endpoints sink to the bottom. */
export const byScore = (a: EndpointStats, b: EndpointStats): number => {
    if (a.ok !== b.ok) return a.ok ? -1 : 1;
    return a.score - b.score;
};

export function rank(stats: EndpointStats[], keep = 10): EndpointStats[] {
    return [...stats].sort(byScore).slice(0, keep);
}
