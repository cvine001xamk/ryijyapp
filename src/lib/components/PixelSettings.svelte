<script lang="ts">
	import {
		pixelSize,
		aspectRatio,
		colorAmount,
		maxColors
	} from '$lib/stores/settingsStore';
	import { onMount } from 'svelte';

	let internalColorAmount: number;

	onMount(() => {
		const unsubscribe = colorAmount.subscribe((value) => {
			internalColorAmount = value;
		});
		return unsubscribe;
	});

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
			class="w-64 accent-blue-500"
		/>
	</div>

	<div class="flex flex-col items-center">
		<label for="colorAmountRange" class="mb-1 font-medium text-gray-700">
			Värien määrä: {$colorAmount}
		</label>
		<input
			id="colorAmountRange"
			type="range"
			min="2"
			max={$maxColors}
			bind:value={$colorAmount}
			class="w-64 accent-blue-500"
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
</div>
