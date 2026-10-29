<script lang="ts">
	import { resolve } from '$app/paths';
	import OrderGenerator from '#lib/components/OrderGenerator.svelte';
	import SetTrackList from '#lib/components/SetTrackList.svelte';
	import TrackPicker from '#lib/components/TrackPicker.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<main class="mx-auto grid max-w-3xl gap-8 px-4 py-10">
	<div class="grid gap-2">
		<a href={resolve('/sets')} class="text-sm">← Alle Sets</a>
		<h1 class="text-4xl wrap-break-word">{data.set.name}</h1>
	</div>

	{#if form?.message}
		<p class="rounded-md border-2 border-heading px-4 py-2 text-heading">{form.message}</p>
	{/if}

	<section class="grid gap-3">
		<h2 class="text-xl">Reihenfolge ({data.tracks.length})</h2>
		<SetTrackList tracks={data.tracks} transitions={data.transitions} />
	</section>

	<section class="grid gap-3">
		<h2 class="text-xl">Reihenfolge vorschlagen</h2>
		<OrderGenerator tracks={data.tracks} />
	</section>

	<section class="grid gap-3">
		<h2 class="text-xl">Tracks hinzufügen</h2>
		<TrackPicker suggestions={data.suggestions} />
	</section>
</main>
