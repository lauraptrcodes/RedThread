import { error, fail } from '@sveltejs/kit';
import { rateTransition, suggestNext } from '#lib/mixing.ts';
import {
	addTrackToSet,
	getSetWithTracks,
	moveTrack,
	removeTrackFromSet,
	reorderSet
} from '#lib/server/sets.ts';
import { parseId } from '#lib/sets.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const id = parseId(params.id);
	const result = id ? await getSetWithTracks(id) : null;
	if (!result) error(404, 'Set nicht gefunden');

	const { set, tracks, available } = result;
	return {
		set,
		tracks,
		// transitions[i] rates tracks[i] → tracks[i + 1]
		transitions: tracks.slice(1).map((track, i) => rateTransition(tracks[i], track)),
		suggestions: suggestNext(tracks.at(-1), available)
	};
};

async function readIds(request: Request, field: 'trackId' | 'setTrackId') {
	return parseId((await request.formData()).get(field));
}

export const actions: Actions = {
	addTrack: async ({ params, request }) => {
		const setId = parseId(params.id);
		const trackId = await readIds(request, 'trackId');
		if (!setId || !trackId) return fail(400, { message: 'Ungültiger Track.' });

		const added = await addTrackToSet(setId, trackId);
		if (!added) return fail(400, { message: 'Dieser Track ist schon im Set.' });
	},

	removeTrack: async ({ params, request }) => {
		const setId = parseId(params.id);
		const setTrackId = await readIds(request, 'setTrackId');
		if (!setId || !setTrackId) return fail(400, { message: 'Ungültiger Track.' });

		await removeTrackFromSet(setId, setTrackId);
	},

	moveUp: async ({ params, request }) => {
		const setId = parseId(params.id);
		const setTrackId = await readIds(request, 'setTrackId');
		if (!setId || !setTrackId) return fail(400, { message: 'Ungültiger Track.' });

		await moveTrack(setId, setTrackId, 'up');
	},

	moveDown: async ({ params, request }) => {
		const setId = parseId(params.id);
		const setTrackId = await readIds(request, 'setTrackId');
		if (!setId || !setTrackId) return fail(400, { message: 'Ungültiger Track.' });

		await moveTrack(setId, setTrackId, 'down');
	},

	applyOrder: async ({ params, request }) => {
		const setId = parseId(params.id);
		const order = String((await request.formData()).get('order') ?? '')
			.split(',')
			.map(parseId);
		if (!setId || order.some((id) => id === null)) {
			return fail(400, { message: 'Ungültige Reihenfolge.' });
		}

		const applied = await reorderSet(setId, order as number[]);
		if (!applied) {
			return fail(400, {
				message: 'Das Set hat sich inzwischen geändert. Bitte die Reihenfolge neu generieren.'
			});
		}
	}
};
