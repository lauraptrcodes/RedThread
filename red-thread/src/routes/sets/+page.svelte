<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { SET_NAME_MAX } from '#lib/sets.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<main class="mx-auto grid max-w-3xl gap-8 px-4 py-10">
	<h1 class="text-4xl">Sets</h1>

	<form
		method="POST"
		action="?/createSet"
		use:enhance
		class="flex flex-wrap items-start gap-3 rounded-xl border-2 border-accent p-6"
	>
		<label class="grid min-w-0 flex-1 gap-1">
			<span class="text-sm text-muted">Name des neuen Sets</span>
			<input
				name="name"
				required
				maxlength={SET_NAME_MAX}
				value={form?.values?.name ?? ''}
				placeholder="z. B. Freitag Warm-up"
				class="w-full rounded-md border-2 border-accent bg-background px-3 py-2 text-body placeholder:text-muted focus:border-heading focus:outline-none"
			/>
			{#if form?.errors?.name}<span class="text-sm text-heading">{form.errors.name}</span>{/if}
		</label>
		<button
			type="submit"
			class="mt-6 rounded-md bg-accent px-5 py-2 font-semibold text-body hover:bg-heading hover:text-background"
		>
			Anlegen
		</button>
	</form>

	{#if data.sets.length === 0}
		<p class="text-muted">Noch keine Sets.</p>
	{:else}
		<ul class="grid gap-2">
			{#each data.sets as set (set.id)}
				<li class="flex flex-wrap items-center justify-between gap-2 border-b border-accent pb-2">
					<a href={resolve('/sets/[id]', { id: String(set.id) })} class="font-semibold"
						>{set.name}</a
					>
					<span class="flex items-center gap-4">
						<span class="text-sm text-muted">
							{set.trackCount}
							{set.trackCount === 1 ? 'Track' : 'Tracks'}
						</span>
						<form
							method="POST"
							action="?/deleteSet"
							use:enhance={({ cancel }) => {
								if (!confirm(`Set „${set.name}“ löschen?`)) cancel();
							}}
						>
							<input type="hidden" name="setId" value={set.id} />
							<button type="submit" class="text-sm text-muted hover:text-heading">Löschen</button>
						</form>
					</span>
				</li>
			{/each}
		</ul>
	{/if}
</main>
