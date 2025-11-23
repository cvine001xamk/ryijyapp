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
	let canvasArea: CanvasArea;
	
	function handleProcess() {
		canvasArea?.processImage();
		controlsOpen = false;
	}
</script>

<div class="container mx-auto mt-8 max-w-5xl text-center">
	{#if !imageFile}
		<div class="flex flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
			<div class="mb-10 text-center">
				<h2 class="text-3xl font-extrabold text-gray-900 sm:text-4xl">
					Muuta kuvasi ryijymalliksi
				</h2>
				<p class="mt-4 text-lg text-gray-600">
					Lataa kuva ja luo siitä helposti selkeä ruutukaavio ja ohjeet.
				</p>
			</div>

			<label
				for="initialImageUpload"
				class="group relative flex h-80 w-full max-w-lg cursor-pointer flex-col items-center justify-center rounded-3xl border-4 border-dashed border-[#b5c9c4] bg-white/50 shadow-sm transition-all duration-300 hover:border-[#a4036f] hover:bg-white hover:shadow-md"
			>
				<div class="flex flex-col items-center justify-center pb-6 pt-5">
					<div
						class="mb-4 rounded-full bg-[#f1ece9] p-4 transition-colors group-hover:bg-[#b5c9c4]/30"
					>
						<CameraIcon class="h-12 w-12 text-[#a4036f]" />
					</div>
					<p
						class="mb-2 text-xl font-medium text-gray-700 transition-colors group-hover:text-[#a4036f]"
					>
						Lataa kuva
					</p>
					<p class="text-sm text-gray-500">PNG, JPG tai WEBP</p>
				</div>
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
			</label>
		</div>
	{:else}
		<div class="rounded-2xl bg-white p-2 shadow-lg sm:p-6" transition:fade>
			<CollapsibleControls bind:isOpen={controlsOpen}>
				<ImageControls bind:imageFile />
				<PixelSettings on:process={handleProcess} />
			</CollapsibleControls>
			<CanvasArea bind:this={canvasArea} {imageFile} bind:showOriginal />
		</div>
	{/if}
</div>
