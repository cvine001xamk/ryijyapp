<script lang="ts">
	export let pixelSize = 30;
	export let borderColor: 'black' | 'white' = 'black';
</script>

<div class="mb-4 flex flex-col items-center gap-4">
	<!-- Pixel size control -->
	<div class="flex flex-col items-center">
		<label for="pixelRange" class="mb-1 font-medium text-gray-700">
			Rivin ruutumäärä: {pixelSize}
		</label>
		<input
			id="pixelRange"
			type="range"
			min="10"
			max="100"
			bind:value={pixelSize}
			class="w-64 accent-blue-500"
		/>
	</div>

	<!-- Border color control -->
	<div class="flex flex-col items-center">
		<label for="borderColorSelect" class="mb-1 font-medium text-gray-700"> Ruudukon väri: </label>
		<select id="borderColorSelect" bind:value={borderColor} class="rounded border px-2 py-1">
			<option value="black">Musta</option>
			<option value="white">Valkoinen</option>
		</select>
	</div>
</div>
