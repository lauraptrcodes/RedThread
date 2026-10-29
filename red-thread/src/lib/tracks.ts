import { toCamelot } from './camelot.ts';

export const BPM_MIN = 20;
export const BPM_MAX = 300;

export type NewTrack = {
	title: string;
	artist: string;
	bpm: number;
	camelotKey: string;
	energy: number | null;
};

export type TrackFormValues = Record<keyof NewTrack, string>;
export type TrackFormErrors = Partial<Record<keyof NewTrack, string>>;

export type TrackFormResult =
	{ ok: true; track: NewTrack } | { ok: false; values: TrackFormValues; errors: TrackFormErrors };

export function parseTrackForm(formData: FormData): TrackFormResult {
	return parseTrackInput({
		title: formData.get('title'),
		artist: formData.get('artist'),
		bpm: formData.get('bpm'),
		camelotKey: formData.get('camelotKey'),
		energy: formData.get('energy')
	});
}

/** Validates raw track input from a form or an import. Keys may be given in any notation `toCamelot` understands. */
export function parseTrackInput(input: Partial<Record<keyof NewTrack, unknown>>): TrackFormResult {
	const text = (value: unknown) =>
		value === null || value === undefined ? '' : String(value).trim();
	const rawKey = text(input.camelotKey);
	const values: TrackFormValues = {
		title: text(input.title),
		artist: text(input.artist),
		bpm: text(input.bpm).replace(',', '.'),
		camelotKey: toCamelot(rawKey) ?? rawKey,
		energy: text(input.energy)
	};
	const errors: TrackFormErrors = {};

	if (!values.title) errors.title = 'Titel fehlt.';
	if (!values.artist) errors.artist = 'Artist fehlt.';

	const bpm = Number(values.bpm);
	if (!values.bpm || !Number.isFinite(bpm) || bpm < BPM_MIN || bpm > BPM_MAX) {
		errors.bpm = `BPM muss zwischen ${BPM_MIN} und ${BPM_MAX} liegen.`;
	}

	if (!toCamelot(rawKey)) errors.camelotKey = 'Bitte eine Tonart wählen.';

	const energy = values.energy ? Number(values.energy) : null;
	if (energy !== null && (!Number.isInteger(energy) || energy < 1 || energy > 10)) {
		errors.energy = 'Energy muss zwischen 1 und 10 liegen.';
	}

	if (Object.keys(errors).length > 0) return { ok: false, values, errors };

	return {
		ok: true,
		track: {
			title: values.title,
			artist: values.artist,
			bpm,
			camelotKey: values.camelotKey,
			energy
		}
	};
}

/** Identifies a track by artist and title, ignoring case and extra whitespace. */
export function trackIdentity(track: { artist: string; title: string }): string {
	const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');
	return `${normalize(track.artist)}|${normalize(track.title)}`;
}
