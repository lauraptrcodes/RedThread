import { and, asc, count, desc, eq, getTableColumns, gt, lt, max, notInArray } from 'drizzle-orm';
import { db } from './db/index.ts';
import { sets, setTracks, tracks } from './db/schema.ts';

export async function listSets() {
	return db
		.select({ ...getTableColumns(sets), trackCount: count(setTracks.id) })
		.from(sets)
		.leftJoin(setTracks, eq(setTracks.setId, sets.id))
		.groupBy(sets.id)
		.orderBy(desc(sets.createdAt), desc(sets.id));
}

export async function getSetWithTracks(id: number) {
	const [set] = await db.select().from(sets).where(eq(sets.id, id));
	if (!set) return null;

	const setTrackList = await db
		.select({
			...getTableColumns(tracks),
			setTrackId: setTracks.id,
			position: setTracks.position
		})
		.from(setTracks)
		.innerJoin(tracks, eq(tracks.id, setTracks.trackId))
		.where(eq(setTracks.setId, id))
		.orderBy(asc(setTracks.position));

	const available = await db
		.select()
		.from(tracks)
		.where(
			notInArray(
				tracks.id,
				db.select({ id: setTracks.trackId }).from(setTracks).where(eq(setTracks.setId, id))
			)
		)
		.orderBy(asc(tracks.artist), asc(tracks.title));

	return { set, tracks: setTrackList, available };
}

export async function createSet(name: string) {
	const [set] = await db.insert(sets).values({ name }).returning({ id: sets.id });
	return set.id;
}

export async function deleteSet(id: number) {
	await db.transaction(async (tx) => {
		await tx.delete(setTracks).where(eq(setTracks.setId, id));
		await tx.delete(sets).where(eq(sets.id, id));
	});
}

/** Appends a track to the end of the set. Returns false if it is already in the set. */
export async function addTrackToSet(setId: number, trackId: number): Promise<boolean> {
	return db.transaction(async (tx) => {
		const [existing] = await tx
			.select({ id: setTracks.id })
			.from(setTracks)
			.where(and(eq(setTracks.setId, setId), eq(setTracks.trackId, trackId)));
		if (existing) return false;

		const [{ last }] = await tx
			.select({ last: max(setTracks.position) })
			.from(setTracks)
			.where(eq(setTracks.setId, setId));
		await tx.insert(setTracks).values({ setId, trackId, position: (last ?? 0) + 1 });
		return true;
	});
}

export async function removeTrackFromSet(setId: number, setTrackId: number) {
	await db.transaction(async (tx) => {
		await tx.delete(setTracks).where(and(eq(setTracks.id, setTrackId), eq(setTracks.setId, setId)));

		const remaining = await tx
			.select({ id: setTracks.id, position: setTracks.position })
			.from(setTracks)
			.where(eq(setTracks.setId, setId))
			.orderBy(asc(setTracks.position));
		for (const [i, row] of remaining.entries()) {
			if (row.position !== i + 1) {
				await tx
					.update(setTracks)
					.set({ position: i + 1 })
					.where(eq(setTracks.id, row.id));
			}
		}
	});
}

/** Swaps a track with its neighbour. Does nothing at the start or end of the set. */
export async function moveTrack(setId: number, setTrackId: number, direction: 'up' | 'down') {
	await db.transaction(async (tx) => {
		const [current] = await tx
			.select({ id: setTracks.id, position: setTracks.position })
			.from(setTracks)
			.where(and(eq(setTracks.id, setTrackId), eq(setTracks.setId, setId)));
		if (!current) return;

		const [neighbour] = await tx
			.select({ id: setTracks.id, position: setTracks.position })
			.from(setTracks)
			.where(
				and(
					eq(setTracks.setId, setId),
					direction === 'up'
						? lt(setTracks.position, current.position)
						: gt(setTracks.position, current.position)
				)
			)
			.orderBy(direction === 'up' ? desc(setTracks.position) : asc(setTracks.position))
			.limit(1);
		if (!neighbour) return;

		await tx
			.update(setTracks)
			.set({ position: neighbour.position })
			.where(eq(setTracks.id, current.id));
		await tx
			.update(setTracks)
			.set({ position: current.position })
			.where(eq(setTracks.id, neighbour.id));
	});
}

/**
 * Replaces the whole order of a set. Returns false if `setTrackIds` does not contain
 * exactly the tracks currently in the set (e.g. the set changed in the meantime).
 */
export async function reorderSet(setId: number, setTrackIds: number[]): Promise<boolean> {
	return db.transaction(async (tx) => {
		const current = await tx
			.select({ id: setTracks.id })
			.from(setTracks)
			.where(eq(setTracks.setId, setId));
		const currentIds = new Set(current.map((row) => row.id));
		if (
			setTrackIds.length !== currentIds.size ||
			new Set(setTrackIds).size !== setTrackIds.length ||
			!setTrackIds.every((id) => currentIds.has(id))
		) {
			return false;
		}

		for (const [i, id] of setTrackIds.entries()) {
			await tx
				.update(setTracks)
				.set({ position: i + 1 })
				.where(eq(setTracks.id, id));
		}
		return true;
	});
}
