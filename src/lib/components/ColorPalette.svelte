<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let colorCounts: Map<string, number>;
	export let colorToIdentifier: Map<string, string>;
	export let symbolType: 'kirjaimet' | 'numerot' | 'koodi' | 'ei mitään' = 'ei mitään';
	let show = false;

	const dispatch = createEventDispatcher();

	$: sortedColors = Array.from(colorCounts.entries())
		.map(([hex, count]) => ({
			hex,
			count,
			identifier: colorToIdentifier.get(hex) || ''
		}))
		.sort((a, b) => {
			if (symbolType === 'numerot') {
				return parseInt(a.identifier) - parseInt(b.identifier);
			}
			return a.identifier.localeCompare(b.identifier);
		});
</script>

{#if colorCounts.size > 0}
	<div class="mt-6 text-center">
		<div class="flex justify-center gap-4">
			<button
				on:click={() => (show = !show)}
				class="rounded-lg bg-[#0f806d] px-3 py-2 text-white shadow hover:opacity-90"
			>
				{show ? 'Piilota värit' : 'Näytä värit'} ({colorCounts.size})
			</button>
			<button
				on:click={() => dispatch('save')}
				class="rounded-lg bg-[#a4036f] px-3 py-2 text-white shadow hover:opacity-90"
			>
				Tallenna kaavio
			</button>
		</div>

		{#if show}
			<div class="mt-4 flex flex-wrap justify-center gap-3 rounded-xl bg-gray-100 p-4 shadow-inner">
				{#each sortedColors as { hex, count, identifier }}
					<div class="flex w-20 flex-col items-center rounded-lg bg-white p-2 shadow-sm">
						<div class="h-12 w-12 rounded-md border shadow" style="background-color:{hex}">
							{#if symbolType !== 'ei mitään'}
								<div class="flex h-full items-center justify-center text-sm font-medium">
									{identifier}
								</div>
							{/if}
						</div>
						<span class="mt-1 text-xs font-medium text-gray-900">
							{hex}
						</span>
						<span class="text-xs text-gray-500">{count} ruutua</span>
					</div>
				{/each}
			</div>
		{/if}
	</div>
{/if}
