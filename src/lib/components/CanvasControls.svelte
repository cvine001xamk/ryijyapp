<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let isImageLoaded: boolean;
	export let showOriginal: boolean;
	export let isProcessed: boolean;

	const dispatch = createEventDispatcher<{
		process: void;
		save: void;
	}>();
</script>

<div class="flex gap-3">
	<button
		on:click={() => dispatch('process')}
		class="h-15 w-40 rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:bg-gray-300"
		disabled={!isImageLoaded}
	>
		Muodosta kaavio
	</button>

	{#if isProcessed}
		<button
			on:click={() => dispatch('save')}
			class="h-15 w-40 rounded-lg bg-green-500 px-4 py-2 text-white hover:bg-green-600"
		>
			Tallenna kaavio
		</button>
		<button
			on:click={() => (showOriginal = !showOriginal)}
			class="h-15 w-40 rounded-lg bg-gray-500 px-4 py-2 text-white hover:bg-gray-600 disabled:bg-gray-300"
			disabled={!isProcessed}
		>
			{showOriginal ? 'Näytä kaavio' : 'Näytä alkuperäinen'}
		</button>
	{/if}
</div>
