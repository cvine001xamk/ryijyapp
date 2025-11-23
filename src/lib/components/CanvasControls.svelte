<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let isImageLoaded: boolean;
	export let isProcessed: boolean;

	const dispatch = createEventDispatcher<{
		process: void;
		save: void;
	}>();
</script>

<div class="flex flex-wrap justify-center gap-3">
	<button
		on:click={() => dispatch('process')}
		class="h-15 w-40 rounded-lg bg-[#a4036f] px-4 py-2 text-white hover:opacity-90 disabled:bg-gray-300"
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
	{/if}
</div>
