<script lang="ts">
	import { enhance } from '$app/forms';
	import type { RekordboxPlaylist, RekordboxTrack } from '#lib/rekordbox.ts';
	import { parseTrackInput, trackIdentity, type TrackFormErrors } from '#lib/tracks.ts';

	type Props = {
		tracks: RekordboxTrack[];
		playlists: RekordboxPlaylist[];
		/** `trackIdentity` of every track already in the library */
		existingIdentities: string[];
	};

	let { tracks, playlists, existingIdentities }: Props = $props();

	// Rendering thousands of editable rows at once is slow, so the table grows on demand
	const PAGE_SIZE = 200;

	type Row = RekordboxTrack & { excluded: boolean };
	type Status =
		| { kind: 'ready' }
		| { kind: 'excluded' }
		| { kind: 'duplicate' }
		| { kind: 'invalid'; errors: TrackFormErrors };

	// Editable copy of the parsed tracks; edits survive switching playlists.
	// Initial value only on purpose: the page re-creates this component for every new file.
	// svelte-ignore state_referenced_locally
	let rows = $state<Row[]>(tracks.map((t) => ({ ...t, excluded: false })));
	let playlistIndex = $state(-1);
	let onlyProblems = $state(false);
	let limit = $state(PAGE_SIZE);

	const existing = $derived(new Set(existingIdentities));
	const rowById = $derived(new Map(rows.map((row) => [row.id, row])));

	const scope = $derived(
		playlistIndex === -1
			? rows
			: playlists[playlistIndex].trackIds.flatMap((id) => rowById.get(id) ?? [])
	);

	function statusOf(row: Row): Status {
		if (existing.has(trackIdentity(row))) return { kind: 'duplicate' };
		const result = parseTrackInput(row);
		if (!result.ok) return { kind: 'invalid', errors: result.errors };
		return row.excluded ? { kind: 'excluded' } : { kind: 'ready' };
	}

	const statuses = $derived(new Map(scope.map((row) => [row, statusOf(row)])));
	const counts = $derived.by(() => {
		const c = { ready: 0, excluded: 0, duplicate: 0, invalid: 0 };
		for (const status of statuses.values()) c[status.kind]++;
		return c;
	});
	const ready = $derived(scope.filter((row) => statuses.get(row)?.kind === 'ready'));
	const filtered = $derived(
		onlyProblems ? scope.filter((row) => statuses.get(row)?.kind === 'invalid') : scope
	);
	const visible = $derived(filtered.slice(0, limit));

	const payload = $derived(
		JSON.stringify(
			ready.map(({ title, artist, bpm, camelotKey, energy }) => ({
				title,
				artist,
				bpm,
				camelotKey,
				energy
			}))
		)
	);

	let submitting = $state(false);

	function setExcluded(excluded: boolean) {
		for (const row of filtered) row.excluded = excluded;
	}

	const cellInput =
		'w-full min-w-0 rounded border border-transparent bg-transparent px-1.5 py-1 text-body hover:border-accent focus:border-heading focus:outline-none aria-invalid:border-heading';
</script>

