import { rateTransition, type MixableTrack } from './mixing.ts';

export type GeneratorTrack = MixableTrack & { id: number; energy: number | null };

export type ModeId = 'build' | 'release' | 'valley' | 'peak' | 'harmony';

export type Mode = {
	id: ModeId;
	label: string;
	description: string;
	/** Target energy over the set: t = 0 (start) … 1 (end) → 0 (lowest) … 1 (highest). null = energy is ignored */
	curve: ((t: number) => number) | null;
};

export const MODES: Mode[] = [
	{ id: 'build', label: 'Aufbau', description: 'Von ruhig zu energiegeladen', curve: (t) => t },
	{
		id: 'release',
		label: 'Abbau',
		description: 'Von energiegeladen zu ruhig',
		curve: (t) => 1 - t
	},
	{
		id: 'valley',
		label: 'Tal',
		description: 'Stark starten, in der Mitte ruhiger, stark enden',
		curve: (t) => (Math.cos(2 * Math.PI * t) + 1) / 2
	},
	{
		id: 'peak',
		label: 'Berg',
		description: 'Ruhig starten, Höhepunkt in der Mitte, ruhig enden',
		curve: (t) => (1 - Math.cos(2 * Math.PI * t)) / 2
	},
	{
		id: 'harmony',
		label: 'Nur Harmonie',
		description: 'Energy egal, nur möglichst passende Übergänge',
		curve: null
	}
];

export type GeneratorOptions = {
	mode: ModeId;
	/** 0 = only transitions count … 1 = only the energy curve counts. Ignored in harmony mode */
	energyWeight: number;
	seed: number;
	/** Order keys (see `orderKey`) that should not be suggested again */
	avoid?: string[];
};

/** Energy used for planning; `estimated` marks values derived from BPM because the track has no energy */
export type EffectiveEnergy = { value: number; estimated: boolean };

export type GeneratedOrder<T extends GeneratorTrack> = {
	tracks: T[];
	key: string;
	/** Energy per position as used for planning (see `effectiveEnergies`) */
	energies: EffectiveEnergy[];
	/** Target energy per position, null where energy is ignored */
	targets: (number | null)[];
	/** 0–1, how smooth the transitions are on average */
	transitionQuality: number;
	/** 0–1, how close the energy follows the curve; null in harmony mode or if all energies are equal */
	curveFit: number | null;
	/** true if no acceptable order outside `avoid` was found */
	isRepeat: boolean;
};

// Independent randomized runs per generation; more runs = better and more varied results
const RUNS = 20;
const MAX_PASSES = 50;
// Alternatives may be at most this much worse (cost scale 0–1) than the best order found
const MAX_EXTRA_COST = 0.1;
// Keeps transitions relevant as a tie-breaker even when the slider is at "only curve"
const TIE_BREAK = 0.01;

export function orderKey(ids: number[]): string {
	return ids.join(',');
}

/**
 * Energy per track. Tracks without energy are placed by their BPM: the set's BPM range is
 * mapped onto the range of the known energies (or 1–10 if there are none or they are all equal),
 * so faster tracks count as more energetic.
 */
export function effectiveEnergies(tracks: GeneratorTrack[]): EffectiveEnergy[] {
	const known = tracks.flatMap((t) => (t.energy === null ? [] : [t.energy]));
	const [low, high] =
		known.length > 0 && Math.min(...known) < Math.max(...known)
			? [Math.min(...known), Math.max(...known)]
			: [1, 10];
	const bpms = tracks.map((t) => t.bpm);
	const minBpm = Math.min(...bpms);
	const bpmRange = Math.max(...bpms) - minBpm;

	return tracks.map((t) => {
		if (t.energy !== null) return { value: t.energy, estimated: false };
		const share = bpmRange > 0 ? (t.bpm - minBpm) / bpmRange : 0.5;
		return { value: low + share * (high - low), estimated: true };
	});
}

/**
 * Target energy per position. The curve picks a quantile of the set's own energies,
 * so a set with energies 5–8 builds from 5 to 8 rather than from 1 to 10.
 */
export function energyTargets(tracks: GeneratorTrack[], mode: ModeId): (number | null)[] {
	const curve = MODES.find((m) => m.id === mode)?.curve;
	const energies = sortedValues(effectiveEnergies(tracks));
	const n = tracks.length;
	if (!curve || energies.length === 0) return tracks.map(() => null);

	return tracks.map((_, i) => {
		const t = n === 1 ? 0.5 : i / (n - 1);
		const q = Math.min(Math.max(curve(t), 0), 1) * (energies.length - 1);
		const lo = Math.floor(q);
		const hi = Math.min(lo + 1, energies.length - 1);
		return energies[lo] + (energies[hi] - energies[lo]) * (q - lo);
	});
}

