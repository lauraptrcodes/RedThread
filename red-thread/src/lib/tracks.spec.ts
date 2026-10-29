import { describe, expect, it } from 'vitest';
import { parseTrackForm } from './tracks';

function formData(fields: Record<string, string>) {
	const data = new FormData();
	for (const [key, value] of Object.entries(fields)) data.set(key, value);
	return data;
}

describe('parseTrackForm', () => {
	it('parses a valid track', () => {
		const result = parseTrackForm(
			formData({
				title: ' Strobe ',
				artist: 'deadmau5',
				bpm: '128,5',
				camelotKey: '8a',
				energy: '7'
			})
		);

		expect(result).toEqual({
			ok: true,
			track: { title: 'Strobe', artist: 'deadmau5', bpm: 128.5, camelotKey: '8A', energy: 7 }
		});
	});

	it('treats empty energy as null', () => {
		const result = parseTrackForm(
			formData({ title: 'A', artist: 'B', bpm: '120', camelotKey: '1B', energy: '' })
		);

		expect(result.ok && result.track.energy).toBeNull();
	});

	it('reports every invalid field', () => {
		const result = parseTrackForm(
			formData({ title: '', artist: '', bpm: '999', camelotKey: '13A', energy: '11' })
		);

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(Object.keys(result.errors).sort()).toEqual([
				'artist',
				'bpm',
				'camelotKey',
				'energy',
				'title'
			]);
		}
	});
});
