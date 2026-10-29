<script lang="ts">
	import './layout.css';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	const links = [
		{ href: '/', label: 'Tracks' } as const,
		{ href: '/sets', label: 'Sets' } as const,
		{ href: '/import', label: 'Import' } as const
	];

	function isActive(href: string) {
		return href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<nav class="border-b-2 border-accent">
	<ul class="mx-auto flex max-w-3xl gap-6 px-4 py-3">
		{#each links as link (link.href)}
			<li>
				<a
					href={resolve(link.href)}
					aria-current={isActive(link.href) ? 'page' : undefined}
					class="font-semibold no-underline aria-[current=page]:text-body aria-[current=page]:underline"
				>
					{link.label}
				</a>
			</li>
		{/each}
	</ul>
</nav>

{@render children()}
