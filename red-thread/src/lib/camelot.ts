// Camelot wheel keys: 1A–12A (minor) and 1B–12B (major)
export const CAMELOT_KEYS = (['A', 'B'] as const).flatMap((mode) =>
	Array.from({ length: 12 }, (_, i) => `${i + 1}${mode}`)
);

export function isCamelotKey(value: string): boolean {
	return CAMELOT_KEYS.includes(value);
}

const PITCH_CLASS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/**
 * Converts a key in Camelot ("8A"), Open Key ("1m", "1d") or musical notation
 * ("Am", "F#m", "Db", "C major") to Camelot. Returns null if it is not recognised.
 */
export function toCamelot(raw: string): string | null {
	const value = raw.trim().replace(/♯/g, '#').replace(/♭/g, 'b');

	const camelot = /^0?(1[0-2]|[1-9])\s*([AB])$/i.exec(value);
	if (camelot) return `${Number(camelot[1])}${camelot[2].toUpperCase()}`;

	// Open Key: 1m = Am = 8A, 1d = C = 8B
	const openKey = /^0?(1[0-2]|[1-9])\s*([md])$/i.exec(value);
	if (openKey) {
		return `${((Number(openKey[1]) + 6) % 12) + 1}${openKey[2].toLowerCase() === 'm' ? 'A' : 'B'}`;
	}

	const musical = /^([A-Ga-g])([#b]?)\s*(m|min|minor|maj|major)?$/i.exec(value);
	if (musical) {
		const accidental = musical[2] === '#' ? 1 : musical[2] === 'b' ? -1 : 0;
		const pitch = (PITCH_CLASS[musical[1].toUpperCase()] + accidental + 12) % 12;
		const minor = /^m(in|inor)?$/i.test(musical[3] ?? '');
		// Each fifth (7 semitones) is one step on the wheel; A minor and C major are 8
		const number = (((pitch * 7) % 12) + (minor ? 4 : 7)) % 12;
		return `${number + 1}${minor ? 'A' : 'B'}`;
	}

	return null;
}
