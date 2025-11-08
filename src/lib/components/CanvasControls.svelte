<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let isImageLoaded: boolean;
	export let processedCanvasWidth: number | undefined;
	export let showOriginal: boolean;

	const dispatch = createEventDispatcher<{
		process: void;
		save: void;
	}>();
</script>

<div class="flex gap-3">
	<button
		on:click={() => dispatch('process')}
		class="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:bg-gray-300"
		disabled={!isImageLoaded}
	>
		Muodosta kaavio
	</button>

	{#if processedCanvasWidth}
		<button
			on:click={() => dispatch('save')}
			class="rounded-lg bg-green-500 px-4 py-2 text-white hover:bg-green-600"
		>
			Tallenna kaavio
		</button>
		<button
			on:click={() => (showOriginal = !showOriginal)}
			class="rounded-lg bg-gray-500 px-4 py-2 text-white hover:bg-gray-600"
		>
			{showOriginal ? 'Näytä kaavio' : 'Näytä alkuperäinen'}
		</button>
	{/if}
</div>
