<script lang="ts">
	import type { Transition } from '#lib/mixing.ts';

	type Props = { from: string; to: string; transition: Transition };

	let { from, to, transition }: Props = $props();

	const KEY_LABEL = {
		perfect: 'gleiche Tonart',
		compatible: 'harmonisch',
		clash: 'Tonart-Konflikt'
	};
	const BPM_LABEL = { good: 'BPM passt', ok: 'BPM knapp', bad: 'BPM-Sprung' };

	const tone = $derived(
		transition.key === 'clash' || transition.bpm === 'bad'
			? 'border-heading text-heading'
			: transition.score === 4
				? 'border-body text-body'
				: 'border-muted text-muted'
	);
	const icon = $derived(
		transition.key === 'clash' || transition.bpm === 'bad'
			? '✕'
			: transition.score === 4
				? '✓✓'
				: '✓'
	);
	const diff = $derived(
		`${transition.bpmDiffPercent >= 0 ? '+' : '−'}${Math.abs(transition.bpmDiffPercent).toLocaleString('de-DE', { maximumFractionDigits: 1 })} %`
	);
</script>

<div
	class="ml-8 inline-flex flex-wrap items-center gap-x-2 rounded-full border px-3 py-0.5 text-xs {tone}"
>
	<span aria-hidden="true">{icon}</span>
	<span>{from} → {to} · {KEY_LABEL[transition.key]}</span>
	<span>· {BPM_LABEL[transition.bpm]} ({diff})</span>
</div>
