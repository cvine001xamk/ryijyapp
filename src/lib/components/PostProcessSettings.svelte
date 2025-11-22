<script lang="ts">
	import {
		borderColor,
		symbolType,
		showColor
	} from '$lib/stores/settingsStore';
</script>

<div class="mb-4 flex flex-wrap items-center justify-center gap-6 rounded-lg bg-gray-50 p-4 shadow-sm">
	<!-- Border color control -->
	<div class="flex flex-col items-center">
		<label for="borderColorSelect" class="mb-1 font-medium text-gray-700"> Ruudukon väri: </label>
		<select id="borderColorSelect" bind:value={$borderColor} class="rounded border px-2 py-1">
			<option value="black">Musta</option>
			<option value="white">Valkoinen</option>
		</select>
	</div>

	<!-- Symbol type control -->
	<div class="flex flex-col items-center">
		<label for="symbolTypeSelect" class="mb-1 font-medium text-gray-700"> Symbolit: </label>
		<select id="symbolTypeSelect" bind:value={$symbolType} class="rounded border px-2 py-1">
			<option value="ei mitään">Ei mitään</option>
			<option value="kirjaimet">Kirjaimet</option>
			<option value="numerot">Numerot</option>
			<option value="koodi">Koodi</option>
		</select>
	</div>

	<!-- Show color control -->
	<div class="flex items-center pt-6">
		<input id="showColor" type="checkbox" bind:checked={$showColor} class="mr-2 h-4 w-4" />
		<label for="showColor" class="font-medium text-gray-700"> Näytä värit </label>
	</div>
</div>
