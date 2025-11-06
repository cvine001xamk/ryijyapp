<script lang="ts">
	export let imageFile: File | null;
	let fileInput: HTMLInputElement;
</script>

<div class="mb-4 flex justify-center gap-3">
	<input
		bind:this={fileInput}
		type="file"
		accept="image/*"
		on:change={(e: Event) => {
			const target = e.target as HTMLInputElement;
			if (target?.files?.length) imageFile = target.files[0];
		}}
		class="rounded border px-2 py-1 text-sm"
	/>
</div>
