<script lang="ts">
	import {
		pixelSize,
		aspectRatio,
		colorAmount,
		maxColors,
		grayscale
	} from '$lib/stores/settingsStore';
	import { onMount } from 'svelte';

	let internalColorAmount: number;

	onMount(() => {
		const unsubscribe = colorAmount.subscribe((value) => {
			internalColorAmount = value;
		});
		return unsubscribe;
	});

	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	$: if (internalColorAmount && internalColorAmount > $maxColors) {
		colorAmount.set($maxColors);
	}
</script>

<div class="mb-4 flex flex-col items-center gap-4">
	<!-- Pixel size control -->
	<div class="flex flex-col items-center">
		<label for="pixelRange" class="mb-1 font-medium text-gray-700">
			Rivin ruutumäärä: {$pixelSize}
		</label>
		<input
			id="pixelRange"
			type="range"
			min="10"
			max="100"
			bind:value={$pixelSize}
			class="w-64 accent-[#a4036f]"
		/>
	</div>

	<div class="flex flex-col items-center">
		<label for="colorAmountRange" class="mb-1 font-medium text-gray-700">
			Tavoiteltu värien määrä: {$colorAmount}
		</label>
		<input
			id="colorAmountRange"
			type="range"
			min="2"
			max={$maxColors}
			bind:value={$colorAmount}
			class="w-64 accent-[#a4036f]"
			disabled={$maxColors <= 2}
		/>
	</div>

	<div class="flex flex-col items-center">
		<label for="aspectRatioSelect" class="mb-1 font-medium text-gray-700">
			Ruudun mittasuhde:
		</label>
		<select id="aspectRatioSelect" bind:value={$aspectRatio} class="rounded border px-2 py-1">
			<option value="1:1">1:1</option>
			<option value="1:2">1:2</option>
			<option value="1:3">1:3</option>
		</select>
	</div>

	<div class="flex items-center gap-2">
		<input
			type="checkbox"
			id="grayscaleCheckbox"
			bind:checked={$grayscale}
			class="h-5 w-5 rounded border-gray-300 text-[#a4036f] focus:ring-[#a4036f]"
		/>
		<label for="grayscaleCheckbox" class="font-medium text-gray-700">
			Harmaasävyt
		</label>
	</div>

	<button
		on:click={() => dispatch('process')}
		class="mt-4 h-15 w-40 rounded-lg bg-[#a4036f] px-4 py-2 text-white hover:opacity-90 disabled:bg-gray-300"
	>
		Muodosta kaavio
	</button>
</div>
