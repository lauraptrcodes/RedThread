import { fail } from '@sveltejs/kit';
import { desc } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { tracks } from '#lib/server/db/schema.ts';
import { parseTrackForm } from '#lib/tracks.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		tracks: await db.select().from(tracks).orderBy(desc(tracks.id))
	};
};

export const actions: Actions = {
	addTrack: async ({ request }) => {
		const result = parseTrackForm(await request.formData());
		if (!result.ok) return fail(400, { values: result.values, errors: result.errors });

		await db.insert(tracks).values(result.track);
		return { success: true };
	}
};
