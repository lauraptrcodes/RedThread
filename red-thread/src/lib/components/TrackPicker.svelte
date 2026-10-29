<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { isGoodTransition, type Transition } from '#lib/mixing.ts';

	type Track = {
		id: number;
		title: string;
		artist: string;
		bpm: number;
		camelotKey: string;
		energy: number | null;
	};

	type Props = {
		/** Available tracks, best match for the last set track first */
		suggestions: { track: Track; transition: Transition | null }[];
	};

	let { suggestions }: Props = $props();

	let query = $state('');

	const filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) return suggestions;
		return suggestions.filter(({ track }) =>
			`${track.title} ${track.artist}`.toLowerCase().includes(q)
		);
	});
</script>

{#if suggestions.length === 0}
	<p class="text-muted">
		Alle Tracks sind schon im Set. Neue Tracks legst du unter <a href={resolve('/')}>Tracks</a> an.
	</p>
{:else}
	<input
		type="search"
		bind:value={query}
		placeholder="Titel oder Artist suchen…"
		aria-label="Tracks filtern"
		class="w-full rounded-md border-2 border-accent bg-background px-3 py-2 text-body placeholder:text-muted focus:border-heading focus:outline-none"
	/>

	<ul class="grid gap-2">
		{#each filtered as { track, transition } (track.id)}
			{@const fits = transition && isGoodTransition(transition)}
			<li
				class="flex flex-wrap items-center gap-3 rounded-lg border-2 px-3 py-2 {fits
					? 'border-accent bg-accent/30'
					: 'border-transparent'}"
			>
				<span class="min-w-0 flex-1">
					<strong>{track.title}</strong> – {track.artist}
					<span class="block text-sm text-muted">
						{track.bpm} BPM · {track.camelotKey}{track.energy ? ` · Energy ${track.energy}` : ''}
					</span>
				</span>
				{#if fits}
					<span class="rounded-full bg-heading px-2 py-0.5 text-xs font-semibold text-background">
						passt
					</span>
				{/if}
				<form method="POST" action="?/addTrack" use:enhance>
					<input type="hidden" name="trackId" value={track.id} />
					<button
						type="submit"
						class="rounded-md bg-accent px-3 py-1 text-sm font-semibold text-body hover:bg-heading hover:text-background"
					>
						Hinzufügen
					</button>
				</form>
			</li>
		{:else}
			<li class="text-muted">Kein Track passt zur Suche.</li>
		{/each}
	</ul>
{/if}
