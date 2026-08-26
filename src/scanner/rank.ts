import { isWorkerFrontIp } from './candidates';
import { pickDiverse } from './strategy';
import { gradeOf, jitter, median, scoreOf } from '@gaming/scoring';

/**
 * Rank browser measurements of Worker-front IPv4s.
 *
 * A single no-cors fetch can look fast and still be a dead colo. We require
 * several successful probes, a bounded loss rate, and we never pad `keep`
 * with addresses that dropped packets. Diversity prefers distinct /24s so
 * one throttled prefix cannot take every slot.
 */

export interface CleanMeasurement {
    address: string;
    samples: number[];
}

export interface CleanRank {
    address: string;
    medianMs: number;
    jitterMs: number;
    lossRate: number;
    score: number;
    grade: string;
    ok: boolean;
}

const MIN_SUCCESSES = 3;
/** 1 miss out of 3 (quick) or 1 miss out of 5 (smart/deep) still counts. */
const MAX_LOSS = 0.34;

/** Summarise one address. `ok` here only means "got at least one reply". */
function summarise(address: string, samples: number[]): CleanRank & { samplesHint: number } {
    const good = samples.filter((s) => s >= 0);
    const lossRate = samples.length ? 1 - good.length / samples.length : 1;
    if (!good.length) {
        return {
            address,
            medianMs: -1,
            jitterMs: 0,
            lossRate: 1,
            score: Number.POSITIVE_INFINITY,
            grade: 'D',
            ok: false,
            samplesHint: samples.length,
        };
    }
    const med = median(good);
    const jit = jitter(good);
    const score = scoreOf(med, jit, lossRate);
    return {
        address,
        medianMs: med,
        jitterMs: jit,
        lossRate: Number(lossRate.toFixed(3)),
        score: Math.round(score),
        grade: gradeOf(score),
        ok: true,
        samplesHint: samples.length,
    };
}

export function rankClean(
    measurements: CleanMeasurement[],
    keep: number,
): CleanRank[] {
    const rows: Array<CleanRank & { samplesHint: number }> = [];
    for (const m of measurements) {
        const ip = String(m.address ?? '').trim();
        if (!isWorkerFrontIp(ip)) continue;
        const samples = Array.isArray(m.samples) ? m.samples.map(Number) : [];
        rows.push(summarise(ip, samples));
    }

    const minSuccesses = rows.reduce((n, r) => Math.max(n, r.samplesHint), 0) >= 5 ? 3 : 2;
    const healthy = rows
        .filter((r) => {
            if (!r.ok || r.medianMs <= 0 || r.lossRate > MAX_LOSS) return false;
            const successes = samplesSuccess(r);
            return successes >= minSuccesses;
        })
        .sort((a, b) => a.score - b.score);

    return pickDiverse(healthy, Math.max(1, keep)).map(({ samplesHint: _s, ...row }) => row);
}

function samplesSuccess(row: { lossRate: number; samplesHint: number }): number {
    return Math.round((1 - row.lossRate) * row.samplesHint);
}
