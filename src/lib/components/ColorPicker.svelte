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
	let innerWidth: number;
	let innerHeight: number;
	let pickerWidth = 0;
	let pickerHeight = 0;

	$: pickerStyle = (() => {
		if (!show) return '';

		// Horizontal positioning: Center on click, then clamp
		let left = position.x - pickerWidth / 2;
		
		// Clamp horizontal
		if (left + pickerWidth > innerWidth - 10) {
			left = innerWidth - pickerWidth - 10;
		}
		if (left < 10) {
			left = 10;
		}

		// Vertical positioning
		// position.y comes in with a +50px offset from the click/cell
		// So 'clickY' is roughly position.y - 50
		const clickY = position.y - 50;
		const GAP = 10; // Extra gap between cell and picker
		const ABOVE_GAP = 40; // Larger gap when placing above
		
		// Try placing below (default)
		// We use the passed position.y which is already offset by 50px
		let top = position.y; 

		// Check if it fits below
		if (top + pickerHeight > innerHeight - 10) {
			// Doesn't fit below, try above
			// Target: clickY - ABOVE_GAP - pickerHeight
			top = clickY - ABOVE_GAP - pickerHeight;
			
			// If it goes off the top, we have a dilemma. 
			// But usually if we are at the bottom, we have space at the top.
			if (top < 10) {
				top = 10;
			}
		}

		return `left: ${left}px; top: ${top}px;`;
	})();
</script>

<svelte:window bind:innerWidth bind:innerHeight />

{#if show}
	<div
		role="button"
		tabindex="0"
		class="fixed inset-0 z-50"
		on:click={close}
		on:keydown={(e) => e.key === 'Escape' && close()}
	></div>
	<div
		bind:clientWidth={pickerWidth}
		bind:clientHeight={pickerHeight}
		class="fixed z-50 rounded-lg border bg-white p-2 shadow-lg"
		style={pickerStyle}
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
