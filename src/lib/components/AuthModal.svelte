<script lang="ts">
	import { fade } from 'svelte/transition';
	import { authorize } from '$lib/stores/authStore';

	let key = '';
	let error = '';
	let isSubmitting = false;

	function handleSubmit() {
		if (!key.trim()) {
			error = 'Syötä avain';
			return;
		}

		isSubmitting = true;
		error = '';

		// Small delay for better UX
		setTimeout(() => {
			const success = authorize(key);
			if (!success) {
				error = 'Virheellinen avain';
				isSubmitting = false;
			}
			// If successful, the store will update and the modal will be hidden by parent
		}, 300);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			handleSubmit();
		}
	}
</script>

<div
	class="fixed inset-0 z-50 flex min-h-screen items-center justify-center overflow-y-auto bg-gradient-to-br from-[#b5c9c4]/20 to-[#f1ece9]/40 backdrop-blur-sm"
	transition:fade={{ duration: 200 }}
>
	<div class="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
		<div class="mb-6 text-center">
			<h2 class="mb-2 text-2xl font-bold text-gray-800">Tervetuloa Ryijykaaviokoneeseen</h2>
			<p class="text-sm text-gray-600">Syötä käyttöavain jatkaaksesi</p>
		</div>

		<div class="space-y-4">
			<div class="space-y-2">
				<label for="authKey" class="block text-sm font-medium text-gray-700">
					(Käyttöavain = "akatemia")
				</label>
				<input
					id="authKey"
					type="text"
					bind:value={key}
					on:keydown={handleKeydown}
					disabled={isSubmitting}
					placeholder="Syötä avain"
					class="w-full rounded-lg border-2 border-gray-300 p-3 text-gray-700 transition-colors focus:border-[#a4036f] focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
				/>
				{#if error}
					<p class="text-sm text-red-600" transition:fade={{ duration: 150 }}>
						{error}
					</p>
				{/if}
			</div>

			<button
				on:click={handleSubmit}
				disabled={isSubmitting}
				class="w-full rounded-lg bg-[#a4036f] px-6 py-3 font-medium text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
			>
				{isSubmitting ? 'Tarkistetaan...' : 'Jatka'}
			</button>
		</div>

		<div class="mt-6 text-center">
			<p class="text-xs text-gray-500">Tarvitsetko avaimen? Ota yhteyttä ylläpitoon.</p>
		</div>
	</div>
</div>
