<script lang="ts">
	import ImportPreview from '#lib/components/ImportPreview.svelte';
	import {
		parseRekordboxXml,
		RekordboxParseError,
		type RekordboxPlaylist,
		type RekordboxTrack
	} from '#lib/rekordbox.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let fileName = $state('');
	let parseError = $state('');
	let loading = $state(false);
	let imported = $state<{ tracks: RekordboxTrack[]; playlists: RekordboxPlaylist[] } | null>(null);

	async function onFile(event: Event & { currentTarget: HTMLInputElement }) {
		const file = event.currentTarget.files?.[0];
		if (!file) return;
		fileName = file.name;
		parseError = '';
		imported = null;
		loading = true;
		try {
			imported = parseRekordboxXml(await file.text());
			if (imported.tracks.length === 0) parseError = 'Die Datei enthält keine Tracks.';
		} catch (e) {
			parseError =
				e instanceof RekordboxParseError ? e.message : 'Die Datei konnte nicht gelesen werden.';
		} finally {
			loading = false;
		}
	}
</script>

<main class="mx-auto grid max-w-5xl gap-8 px-4 py-10">
	<div class="grid gap-2">
		<h1 class="text-4xl">Import</h1>
		<p class="text-muted">
			Tracks aus Rekordbox übernehmen. Exportiere dazu in Rekordbox deine Collection über
			<span class="text-body">File → Export Collection in xml format</span> und wähle die Datei hier aus.
			Sie wird nur in deinem Browser gelesen.
		</p>
	</div>

	<label
		class="grid cursor-pointer gap-2 rounded-xl border-2 border-dashed border-accent p-6 text-center hover:border-heading has-focus-visible:border-heading"
	>
		<span class="font-semibold">{fileName || 'Rekordbox-XML auswählen'}</span>
		<span class="text-sm text-muted">{loading ? 'Wird gelesen…' : '.xml-Datei'}</span>
		<input type="file" accept=".xml,text/xml,application/xml" onchange={onFile} class="sr-only" />
	</label>

	{#if parseError}
		<p class="rounded-md border-2 border-heading px-4 py-2 text-heading">{parseError}</p>
	{/if}

	{#if form?.message}
		<p class="rounded-md border-2 border-heading px-4 py-2 text-heading">{form.message}</p>
	{:else if form && 'imported' in form}
		<p class="rounded-md border-2 border-body px-4 py-2" role="status">
			{form.imported}
			{form.imported === 1 ? 'Track' : 'Tracks'} importiert.
			{#if form.skipped}{form.skipped} schon vorhanden und übersprungen.{/if}
			{#if form.invalid}{form.invalid} ungültig und übersprungen.{/if}
		</p>
	{/if}

	{#if imported && imported.tracks.length > 0}
		{#key imported}
			<ImportPreview
				tracks={imported.tracks}
				playlists={imported.playlists}
				existingIdentities={data.existingIdentities}
			/>
		{/key}
	{/if}
</main>
