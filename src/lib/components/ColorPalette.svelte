<script lang="ts">
	export let colorCounts: Map<string, number>;
	export let colorToIdentifier: Map<string, string>;
	export let symbolType: 'kirjaimet' | 'numerot' | 'koodi' | 'ei mitään' = 'ei mitään';
	let show = false;
</script>

{#if colorCounts.size > 0}
	<div class="mt-6 text-center">
		<button
			on:click={() => (show = !show)}
			class="rounded-lg bg-blue-500 px-3 py-2 text-white shadow hover:bg-blue-600"
		>
			{show ? 'Piilota värit' : 'Näytä värit'} ({colorCounts.size})
		</button>

		{#if show}
			<div class="mt-4 flex flex-wrap justify-center gap-3 rounded-xl bg-gray-100 p-4 shadow-inner">
				{#each Array.from(colorCounts.entries()) as [hex, count]}
					<div class="flex w-20 flex-col items-center rounded-lg bg-white p-2 shadow-sm">
						<div class="h-12 w-12 rounded-md border shadow" style="background-color:{hex}">
							{#if symbolType !== 'ei mitään'}
								<div class="flex h-full items-center justify-center text-sm font-medium">
									{colorToIdentifier.get(hex)}
								</div>
							{/if}
						</div>
						<span class="mt-1 text-xs font-medium text-gray-900">
							{symbolType === 'koodi' ? hex : colorToIdentifier.get(hex) || hex}
						</span>
						<span class="text-xs text-gray-500">{count} ruutua</span>
					</div>
				{/each}
			</div>
		{/if}
	</div>
{/if}
