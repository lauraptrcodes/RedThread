<script lang="ts">
	import TrackForm from '#lib/components/TrackForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<main class="mx-auto grid max-w-3xl gap-8 px-4 py-10">
	<h1 class="text-4xl">Red Thread</h1>

	<TrackForm {form} />

	<section class="grid gap-3">
		<h2 class="text-xl">Tracks ({data.tracks.length})</h2>

		{#if data.tracks.length === 0}
			<p class="text-muted">Noch keine Tracks.</p>
		{:else}
			<ul class="grid gap-2">
				{#each data.tracks as track (track.id)}
					<li
						class="flex flex-wrap items-baseline justify-between gap-2 border-b border-accent pb-2"
					>
						<span><strong>{track.title}</strong> – {track.artist}</span>
						<span class="text-sm text-muted">
							{track.bpm} BPM · {track.camelotKey}{track.energy ? ` · Energy ${track.energy}` : ''}
						</span>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</main>
