<script lang="ts">
	import ImageControls from '$lib/components/ImageControls.svelte';
	import PixelSettings from '$lib/components/PixelSettings.svelte';
	import CanvasArea from '$lib/components/CanvasArea.svelte';
	import CameraIcon from '$lib/icons/CameraIcon.svelte';
	import { fade } from 'svelte/transition';
	import {
		pixelSize,
		borderColor,
		aspectRatio,
		symbolType,
		showColor
	} from '$lib/stores/settingsStore';

	let imageFile: File | null = null;
	let showOriginal = false;
</script>

<div class="container mx-auto mt-8 max-w-5xl rounded-2xl bg-white p-6 text-center shadow-lg">
	{#if !imageFile}
		<label
			for="initialImageUpload"
			class="group mx-auto flex h-64 w-64 cursor-pointer flex-col items-center justify-center rounded-full bg-white shadow-lg transition-all hover:shadow-xl"
		>
			<input
				type="file"
				id="initialImageUpload"
				accept="image/*"
				class="hidden"
				on:change={(e) => {
					imageFile = e.target?.files?.[0] ?? null;
				}}
			/>
			<CameraIcon />
			<span class="mt-4 text-sm text-gray-500">Lataa kuva</span>
		</label>
	{:else}
		<div class="rounded-2xl bg-white p-6 shadow-lg" transition:fade>
			<ImageControls bind:imageFile />
			<PixelSettings />
			<CanvasArea {imageFile} bind:showOriginal />
		</div>
	{/if}
</div>