<section class="grid gap-4">
	<div class="flex flex-wrap items-end gap-4">
		{#if playlists.length > 0}
			<label class="grid gap-1">
				<span class="text-sm text-muted">Auswahl</span>
				<select
					bind:value={playlistIndex}
					onchange={() => (limit = PAGE_SIZE)}
					class="rounded-md border-2 border-accent bg-background px-3 py-2 text-body focus:border-heading focus:outline-none"
				>
					<option value={-1}>Ganze Collection ({rows.length})</option>
					{#each playlists as playlist, i (i)}
						<option value={i}>{playlist.name} ({playlist.trackIds.length})</option>
					{/each}
				</select>
			</label>
		{/if}
		<label class="flex items-center gap-2 py-2 text-sm">
			<input type="checkbox" bind:checked={onlyProblems} class="accent-heading" />
			Nur unvollständige anzeigen
		</label>
		<span class="flex gap-2 py-2 text-sm">
			<button type="button" onclick={() => setExcluded(false)} class="hover:text-heading">
				Alle auswählen
			</button>
			<span class="text-muted">·</span>
			<button type="button" onclick={() => setExcluded(true)} class="hover:text-heading">
				Keine
			</button>
		</span>
	</div>

	<p class="text-sm text-muted">
		<span class="text-body">{counts.ready} bereit</span>
		· {counts.invalid} unvollständig · {counts.duplicate} schon vorhanden
		{#if counts.excluded}· {counts.excluded} abgewählt{/if}
		{#if counts.invalid}
			<br />Unvollständige Tracks kannst du direkt in der Tabelle ergänzen. Tonarten dürfen auch als
			„Am“ oder „F#“ eingegeben werden.
		{/if}
	</p>

	<div class="overflow-x-auto rounded-lg border-2 border-accent">
		<table class="w-full min-w-[46rem] text-sm">
			<thead class="bg-accent/30 text-left text-muted">
				<tr>
					<th class="w-10 px-2 py-2"><span class="sr-only">Importieren</span></th>
					<th class="px-2 py-2 font-normal">Titel</th>
					<th class="px-2 py-2 font-normal">Artist</th>
					<th class="w-20 px-2 py-2 font-normal">BPM</th>
					<th class="w-20 px-2 py-2 font-normal">Key</th>
					<th class="w-16 px-2 py-2 font-normal">Energy</th>
					<th class="w-36 px-2 py-2 font-normal">Status</th>
				</tr>
			</thead>
			<tbody>
				{#each visible as row (row.id)}
					{@const status = statuses.get(row)}
					{@const errors = status?.kind === 'invalid' ? status.errors : {}}
					<tr class="border-t border-accent {status?.kind === 'duplicate' ? 'opacity-50' : ''}">
						<td class="px-2 py-1 text-center">
							<input
								type="checkbox"
								checked={status?.kind === 'ready'}
								disabled={status?.kind === 'duplicate' || status?.kind === 'invalid'}
								onchange={(e) => (row.excluded = !e.currentTarget.checked)}
								aria-label="{row.title} importieren"
								class="accent-heading"
							/>
						</td>
						<td class="px-1 py-1">
							<input
								bind:value={row.title}
								aria-label="Titel"
								aria-invalid={!!errors.title}
								class={cellInput}
							/>
						</td>
						<td class="px-1 py-1">
							<input
								bind:value={row.artist}
								aria-label="Artist"
								aria-invalid={!!errors.artist}
								class={cellInput}
							/>
						</td>
						<td class="px-1 py-1">
							<input
								bind:value={row.bpm}
								inputmode="decimal"
								aria-label="BPM"
								aria-invalid={!!errors.bpm}
								class={cellInput}
							/>
						</td>
						<td class="px-1 py-1">
							<input
								bind:value={row.camelotKey}
								placeholder="8A"
								aria-label="Key"
								aria-invalid={!!errors.camelotKey}
								class="{cellInput} placeholder:text-muted"
							/>
						</td>
						<td class="px-1 py-1">
							<input
								bind:value={row.energy}
								inputmode="numeric"
								placeholder="–"
								aria-label="Energy"
								aria-invalid={!!errors.energy}
								class="{cellInput} placeholder:text-muted"
							/>
						</td>
						<td class="px-2 py-1">
							{#if status?.kind === 'ready'}
								<span class="text-body">bereit</span>
							{:else if status?.kind === 'excluded'}
								<span class="text-muted">abgewählt</span>
							{:else if status?.kind === 'duplicate'}
								<span class="text-muted">schon vorhanden</span>
							{:else}
								<span class="text-heading">
									{[
										errors.title && 'Titel',
										errors.artist && 'Artist',
										errors.bpm && 'BPM',
										errors.camelotKey && 'Key',
										errors.energy && 'Energy'
									]
										.filter(Boolean)
										.join(', ')} prüfen
								</span>
							{/if}
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="7" class="px-3 py-4 text-muted">Keine Tracks in dieser Ansicht.</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	{#if filtered.length > visible.length}
		<button
			type="button"
			onclick={() => (limit += PAGE_SIZE)}
			class="justify-self-start rounded-md border-2 border-accent px-4 py-2 hover:border-heading"
		>
			Weitere anzeigen ({visible.length} von {filtered.length})
		</button>
	{/if}
</section>

<form
	method="POST"
	action="?/importTracks"
	use:enhance={() => {
		submitting = true;
		return async ({ update }) => {
			await update({ reset: false });
			submitting = false;
		};
	}}
	class="sticky bottom-0 flex flex-wrap items-center gap-4 border-t-2 border-accent bg-background py-4"
>
	<input type="hidden" name="tracks" value={payload} />
	<button
		type="submit"
		disabled={ready.length === 0 || submitting}
		class="rounded-md bg-heading px-5 py-2 font-semibold text-background hover:bg-body disabled:opacity-40 disabled:hover:bg-heading"
	>
		{submitting
			? 'Importiert…'
			: `${ready.length} ${ready.length === 1 ? 'Track' : 'Tracks'} importieren`}
	</button>
</form>
