<script lang="ts">
	import { enhance } from '$app/forms';
	import { rateTransition } from '#lib/mixing.ts';
	import {
		generateOrder,
		MODES,
		orderKey,
		type GeneratedOrder,
		type ModeId
	} from '#lib/setGenerator.ts';
	import EnergyChart from './EnergyChart.svelte';
	import TransitionBadge from './TransitionBadge.svelte';

	type SetTrack = {
		setTrackId: number;
		title: string;
		artist: string;
		bpm: number;
		camelotKey: string;
		energy: number | null;
	};
	type GenTrack = SetTrack & { id: number };

	let { tracks }: { tracks: SetTrack[] } = $props();

	let mode = $state<ModeId>('build');
	// 0 = only transitions … 100 = only energy curve
	let curveWeight = $state(50);
	let proposal = $state<{ basis: string; result: GeneratedOrder<GenTrack> } | null>(null);
	let repeatNotice = $state(false);
	// Orders already suggested for the current basis, so "Neu generieren" yields something new
	let shown: { basis: string; keys: string[] } = { basis: '', keys: [] };

	const genTracks = $derived(tracks.map((t) => ({ ...t, id: t.setTrackId })));
	const currentKey = $derived(orderKey(tracks.map((t) => t.setTrackId)));
	// A proposal is only valid for the tracks, mode and weight it was generated with
	const basis = $derived(
		`${[...tracks.map((t) => t.setTrackId)].sort((a, b) => a - b).join(',')}|${mode}|${curveWeight}`
	);
	const visible = $derived(proposal?.basis === basis ? proposal.result : null);
	const transitions = $derived(
		visible ? visible.tracks.slice(1).map((t, i) => rateTransition(visible.tracks[i], t)) : []
	);
	const missingEnergy = $derived(tracks.filter((t) => t.energy === null).length);

	function generate() {
		if (shown.basis !== basis) shown = { basis, keys: [] };
		const result = generateOrder(genTracks, {
			mode,
			energyWeight: curveWeight / 100,
			seed: Math.floor(Math.random() * 2 ** 32),
			avoid: [currentKey, ...shown.keys]
		});
		repeatNotice = result.isRepeat;
		// Start over once all good alternatives have been shown
		shown.keys = result.isRepeat ? [result.key] : [...shown.keys, result.key];
		proposal = { basis, result };
	}

	function sparkline(curve: ((t: number) => number) | null) {
		if (!curve) return 'M 2 12 L 58 12';
		return Array.from({ length: 21 }, (_, i) => {
			const t = i / 20;
			return `${i === 0 ? 'M' : 'L'} ${2 + t * 56} ${21 - curve(t) * 18}`;
		}).join(' ');
	}

	const percent = (value: number) => `${Math.round(value * 100)} %`;
</script>

{#if tracks.length < 2}
	<p class="text-muted">Füge mindestens zwei Tracks hinzu, um eine Reihenfolge vorzuschlagen.</p>
{:else}
	<div class="grid gap-5 rounded-xl border-2 border-accent p-6">
		<fieldset class="grid gap-2">
			<legend class="mb-2 text-sm text-muted">Modus</legend>
			<div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
				{#each MODES as m (m.id)}
					<label
						class="grid cursor-pointer gap-1 rounded-lg border-2 border-accent p-3 has-checked:border-heading has-checked:bg-accent/30 has-focus-visible:outline-2 has-focus-visible:outline-heading"
					>
						<input type="radio" name="mode" value={m.id} bind:group={mode} class="sr-only" />
						<svg viewBox="0 0 60 24" class="h-6 w-16 text-heading" aria-hidden="true">
							<path
								d={sparkline(m.curve)}
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-dasharray={m.curve ? undefined : '3 3'}
							/>
						</svg>
						<span class="font-semibold">{m.label}</span>
						<span class="text-xs text-muted">{m.description}</span>
					</label>
				{/each}
			</div>
		</fieldset>

		{#if mode !== 'harmony'}
			<label class="grid gap-1">
				<span class="text-sm text-muted">Gewichtung</span>
				<span class="flex items-center gap-3 text-sm">
					<span>Übergänge</span>
					<input
						type="range"
						min="0"
						max="100"
						step="5"
						bind:value={curveWeight}
						aria-valuetext="{100 - curveWeight} % Übergänge, {curveWeight} % Energiekurve"
						class="min-w-0 flex-1 accent-heading"
					/>
					<span>Energiekurve</span>
				</span>
			</label>
			{#if missingEnergy > 0}
				<p class="text-sm text-muted">
					{missingEnergy}
					{missingEnergy === 1 ? 'Track hat' : 'Tracks haben'} keine Energy-Angabe. Die Energie wird dann
					aus den BPM geschätzt: schnellere Tracks gelten als energiegeladener.
				</p>
			{/if}
		{/if}

		<button
			type="button"
			onclick={generate}
			class="justify-self-start rounded-md bg-accent px-5 py-2 font-semibold text-body hover:bg-heading hover:text-background"
		>
			{visible ? 'Neu generieren' : 'Vorschlag generieren'}
		</button>

		{#if visible}
			<div class="grid gap-4 border-t-2 border-accent pt-5">
				<p class="text-sm text-muted">
					Übergänge: <span class="text-body">{percent(visible.transitionQuality)}</span>
					{#if visible.curveFit !== null}
						· Energiekurve getroffen: <span class="text-body">{percent(visible.curveFit)}</span>
					{/if}
				</p>
				{#if repeatNotice}
					<p class="text-sm text-heading">
						Keine weitere gute Alternative gefunden, die Vorschläge wiederholen sich jetzt.
					</p>
				{/if}

				<EnergyChart energies={visible.energies} targets={visible.targets} />

				<ol class="grid gap-1">
					{#each visible.tracks as track, i (track.id)}
						{#if i > 0}
							<li class="list-none">
								<TransitionBadge
									from={visible.tracks[i - 1].camelotKey}
									to={track.camelotKey}
									transition={transitions[i - 1]}
								/>
							</li>
						{/if}
						<li class="flex flex-wrap items-baseline gap-3 px-1">
							<span class="w-5 text-right text-muted">{i + 1}</span>
							<span class="min-w-0 flex-1">
								<strong>{track.title}</strong> – {track.artist}
							</span>
							<span class="text-sm text-muted">
								{track.bpm} BPM · {track.camelotKey}{track.energy ? ` · E${track.energy}` : ''}
							</span>
						</li>
					{/each}
				</ol>

				<div class="flex flex-wrap gap-3">
					<form
						method="POST"
						action="?/applyOrder"
						use:enhance={() =>
							async ({ result, update }) => {
								await update();
								if (result.type === 'success') proposal = null;
							}}
					>
						<input type="hidden" name="order" value={visible.key} />
						<button
							type="submit"
							class="rounded-md bg-heading px-5 py-2 font-semibold text-background hover:bg-body"
						>
							Übernehmen
						</button>
					</form>
					<button
						type="button"
						onclick={() => (proposal = null)}
						class="rounded-md border-2 border-accent px-5 py-2 text-body hover:border-heading"
					>
						Verwerfen
					</button>
				</div>
			</div>
		{/if}
	</div>
{/if}
