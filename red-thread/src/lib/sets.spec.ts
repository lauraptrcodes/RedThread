import { describe, expect, it } from 'vitest';
import { parseId, parseSetForm, SET_NAME_MAX } from './sets';

function formData(name: string) {
	const data = new FormData();
	data.set('name', name);
	return data;
}

describe('parseSetForm', () => {
	it('trims the name', () => {
		expect(parseSetForm(formData('  Warm-up  '))).toEqual({ ok: true, name: 'Warm-up' });
	});

	it('rejects an empty name', () => {
		expect(parseSetForm(formData('   ')).ok).toBe(false);
	});

	it('rejects a name that is too long', () => {
		expect(parseSetForm(formData('x'.repeat(SET_NAME_MAX + 1))).ok).toBe(false);
	});
});

describe('parseId', () => {
	it('accepts positive integers', () => {
		expect(parseId('42')).toBe(42);
	});

	it('rejects everything else', () => {
		expect([parseId(''), parseId('0'), parseId('1.5'), parseId('abc'), parseId(null)]).toEqual([
			null,
			null,
			null,
			null,
			null
		]);
	});
});
