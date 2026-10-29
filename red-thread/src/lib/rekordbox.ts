import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { toCamelot } from './camelot.ts';

/** A track from the Rekordbox collection, as raw strings ready for the import preview. */
export type RekordboxTrack = {
	id: string;
	title: string;
	artist: string;
	bpm: string;
	/** Camelot key if recognised, otherwise the original Rekordbox value */
	camelotKey: string;
	energy: string;
};

export type RekordboxPlaylist = {
	/** Folder path and name, e.g. "Clubs / Freitag" */
	name: string;
	trackIds: string[];
};

type Attributes = Record<string, string | undefined>;
type XmlTrack = Attributes & { TEMPO?: Attributes[] };
type XmlNode = Attributes & { NODE?: XmlNode[]; TRACK?: Attributes[] };

export class RekordboxParseError extends Error {}

const parser = new XMLParser({
	ignoreAttributes: false,
	attributeNamePrefix: '',
	parseAttributeValue: false,
	parseTagValue: false,
	htmlEntities: true,
	isArray: (name) => name === 'TRACK' || name === 'NODE' || name === 'TEMPO'
});

/** Parses a Rekordbox collection export (File → Export Collection in xml format). */
export function parseRekordboxXml(xml: string): {
	tracks: RekordboxTrack[];
	playlists: RekordboxPlaylist[];
} {
	if (XMLValidator.validate(xml) !== true) {
		throw new RekordboxParseError('Die Datei ist keine gültige XML-Datei.');
	}
	const root = parser.parse(xml)?.DJ_PLAYLISTS;
	if (!root?.COLLECTION) {
		throw new RekordboxParseError('Die Datei ist kein Rekordbox-XML-Export.');
	}

	const xmlTracks: XmlTrack[] = root.COLLECTION.TRACK ?? [];
	const idByLocation = new Map(
		xmlTracks.flatMap((t) => (t.Location && t.TrackID ? [[t.Location, t.TrackID] as const] : []))
	);

	const tracks = xmlTracks.filter((t) => t.TrackID).map(toTrack);

	const playlists: RekordboxPlaylist[] = [];
	function walk(node: XmlNode, path: string[]) {
		for (const child of node.NODE ?? []) {
			const childPath = [...path, child.Name ?? ''];
			if (child.Type === '1') {
				// KeyType 0 references tracks by TrackID, KeyType 1 by Location
				const trackIds = (child.TRACK ?? []).flatMap((entry) => {
					const id = child.KeyType === '1' ? idByLocation.get(entry.Key ?? '') : entry.Key;
					return id ? [id] : [];
				});
				playlists.push({ name: childPath.join(' / '), trackIds });
			} else {
				walk(child, childPath);
			}
		}
	}
	// The top-level NODE is the invisible "ROOT" folder
	for (const rootNode of root.PLAYLISTS?.NODE ?? []) walk(rootNode, []);

	return { tracks, playlists };
}

function toTrack(t: XmlTrack): RekordboxTrack {
	const comments = t.Comments ?? '';
	const tonality = t.Tonality ?? '';
	// Mixed In Key writes e.g. "8A - Energy 6" into the comments
	const commentKey = /\b(1[0-2]|0?[1-9])[AB]\b/i.exec(comments)?.[0] ?? '';
	const energy = /energy\s*[:-]?\s*(10|[1-9])\b/i.exec(comments)?.[1] ?? '';

	return {
		id: t.TrackID ?? '',
		title: t.Name?.trim() ?? '',
		artist: t.Artist?.trim() ?? '',
		bpm: formatBpm(t.AverageBpm) || formatBpm(t.TEMPO?.[0]?.Bpm),
		camelotKey: toCamelot(tonality) ?? toCamelot(commentKey) ?? tonality,
		energy
	};
}

function formatBpm(value: string | undefined): string {
	const bpm = Number(value);
	return Number.isFinite(bpm) && bpm > 0 ? String(Math.round(bpm * 100) / 100) : '';
}
