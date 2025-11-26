<script lang="ts">
	import { slide } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';

	export let isOpen = true;
</script>

<div class="mb-4 rounded-lg bg-gray-100 shadow">
	<button
		on:click={() => (isOpen = !isOpen)}
		class="flex w-full items-center justify-between p-4"
	>
		<h2 class="text-xl font-bold">Asetukset</h2>
		<svg
			class="h-6 w-6 transform transition-transform"
			class:rotate-180={isOpen}
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
		</svg>
	</button>

	{#if isOpen}
		<div
			class="space-y-6 p-4"
			transition:slide={{ duration: 300, easing: quintOut }}
		>
			<slot />
		</div>
	{/if}
</div>
