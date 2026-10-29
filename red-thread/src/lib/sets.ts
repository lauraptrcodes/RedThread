export const SET_NAME_MAX = 100;

export type SetFormResult =
	{ ok: true; name: string } | { ok: false; values: { name: string }; errors: { name: string } };

export function parseSetForm(formData: FormData): SetFormResult {
	const name = String(formData.get('name') ?? '').trim();

	if (!name) return { ok: false, values: { name }, errors: { name: 'Name fehlt.' } };
	if (name.length > SET_NAME_MAX) {
		return {
			ok: false,
			values: { name },
			errors: { name: `Name darf höchstens ${SET_NAME_MAX} Zeichen haben.` }
		};
	}

	return { ok: true, name };
}

/** Parses a positive integer id from a route param or form field. */
export function parseId(value: unknown): number | null {
	const id = Number(value);
	return typeof value === 'string' && Number.isInteger(id) && id > 0 ? id : null;
}
