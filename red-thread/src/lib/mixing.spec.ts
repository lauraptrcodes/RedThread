import { describe, expect, it } from 'vitest';
import { bpmMatch, keyMatch, parseCamelot, rateTransition, suggestNext } from './mixing';

describe('parseCamelot', () => {
	it('splits number and mode', () => {
		expect(parseCamelot('12B')).toEqual({ number: 12, mode: 'B' });
	});

	it('rejects invalid keys', () => {
		expect(parseCamelot('13A')).toBeNull();
	});
});

describe('keyMatch', () => {
	it('rates the same key as perfect', () => {
		expect(keyMatch('8A', '8A')).toBe('perfect');
	});

	it('rates neighbours and relative major/minor as compatible', () => {
		expect(keyMatch('8A', '9A')).toBe('compatible');
		expect(keyMatch('8A', '7A')).toBe('compatible');
		expect(keyMatch('8A', '8B')).toBe('compatible');
	});

	it('wraps around 12 ↔ 1', () => {
		expect(keyMatch('12A', '1A')).toBe('compatible');
		expect(keyMatch('1B', '12B')).toBe('compatible');
	});

	it('rates everything else as clash', () => {
		expect(keyMatch('8A', '10A')).toBe('clash');
		expect(keyMatch('8A', '9B')).toBe('clash');
	});
});

describe('bpmMatch', () => {
	it('uses 3 % and 6 % thresholds', () => {
		expect(bpmMatch(100, 103)).toBe('good');
		expect(bpmMatch(100, 94)).toBe('ok');
		expect(bpmMatch(100, 107)).toBe('bad');
	});
});

describe('rateTransition', () => {
	it('combines key and bpm into a score', () => {
		expect(rateTransition({ bpm: 120, camelotKey: '8A' }, { bpm: 123, camelotKey: '9A' })).toEqual({
			key: 'compatible',
			bpm: 'good',
			bpmDiffPercent: 2.5,
			score: 3
		});
	});
});

describe('suggestNext', () => {
	const candidates = [
		{ id: 1, bpm: 140, camelotKey: '3B' },
		{ id: 2, bpm: 126, camelotKey: '8A' },
		{ id: 3, bpm: 124, camelotKey: '8A' },
		{ id: 4, bpm: 124, camelotKey: '9A' }
	];

	it('keeps the order when the set is empty', () => {
		expect(suggestNext(undefined, candidates).map((s) => s.track.id)).toEqual([1, 2, 3, 4]);
	});

	it('sorts by score, then by smaller bpm difference', () => {
		const last = { bpm: 124, camelotKey: '8A' };
		expect(suggestNext(last, candidates).map((s) => s.track.id)).toEqual([3, 2, 4, 1]);
	});
});