export function generateOrder<T extends GeneratorTrack>(
	tracks: T[],
	options: GeneratorOptions
): GeneratedOrder<T> {
	const energyWeight =
		options.mode === 'harmony' ? 0 : Math.min(Math.max(options.energyWeight, 0), 1);
	const energies = effectiveEnergies(tracks);
	const targets = energyTargets(tracks, options.mode);
	const cost = createCost(tracks, energies, targets, energyWeight);
	const rng = mulberry32(options.seed);

	// Distinct local optima, best first
	const found = new Map<string, { order: number[]; cost: number }>();
	for (let run = 0; run < RUNS && tracks.length > 0; run++) {
		const result = improve(construct(tracks.length, cost, energyWeight, rng), cost, rng);
		const key = orderKey(result.order.map((k) => tracks[k].id));
		if (!found.has(key)) found.set(key, result);
	}
	const ranked = [...found.entries()]
		.map(([key, result]) => ({ key, ...result }))
		.sort((a, b) => a.cost - b.cost);

	const avoid = new Set(options.avoid ?? []);
	const chosen =
		ranked.find((r) => !avoid.has(r.key) && r.cost <= ranked[0].cost + MAX_EXTRA_COST) ?? ranked[0];
	if (!chosen) {
		return {
			tracks: [],
			key: '',
			energies: [],
			targets,
			transitionQuality: 1,
			curveFit: null,
			isRepeat: false
		};
	}

	const breakdown = cost.breakdown(chosen.order);
	const hasCurve = targets.some((t) => t !== null) && cost.energyRange > 0;
	return {
		tracks: chosen.order.map((k) => tracks[k]),
		key: chosen.key,
		energies: chosen.order.map((k) => energies[k]),
		targets,
		transitionQuality: 1 - breakdown.transition,
		curveFit: hasCurve ? 1 - breakdown.energy : null,
		isRepeat: avoid.has(chosen.key)
	};
}

function sortedValues(energies: EffectiveEnergy[]): number[] {
	return energies.map((e) => e.value).sort((a, b) => a - b);
}

/** Cost of an order (lower is better). Orders are arrays of indices into `tracks`. */
function createCost(
	tracks: GeneratorTrack[],
	effective: EffectiveEnergy[],
	targets: (number | null)[],
	energyWeight: number
) {
	const n = tracks.length;
	// 0 = perfect transition … 1 = clash and BPM jump
	const transition = tracks.map((a) => tracks.map((b) => (4 - rateTransition(a, b).score) / 4));
	const energies = sortedValues(effective);
	const energyRange = energies.length > 0 ? energies[energies.length - 1] - energies[0] : 0;

	function energyCost(track: number, position: number): number {
		const target = targets[position];
		if (target === null || energyRange === 0) return 0;
		return Math.abs(effective[track].value - target) / energyRange;
	}

	function breakdown(order: number[]) {
		let transitionSum = 0;
		for (let i = 0; i < n - 1; i++) transitionSum += transition[order[i]][order[i + 1]];
		let energySum = 0;
		for (let i = 0; i < n; i++) energySum += energyCost(order[i], i);
		return { transition: n > 1 ? transitionSum / (n - 1) : 0, energy: n > 0 ? energySum / n : 0 };
	}

	function total(order: number[]): number {
		const b = breakdown(order);
		return (1 - energyWeight) * b.transition + energyWeight * b.energy + TIE_BREAK * b.transition;
	}

	return { transition, energyCost, energyRange, breakdown, total };
}

type Cost = ReturnType<typeof createCost>;

/** Builds an order step by step, picking randomly among the best few candidates for each position. */
function construct(n: number, cost: Cost, energyWeight: number, rng: () => number): number[] {
	const remaining = shuffle([...Array(n).keys()], rng);
	const order: number[] = [];

	for (let position = 0; position < n; position++) {
		const prev = order.at(-1);
		const ranked = remaining
			.map((k) => ({
				k,
				c:
					(prev === undefined ? 0 : (1 - energyWeight) * cost.transition[prev][k]) +
					energyWeight * cost.energyCost(k, position)
			}))
			.sort((a, b) => a.c - b.c);
		// Squaring biases the pick towards the best candidate
		const pick = ranked[Math.floor(rng() ** 2 * Math.min(3, ranked.length))].k;
		order.push(pick);
		remaining.splice(remaining.indexOf(pick), 1);
	}
	return order;
}

/** Local search: swaps two tracks or reverses a section as long as that lowers the cost. */
function improve(start: number[], cost: Cost, rng: () => number) {
	let order = start;
	let best = cost.total(order);
	const pairs: [number, number][] = [];
	for (let i = 0; i < order.length; i++) {
		for (let j = i + 1; j < order.length; j++) pairs.push([i, j]);
	}

	let improved = true;
	for (let pass = 0; improved && pass < MAX_PASSES; pass++) {
		improved = false;
		for (const [i, j] of shuffle(pairs, rng)) {
			for (const next of [swap(order, i, j), reverse(order, i, j)]) {
				const c = cost.total(next);
				if (c < best - 1e-9) {
					order = next;
					best = c;
					improved = true;
				}
			}
		}
	}
	return { order, cost: best };
}

function swap(order: number[], i: number, j: number): number[] {
	const next = [...order];
	[next[i], next[j]] = [next[j], next[i]];
	return next;
}

function reverse(order: number[], i: number, j: number): number[] {
	return [...order.slice(0, i), ...order.slice(i, j + 1).reverse(), ...order.slice(j + 1)];
}

function shuffle<T>(items: T[], rng: () => number): T[] {
	for (let i = items.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[items[i], items[j]] = [items[j], items[i]];
	}
	return items;
}

/** Small seeded PRNG so a seed always produces the same order. */
function mulberry32(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
