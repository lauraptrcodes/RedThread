import { db } from './db/index.ts';
import { tracks } from './db/schema.ts';
import { trackIdentity, type NewTrack } from '../tracks.ts';

// Rows per INSERT, well below SQLite's bound-parameter limit
const INSERT_CHUNK = 500;

export async function existingTrackIdentities(): Promise<string[]> {
	const rows = await db.select({ artist: tracks.artist, title: tracks.title }).from(tracks);
	return rows.map(trackIdentity);
}

/** Inserts tracks, skipping any that already exist (same artist and title) or repeat within the batch. */
export async function importTracks(newTracks: NewTrack[]) {
	return db.transaction(async (tx) => {
		const existing = await tx.select({ artist: tracks.artist, title: tracks.title }).from(tracks);
		const seen = new Set(existing.map(trackIdentity));
		const fresh = newTracks.filter((track) => {
			const identity = trackIdentity(track);
			if (seen.has(identity)) return false;
			seen.add(identity);
			return true;
		});

		for (let i = 0; i < fresh.length; i += INSERT_CHUNK) {
			await tx.insert(tracks).values(fresh.slice(i, i + INSERT_CHUNK));
		}
		return { imported: fresh.length, skipped: newTracks.length - fresh.length };
	});
}
