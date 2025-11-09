<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { getBrightness, hexToRgb } from '$lib/utils/helperFunctions';

	export let colors: string[];
	export let show = false;
	export let position = { x: 0, y: 0 };
	export let colorToIdentifier: Map<string, string>;
	export let symbolType: 'kirjaimet' | 'numerot' | 'koodi' | 'ei mitään';

	const dispatch = createEventDispatcher();

	$: sortedColors = colors.slice().sort((a, b) => {
		const identifierA = colorToIdentifier.get(a) || '';
		const identifierB = colorToIdentifier.get(b) || '';

		if (symbolType === 'numerot') {
			return parseInt(identifierA) - parseInt(identifierB);
		}
		return identifierA.localeCompare(identifierB);
	});

	function selectColor(color: string) {
		dispatch('select', color);
		close();
	}

	function close() {
		dispatch('close');
	}

	function handleKeydown(event: KeyboardEvent, color: string) {
		if (event.key === 'Enter' || event.key === ' ') {
			selectColor(color);
		}
	}

	function getSymbolColor(hex: string) {
		const rgb = hexToRgb(hex);
		if (!rgb) return 'black';
		const brightness = getBrightness(rgb.r, rgb.g, rgb.b);
		return brightness > 128 ? 'black' : 'white';
	}
</script>

{#if show}
	<div
		role="button"
		tabindex="0"
		class="fixed inset-0 z-50"
		on:click={close}
		on:keydown={(e) => e.key === 'Escape' && close()}
	></div>
	<div
		class="fixed z-50 rounded-lg border bg-white p-2 shadow-lg"
		style="left: {position.x}px; top: {position.y}px;"
	>
		<div class="flex max-w-xs flex-wrap gap-2">
			{#each sortedColors as color}
				<div
					role="button"
					tabindex="0"
					class="relative h-8 w-8 cursor-pointer rounded-full border"
					style="background-color: {color};"
					on:click|stopPropagation={() => selectColor(color)}
					on:keydown|stopPropagation={(e) => handleKeydown(e, color)}
				>
					{#if symbolType !== 'ei mitään'}
						<span
							class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs font-bold"
							style="color: {getSymbolColor(color)};"
						>
							{colorToIdentifier.get(color)}
						</span>
					{/if}
				</div>
			{/each}
		</div>
	</div>
{/if}
