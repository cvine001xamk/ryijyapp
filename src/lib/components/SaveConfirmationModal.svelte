<script lang="ts">
	import { fade } from 'svelte/transition';
	import { tuftWidth, tuftHeight, threadsPerKnot, wastage } from '$lib/stores/settingsStore';

	export let isOpen: boolean;
	export let onConfirm: (format: 'pdf' | 'excel' | 'png') => void;
	export let onClose: () => void;

	const threadOptions = [2, 3, 4];
</script>

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex min-h-screen items-center justify-center overflow-y-auto bg-black/50"
		transition:fade={{ duration: 150 }}
		on:click|self={onClose}
		on:keydown={(e) => { if (e.key === 'Escape') onClose(); }}
		role="button"
		tabindex="0"
	>
		<div class="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
			<h2 class="mb-4 text-xl font-semibold text-gray-800">Vahvista ja säädä</h2>
			<div class="space-y-4">
				<!-- Tuft Width -->
				<div class="space-y-2">
					<label for="tuftWidthInput" class="block text-sm font-medium text-gray-700">
						Yhden nukan leveys (cm)
					</label>
					<input
						type="number"
						bind:value={$tuftWidth}
						step="0.1"
						class="w-full rounded-md border border-gray-300 p-2 text-gray-700"
					/>
					<div class="text-right text-sm text-gray-600">{$tuftWidth} cm</div>
				</div>

				<!-- Tuft Height -->
				<div class="space-y-2">
					<label for="tuftHeightInput" class="block text-sm font-medium text-gray-700">
						Yhden nukan korkeus (cm)
					</label>
					<input
						type="number"
						bind:value={$tuftHeight}
						step="0.1"
						class="w-full rounded-md border border-gray-300 p-2 text-gray-700"
					/>
					<div class="text-right text-sm text-gray-600">{$tuftHeight} cm</div>
				</div>

				<!-- Threads per Knot -->
				<div class="space-y-2">
					<label for="threadsPerKnot" class="block text-sm font-medium text-gray-700">
						Lankojen määrä yhtä nukkaa kohden
					</label>
					<select
						id="threadsPerKnot"
						bind:value={$threadsPerKnot}
						class="w-full rounded-md border border-gray-300 p-2 text-gray-700"
					>
						{#each threadOptions as threads}
							<option value={threads}>{threads} lankaa</option>
						{/each}
					</select>
				</div>

				<!-- Wastage -->
				<div class="space-y-2">
					<label for="wastageInput" class="block text-sm font-medium text-gray-700">
						Hävikki (%)
					</label>
					<input
						type="number"
						bind:value={$wastage}
						class="w-full rounded-md border border-gray-300 p-2 text-gray-700"
					/>
					<div class="text-right text-sm text-gray-600">{$wastage}%</div>
				</div>
			</div>

			<div class="mt-6 flex justify-end gap-3">
				<button
					on:click={onClose}
					class="rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
				>
					Peruuta
				</button>
				<button
					on:click={() => onConfirm('pdf')}
					class="rounded-md bg-[#a4036f] px-4 py-2 text-white hover:opacity-90"
				>
					Luo PDF
				</button>
				<button
					on:click={() => onConfirm('excel')}
					class="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700"
				>
					Luo Excel
				</button>
				<button
					on:click={() => onConfirm('png')}
					class="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
				>
					Luo PNG
				</button>
			</div>
		</div>
	</div>
{/if}
