<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let isImageLoaded: boolean;
	export let processedCanvasWidth: number | undefined;
	export let displayMode: 'color' | 'number' | 'letter' | 'code';

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
		<div class="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 shadow-sm">
			<span class="text-sm text-gray-700">Näyttötapa:</span>
			<select
				bind:value={displayMode}
				on:change={() => dispatch('process')}
				class="rounded border-gray-300 text-sm"
			>
				<option value="color">Värit</option>
				<option value="number">Numerot</option>
				<option value="letter">Kirjaimet</option>
				<option value="code">Koodit</option>
			</select>
		</div>
	{/if}
</div>
