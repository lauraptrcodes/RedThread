<script lang="ts">
	import type { EffectiveEnergy } from '#lib/setGenerator.ts';

	type Props = {
		energies: EffectiveEnergy[];
		/** Target energy per position, null where there is no target */
		targets: (number | null)[];
	};

	let { energies, targets }: Props = $props();

	const WIDTH = 300;
	const HEIGHT = 90;
	const PAD = 8;

	const x = (i: number) =>
		energies.length < 2 ? WIDTH / 2 : PAD + (i * (WIDTH - 2 * PAD)) / (energies.length - 1);
	const y = (energy: number) => HEIGHT - PAD - ((energy - 1) / 9) * (HEIGHT - 2 * PAD);

	function points(values: (number | null)[]) {
		return values
			.map((v, i) => (v === null ? null : `${x(i)},${y(v)}`))
			.filter((p) => p !== null)
			.join(' ');
	}

	const hasTargets = $derived(targets.some((t) => t !== null));
	const estimatedCount = $derived(energies.filter((e) => e.estimated).length);
</script>

<figure class="grid gap-1">
	<svg
		viewBox="0 0 {WIDTH} {HEIGHT}"
		class="w-full rounded-lg border border-accent"
		role="img"
		aria-label="Energieverlauf des Vorschlags{hasTargets ? ' im Vergleich zur Zielkurve' : ''}"
	>
		{#if hasTargets}
			<polyline
				points={points(targets)}
				class="fill-none stroke-muted"
				stroke-width="1.5"
				stroke-dasharray="4 3"
			/>
		{/if}
		<polyline
			points={points(energies.map((e) => e.value))}
			class="fill-none stroke-heading"
			stroke-width="2"
		/>
		{#each energies as energy, i (i)}
			<circle
				cx={x(i)}
				cy={y(energy.value)}
				r="2.5"
				stroke-width="1.5"
				class={energy.estimated ? 'fill-background stroke-heading' : 'fill-heading'}
			/>
		{/each}
	</svg>
	<figcaption class="flex flex-wrap gap-4 text-xs text-muted">
		<span><span class="text-heading">●—</span> Energy der Tracks</span>
		{#if estimatedCount > 0}
			<span><span class="text-heading">○</span> aus BPM geschätzt ({estimatedCount})</span>
		{/if}
		{#if hasTargets}<span>- - - Zielkurve</span>{/if}
	</figcaption>
</figure>
