import { fail, redirect } from '@sveltejs/kit';
import { createSet, deleteSet, listSets } from '#lib/server/sets.ts';
import { parseId, parseSetForm } from '#lib/sets.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return { sets: await listSets() };
};

export const actions: Actions = {
	createSet: async ({ request }) => {
		const result = parseSetForm(await request.formData());
		if (!result.ok) return fail(400, { values: result.values, errors: result.errors });

		const id = await createSet(result.name);
		redirect(303, `/sets/${id}`);
	},

	deleteSet: async ({ request }) => {
		const id = parseId((await request.formData()).get('setId'));
		if (!id) return fail(400, { message: 'Ungültiges Set.' });

		await deleteSet(id);
	}
};
