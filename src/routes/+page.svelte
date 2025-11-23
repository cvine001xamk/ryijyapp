<script lang="ts">
	import ImageControls from '$lib/components/ImageControls.svelte';
	import PixelSettings from '$lib/components/PixelSettings.svelte';
	import CanvasArea from '$lib/components/CanvasArea.svelte';
	import CameraIcon from '$lib/icons/CameraIcon.svelte';
	import CollapsibleControls from '$lib/components/CollapsibleControls.svelte';
	import { fade } from 'svelte/transition';

	let imageFile: File | null = null;
	let showOriginal = false;
	let controlsOpen = true;
</script>

<div class="container mx-auto mt-8 max-w-5xl text-center">
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
					const target = e.target as HTMLInputElement;
					imageFile = target.files?.[0] ?? null;
				}}
			/>
			<CameraIcon />
			<span class="mt-4 text-sm text-gray-500">Lataa kuva</span>
		</label>
	{:else}
		<div class="rounded-2xl bg-white p-2 shadow-lg sm:p-6" transition:fade>
			<CollapsibleControls bind:isOpen={controlsOpen}>
				<ImageControls bind:imageFile />
				<PixelSettings />
			</CollapsibleControls>
			<CanvasArea {imageFile} bind:showOriginal on:process={() => (controlsOpen = false)} />
		</div>
	{/if}
</div>

