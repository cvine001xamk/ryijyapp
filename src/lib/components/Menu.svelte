<script lang="ts">
	import { fade } from 'svelte/transition';
	export let isOpen: boolean;
	export let onClose: () => void;
	export let pixelSize: number;

	// Default values
	let aspectRatio = '1:3';
	let horizontalKnots = 30;
	let colorCount = 20;
	let saveFormat = 'PDF';
	let threadsPerKnot = 4;

	const aspectRatios = ['1:1', '1:2', '1:3', '3:1'];
	const saveFormats = ['PDF', 'XLSX', 'PNG'];
	const threadOptions = [2, 3, 4];
</script>

{#if isOpen}
	<div
		class="fixed inset-0 z-50 min-h-screen overflow-y-auto bg-blue-200"
		transition:fade={{ duration: 200 }}
	>
		<!-- Header -->
		<div class="sticky top-0 border-b bg-white/50 p-4 shadow-sm">
			<div class="mx-auto flex max-w-3xl items-center justify-between">
				<h2 class=" text-xl font-semibold text-gray-800">Kaavion oletusasetukset</h2>
				<button
					on:click={onClose}
					class="rounded-full p-2 text-gray-600 hover:bg-black/10"
					aria-label="Close menu"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-6 w-6"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>
		</div>

		<!-- Content -->
		<div class="mx-auto max-w-3xl p-6">
			<div class="rounded-xl bg-white p-6 shadow-lg">
				<div class="space-y-6">
					<!-- Aspect Ratio -->
					<div class="space-y-2">
						<label for="aspectRatioSelect" class="block text-sm font-medium text-gray-700">
							Kuvasuhde
						</label>
						<select
							bind:value={aspectRatio}
							class="w-full rounded-md border border-gray-300 p-2 text-gray-700"
						>
							{#each aspectRatios as ratio}
								<option value={ratio}>{ratio}</option>
							{/each}
						</select>
					</div>

					<!-- Horizontal Knots -->
					<div class="space-y-2">
						<label for="horizontalKnotsRange" class="block text-sm font-medium text-gray-700">
							Solmujen määrä vaakatasossa
						</label>
						<input type="range" bind:value={horizontalKnots} min="10" max="100" class="w-full" />
						<div class="text-center text-sm text-gray-600">
							Nykyinen arvo: {horizontalKnots}
						</div>
					</div>

					<!-- Color Count -->
					<div class="space-y-2">
						<label for="colorCountRange" class="block text-sm font-medium text-gray-700">
							Värimäärä
						</label>
						<input type="range" bind:value={colorCount} min="2" max="30" class="w-full" />
						<div class="text-center text-sm text-gray-600">
							Nykyinen arvo: {colorCount}
						</div>
					</div>

					<!-- Save Format -->
					<div class="space-y-2">
						<span class="block text-sm font-medium text-gray-700"> Tallennusmuoto </span>
						<div class="flex gap-4">
							{#each saveFormats as format}
								<label for={`saveFormat-${format}`} class="flex items-center gap-2">
									<input
										type="radio"
										bind:group={saveFormat}
										value={format}
										class="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
									/>
									<span class="text-sm text-gray-700">{format}</span>
								</label>
							{/each}
						</div>
					</div>

					<!-- Threads per Knot -->
					<div class="space-y-2">
						<label for="threadsPerKnot" class="block text-sm font-medium text-gray-700">
							Lankojen määrä solmua kohden
						</label>
						<select
							id="threadsPerKnot"
							bind:value={threadsPerKnot}
							class="w-full rounded-md border border-gray-300 p-2 text-gray-700"
						>
							{#each threadOptions as threads}
								<option value={threads}>{threads} lankaa</option>
							{/each}
						</select>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}
