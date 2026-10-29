<script lang="ts">
	import { enhance } from '$app/forms';
	import type { Transition } from '#lib/mixing.ts';
	import TransitionBadge from './TransitionBadge.svelte';

	type SetTrack = {
		setTrackId: number;
		title: string;
		artist: string;
		bpm: number;
		camelotKey: string;
		energy: number | null;
	};

	type Props = {
		tracks: SetTrack[];
		/** transitions[i] rates tracks[i] → tracks[i + 1] */
		transitions: Transition[];
	};

	let { tracks, transitions }: Props = $props();

	const buttonClass =
		'size-8 rounded-md border border-accent text-body hover:bg-accent disabled:opacity-30 disabled:hover:bg-transparent';
</script>

{#if tracks.length === 0}
	<p class="text-muted">Noch keine Tracks im Set. Füge unten welche hinzu.</p>
{:else}
	<ol class="grid gap-2">
		{#each tracks as track, i (track.setTrackId)}
			{#if i > 0}
				<li class="list-none">
					<TransitionBadge
						from={tracks[i - 1].camelotKey}
						to={track.camelotKey}
						transition={transitions[i - 1]}
					/>
				</li>
			{/if}
			<li class="flex flex-wrap items-center gap-3 rounded-lg border-2 border-accent px-3 py-2">
				<span class="w-5 text-right text-muted">{i + 1}</span>
				<span class="min-w-0 flex-1">
					<strong>{track.title}</strong> – {track.artist}
					<span class="block text-sm text-muted">
						{track.bpm} BPM · {track.camelotKey}{track.energy ? ` · Energy ${track.energy}` : ''}
					</span>
				</span>
				<span class="flex gap-1">
					<form method="POST" action="?/moveUp" use:enhance>
						<input type="hidden" name="setTrackId" value={track.setTrackId} />
						<button type="submit" disabled={i === 0} aria-label="Nach oben" class={buttonClass}>
							↑
						</button>
					</form>
					<form method="POST" action="?/moveDown" use:enhance>
						<input type="hidden" name="setTrackId" value={track.setTrackId} />
						<button
							type="submit"
							disabled={i === tracks.length - 1}
							aria-label="Nach unten"
							class={buttonClass}
						>
							↓
						</button>
					</form>
					<form method="POST" action="?/removeTrack" use:enhance>
						<input type="hidden" name="setTrackId" value={track.setTrackId} />
						<button type="submit" aria-label="Aus dem Set entfernen" class={buttonClass}>✕</button>
					</form>
				</span>
			</li>
		{/each}
	</ol>
{/if}
