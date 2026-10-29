import { fail } from '@sveltejs/kit';
import { existingTrackIdentities, importTracks } from '#lib/server/tracks.ts';
import { parseTrackInput, type NewTrack } from '#lib/tracks.ts';
import type { Actions, PageServerLoad } from './$types';

const MAX_IMPORT = 10_000;

export const load: PageServerLoad = async () => {
	return { existingIdentities: await existingTrackIdentities() };
};

export const actions: Actions = {
	importTracks: async ({ request }) => {
		let rows: unknown;
		try {
			rows = JSON.parse(String((await request.formData()).get('tracks') ?? ''));
		} catch {
			return fail(400, { message: 'Die Import-Daten sind ungültig.' });
		}
		if (!Array.isArray(rows) || rows.length === 0) {
			return fail(400, { message: 'Keine Tracks zum Importieren ausgewählt.' });
		}
		if (rows.length > MAX_IMPORT) {
			return fail(400, { message: `Höchstens ${MAX_IMPORT} Tracks pro Import.` });
		}

		const valid: NewTrack[] = [];
		let invalid = 0;
		for (const row of rows) {
			const result = typeof row === 'object' && row !== null ? parseTrackInput(row) : null;
			if (result?.ok) valid.push(result.track);
			else invalid++;
		}

		const { imported, skipped } = await importTracks(valid);
		return { imported, skipped, invalid };
	}
};
