// schema.ts
import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, real, index, unique } from 'drizzle-orm/sqlite-core';

export const tracks = sqliteTable('tracks', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	title: text('title').notNull(),
	artist: text('artist').notNull(),
	bpm: real('bpm').notNull(),
	camelotKey: text('camelot_key').notNull(), // z. B. "8A"
	energy: integer('energy') // 1–10
});

export const sets = sqliteTable('sets', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

// Ordered tracks of a set. `position` starts at 1 and is kept gapless by src/lib/server/sets.ts.
export const setTracks = sqliteTable(
	'set_tracks',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		setId: integer('set_id')
			.notNull()
			.references(() => sets.id, { onDelete: 'cascade' }),
		trackId: integer('track_id')
			.notNull()
			.references(() => tracks.id, { onDelete: 'cascade' }),
		position: integer('position').notNull()
	},
	(table) => [
		unique().on(table.setId, table.trackId),
		index('set_tracks_set_id_idx').on(table.setId)
	]
);
