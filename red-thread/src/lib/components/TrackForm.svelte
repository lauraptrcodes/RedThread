<script lang="ts">
	import { enhance } from '$app/forms';
	import { CAMELOT_KEYS } from '#lib/camelot.ts';
	import { BPM_MAX, BPM_MIN, type TrackFormErrors, type TrackFormValues } from '#lib/tracks.ts';

	type Props = {
		// Result of the `addTrack` action: invalid input to show again, or nothing
		form?: { values?: TrackFormValues; errors?: TrackFormErrors } | null;
	};

	let { form }: Props = $props();

	let submitting = $state(false);

	const values = $derived(form?.values);
	const errors = $derived(form?.errors ?? {});

	const inputClass =
		'w-full rounded-md border-2 border-accent bg-background px-3 py-2 text-body placeholder:text-muted focus:border-heading focus:outline-none';
</script>

<form
	method="POST"
	action="?/addTrack"
	class="grid gap-4 rounded-xl border-2 border-accent p-6"
	use:enhance={() => {
		submitting = true;
		return async ({ update }) => {
			await update();
			submitting = false;
		};
	}}
>
	<h2 class="text-xl">Track hinzufügen</h2>

	<div class="grid gap-4 sm:grid-cols-2">
		<label class="grid gap-1">
			<span class="text-sm text-muted">Titel</span>
			<input name="title" required value={values?.title ?? ''} class={inputClass} />
			{#if errors.title}<span class="text-sm text-heading">{errors.title}</span>{/if}
		</label>

		<label class="grid gap-1">
			<span class="text-sm text-muted">Artist</span>
			<input name="artist" required value={values?.artist ?? ''} class={inputClass} />
			{#if errors.artist}<span class="text-sm text-heading">{errors.artist}</span>{/if}
		</label>
	</div>

	<div class="grid gap-4 sm:grid-cols-3">
		<label class="grid gap-1">
			<span class="text-sm text-muted">BPM</span>
			<input
				name="bpm"
				type="number"
				step="0.1"
				min={BPM_MIN}
				max={BPM_MAX}
				required
				value={values?.bpm ?? ''}
				class={inputClass}
			/>
			{#if errors.bpm}<span class="text-sm text-heading">{errors.bpm}</span>{/if}
		</label>

		<label class="grid gap-1">
			<span class="text-sm text-muted">Tonart (Camelot)</span>
			<select name="camelotKey" required value={values?.camelotKey ?? ''} class={inputClass}>
				<option value="" disabled>–</option>
				{#each CAMELOT_KEYS as key (key)}
					<option value={key}>{key}</option>
				{/each}
			</select>
			{#if errors.camelotKey}<span class="text-sm text-heading">{errors.camelotKey}</span>{/if}
		</label>

		<label class="grid gap-1">
			<span class="text-sm text-muted">Energy (optional)</span>
			<select name="energy" value={values?.energy ?? ''} class={inputClass}>
				<option value="">–</option>
				{#each { length: 10 }, i (i)}
					<option value={String(i + 1)}>{i + 1}</option>
				{/each}
			</select>
			{#if errors.energy}<span class="text-sm text-heading">{errors.energy}</span>{/if}
		</label>
	</div>

	<button
		type="submit"
		disabled={submitting}
		class="justify-self-start rounded-md bg-accent px-5 py-2 font-semibold text-body hover:bg-heading hover:text-background disabled:opacity-50"
	>
		{submitting ? 'Speichert…' : 'Hinzufügen'}
	</button>
</form>
