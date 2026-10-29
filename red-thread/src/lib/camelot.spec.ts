import { describe, expect, it } from 'vitest';
import { toCamelot } from './camelot';

describe('toCamelot', () => {
	it('keeps Camelot keys', () => {
		expect([toCamelot('8a'), toCamelot('08A'), toCamelot(' 12B ')]).toEqual(['8A', '8A', '12B']);
	});

	it('converts minor keys', () => {
		expect(['Am', 'Em', 'Cm', 'Abm', 'G#m', 'F#m', 'Dbm', 'Bbm'].map(toCamelot)).toEqual([
			'8A',
			'9A',
			'5A',
			'1A',
			'1A',
			'11A',
			'12A',
			'3A'
		]);
	});

	it('converts major keys', () => {
		expect(['C', 'G', 'B', 'F#', 'Gb', 'Db', 'Eb', 'E'].map(toCamelot)).toEqual([
			'8B',
			'9B',
			'1B',
			'2B',
			'2B',
			'3B',
			'5B',
			'12B'
		]);
	});

	it('understands long forms and unicode accidentals', () => {
		expect([toCamelot('A minor'), toCamelot('C major'), toCamelot('F♯m'), toCamelot('B♭')]).toEqual(
			['8A', '8B', '11A', '6B']
		);
	});

	it('converts Open Key', () => {
		expect([toCamelot('1m'), toCamelot('1d'), toCamelot('12m')]).toEqual(['8A', '8B', '7A']);
	});

	it('returns null for unknown values', () => {
		expect([toCamelot(''), toCamelot('H'), toCamelot('13A'), toCamelot('xyz')]).toEqual([
			null,
			null,
			null,
			null
		]);
	});
});
