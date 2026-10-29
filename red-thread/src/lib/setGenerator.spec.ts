import { describe, expect, it } from 'vitest';
import { keyMatch } from './mixing';
import {
	effectiveEnergies,
	energyTargets,
	generateOrder,
	type GeneratorTrack
} from './setGenerator';

function track(id: number, energy: number | null, camelotKey = '8A', bpm = 124): GeneratorTrack {
	return { id, energy, camelotKey, bpm };
}

const sameKey = [track(1, 5), track(2, 1), track(3, 3), track(4, 9), track(5, 7), track(6, 2)];

describe('effectiveEnergies', () => {
	it('keeps known energies', () => {
		expect(effectiveEnergies([track(1, 4), track(2, 9)])).toEqual([
			{ value: 4, estimated: false },
			{ value: 9, estimated: false }
		]);
	});

	it('maps BPM to 1–10 when no track has energy', () => {
		const tracks = [
			track(1, null, '8A', 120),
			track(2, null, '8A', 130),
			track(3, null, '8A', 125)
		];
		expect(effectiveEnergies(tracks).map((e) => e.value)).toEqual([1, 10, 5.5]);
		expect(effectiveEnergies(tracks).every((e) => e.estimated)).toBe(true);
	});

	it('maps BPM onto the range of the known energies', () => {
		const tracks = [track(1, 4, '8A', 120), track(2, 8, '8A', 130), track(3, null, '8A', 125)];
		expect(effectiveEnergies(tracks)[2]).toEqual({ value: 6, estimated: true });
	});

	it('uses the middle when all BPMs are equal', () => {
		expect(effectiveEnergies([track(1, null), track(2, null)]).map((e) => e.value)).toEqual([
			5.5, 5.5
		]);
	});
});

describe('energyTargets', () => {
	it('follows the set’s own energy range', () => {
		const targets = energyTargets([track(1, 5), track(2, 8), track(3, 6)], 'build');
		expect(targets).toEqual([5, 6, 8]);
	});

	it('ignores energy in harmony mode', () => {
		expect(energyTargets(sameKey, 'harmony').every((t) => t === null)).toBe(true);
	});
});

describe('generateOrder', () => {
	it('contains every track exactly once', () => {
		const result = generateOrder(sameKey, { mode: 'valley', energyWeight: 0.5, seed: 1 });
		expect(result.tracks.map((t) => t.id).sort()).toEqual([1, 2, 3, 4, 5, 6]);
	});

	it('builds energy up in build mode', () => {
		const result = generateOrder(sameKey, { mode: 'build', energyWeight: 1, seed: 1 });
		expect(result.tracks.map((t) => t.energy)).toEqual([1, 2, 3, 5, 7, 9]);
	});

	it('starts and ends high in valley mode', () => {
		const result = generateOrder(sameKey, { mode: 'valley', energyWeight: 1, seed: 1 });
		const energies = result.tracks.map((t) => t.energy ?? 0);
		expect(Math.min(energies[0], energies[5])).toBeGreaterThan(Math.max(energies[2], energies[3]));
	});

	it('chains compatible keys in harmony mode', () => {
		const tracks = ['3A', '1A', '5A', '2A', '4A'].map((key, i) => track(i + 1, null, key));
		const result = generateOrder(tracks, { mode: 'harmony', energyWeight: 0.5, seed: 7 });
		const keys = result.tracks.map((t) => t.camelotKey);
		for (let i = 1; i < keys.length; i++) expect(keyMatch(keys[i - 1], keys[i])).not.toBe('clash');
	});

	it('returns the same order for the same seed', () => {
		const options = { mode: 'peak' as const, energyWeight: 0.5, seed: 42 };
		expect(generateOrder(sameKey, options).key).toBe(generateOrder(sameKey, options).key);
	});

	it('suggests a different order when the previous one is avoided', () => {
		const tracks = sameKey.map((t, i) => ({ ...t, camelotKey: `${i + 1}A`, energy: 5 }));
		const first = generateOrder(tracks, { mode: 'harmony', energyWeight: 0, seed: 3 });
		const second = generateOrder(tracks, {
			mode: 'harmony',
			energyWeight: 0,
			seed: 4,
			avoid: [first.key]
		});
		expect(second.key).not.toBe(first.key);
		expect(second.isRepeat).toBe(false);
	});

	it('uses BPM as energy when the tracks have none', () => {
		const tracks = [128, 120, 124, 132, 122].map((bpm, i) => track(i + 1, null, '8A', bpm));
		const result = generateOrder(tracks, { mode: 'build', energyWeight: 1, seed: 1 });
		expect(result.tracks.map((t) => t.bpm)).toEqual([120, 122, 124, 128, 132]);
		expect(result.curveFit).not.toBeNull();
		expect(result.energies.every((e) => e.estimated)).toBe(true);
	});
});
