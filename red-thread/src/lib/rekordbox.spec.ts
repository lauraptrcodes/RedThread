import { describe, expect, it } from 'vitest';
import { parseRekordboxXml, RekordboxParseError } from './rekordbox';

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<DJ_PLAYLISTS Version="1.0.0">
  <PRODUCT Name="rekordbox" Version="7.0.0" Company="AlphaTheta"/>
  <COLLECTION Entries="4">
    <TRACK TrackID="1" Name="Strobe" Artist="deadmau5" AverageBpm="128.00" Tonality="Am" Comments="" Location="file://localhost/D:/Music/strobe.mp3">
      <TEMPO Inizio="0.025" Bpm="128.00" Metro="4/4" Battito="1"/>
    </TRACK>
    <TRACK TrackID="2" Name="Rock &amp; Roll" Artist="Eric Prydz " AverageBpm="0.00" Tonality="" Comments="8A - Energy 7" Location="file://localhost/D:/Music/rnr.mp3">
      <TEMPO Inizio="0.1" Bpm="125.50" Metro="4/4" Battito="1"/>
    </TRACK>
    <TRACK TrackID="3" Name="Mystery" Artist="Unknown" AverageBpm="" Tonality="X" Location="file://localhost/D:/Music/x.mp3"/>
    <TRACK TrackID="4" Name="Café" Artist="Anyma" AverageBpm="124.996" Tonality="F#" Location="file://localhost/D:/Music/cafe.mp3"/>
  </COLLECTION>
  <PLAYLISTS>
    <NODE Type="0" Name="ROOT" Count="2">
      <NODE Type="0" Name="Clubs" Count="1">
        <NODE Name="Freitag" Type="1" KeyType="0" Entries="2">
          <TRACK Key="2"/>
          <TRACK Key="1"/>
        </NODE>
      </NODE>
      <NODE Name="By Location" Type="1" KeyType="1" Entries="1">
        <TRACK Key="file://localhost/D:/Music/cafe.mp3"/>
      </NODE>
    </NODE>
  </PLAYLISTS>
</DJ_PLAYLISTS>`;

describe('parseRekordboxXml', () => {
	const { tracks, playlists } = parseRekordboxXml(xml);

	it('reads title, artist, bpm and key', () => {
		expect(tracks[0]).toEqual({
			id: '1',
			title: 'Strobe',
			artist: 'deadmau5',
			bpm: '128',
			camelotKey: '8A',
			energy: ''
		});
		expect(tracks[3]).toMatchObject({ title: 'Café', bpm: '125', camelotKey: '2B' });
	});

	it('falls back to the tempo marker and Mixed In Key comments', () => {
		expect(tracks[1]).toMatchObject({
			title: 'Rock & Roll',
			artist: 'Eric Prydz',
			bpm: '125.5',
			camelotKey: '8A',
			energy: '7'
		});
	});

	it('keeps unknown values for manual correction', () => {
		expect(tracks[2]).toMatchObject({ bpm: '', camelotKey: 'X' });
	});

	it('reads playlists with folder path and both key types', () => {
		expect(playlists).toEqual([
			{ name: 'Clubs / Freitag', trackIds: ['2', '1'] },
			{ name: 'By Location', trackIds: ['4'] }
		]);
	});

	it('rejects files that are not a Rekordbox export', () => {
		expect(() => parseRekordboxXml('<foo/>')).toThrow(RekordboxParseError);
		expect(() => parseRekordboxXml('not xml <')).toThrow(RekordboxParseError);
	});
});
