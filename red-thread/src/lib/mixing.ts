import { isCamelotKey } from './camelot.ts';

export type MixableTrack = { bpm: number; camelotKey: string };

export type KeyMatch = 'perfect' | 'compatible' | 'clash';
export type BpmMatch = 'good' | 'ok' | 'bad';

export type Transition = {
	key: KeyMatch;
	bpm: BpmMatch;
	/** Signed BPM change from `from` to `to` in percent */
	bpmDiffPercent: number;
	/** 0–4, higher is smoother */
	score: number;
};

const KEY_SCORE: Record<KeyMatch, number> = { perfect: 2, compatible: 1, clash: 0 };
const BPM_SCORE: Record<BpmMatch, number> = { good: 2, ok: 1, bad: 0 };

export function parseCamelot(key: string): { number: number; mode: 'A' | 'B' } | null {
	if (!isCamelotKey(key)) return null;
	return { number: Number(key.slice(0, -1)), mode: key.slice(-1) as 'A' | 'B' };
}

export function keyMatch(a: string, b: string): KeyMatch {
	const from = parseCamelot(a);
	const to = parseCamelot(b);
	if (!from || !to) return 'clash';
	if (from.number === to.number && from.mode === to.mode) return 'perfect';
	// Relative major/minor
	if (from.number === to.number) return 'compatible';
	// Neighbours on the wheel, wrapping 12 ↔ 1
	const distance = Math.abs(from.number - to.number);
	if (from.mode === to.mode && (distance === 1 || distance === 11)) return 'compatible';
	return 'clash';
}

export function bpmDiffPercent(from: number, to: number): number {
	return ((to - from) / from) * 100;
}

export function bpmMatch(from: number, to: number): BpmMatch {
	const diff = Math.abs(bpmDiffPercent(from, to));
	if (diff <= 3) return 'good';
	if (diff <= 6) return 'ok';
	return 'bad';
}

export function rateTransition(from: MixableTrack, to: MixableTrack): Transition {
	const key = keyMatch(from.camelotKey, to.camelotKey);
	const bpm = bpmMatch(from.bpm, to.bpm);
	return {
		key,
		bpm,
		bpmDiffPercent: bpmDiffPercent(from.bpm, to.bpm),
		score: KEY_SCORE[key] + BPM_SCORE[bpm]
	};
}

export function isGoodTransition(transition: Transition): boolean {
	return transition.key !== 'clash' && transition.bpm !== 'bad';
}

/** Rates every candidate against the last track of the set and sorts the best first. */
export function suggestNext<T extends MixableTrack>(
	last: MixableTrack | undefined,
	candidates: T[]
): { track: T; transition: Transition | null }[] {
	if (!last) return candidates.map((track) => ({ track, transition: null }));

	return candidates
		.map((track) => ({ track, transition: rateTransition(last, track) }))
		.sort(
			(a, b) =>
				b.transition.score - a.transition.score ||
				Math.abs(a.transition.bpmDiffPercent) - Math.abs(b.transition.bpmDiffPercent)
		);
}
