<script>
	import '../app.css';
	import MenuIcon from '$lib/icons/MenuIcon.svelte';
	import UserIcon from '$lib/icons/UserIcon.svelte';
	import Menu from '$lib/components/Menu.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	let isMenuOpen = false;

	function toggleMenu() {
		isMenuOpen = !isMenuOpen;
	}

	function closeMenu() {
		isMenuOpen = false;
	}

	async function resetAndNavigate() {
		// Force a full page reload when clicking the header
		if ($page.url.pathname === '/') {
			window.location.reload();
		} else {
			await goto('/', { replaceState: true });
		}
	}

	// Register service worker for PWA
	onMount(() => {
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker
				.register('/sw.js')
				.then((registration) => {
					console.log('Service Worker registered:', registration);
				})
				.catch((error) => {
					console.error('Service Worker registration failed:', error);
				});
		}
	});
</script>

<div class="flex min-h-screen flex-col bg-[#f1ece9]">
	<header class="bg-[#b5c9c4] shadow-md">
		<div class="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
			<a
				href="https://www.kasityoakatemia.fi/"
				class="flex items-center"
				target="_blank"
				rel="noopener noreferrer"
			>
				<img
					src="/logo_nobg.png"
					alt="Käsityö Akatemia logo"
					class="h-15 w-15 rounded object-contain"
				/>
			</a>
			<button on:click={resetAndNavigate} class="cursor-pointer text-center hover:opacity-80">
				<h1 class="text-xl font-bold tracking-wide text-gray-800 sm:text-2xl md:text-3xl">
					Ryijykaaviokone
				</h1>
			</button>
			<div class="flex items-center gap-4">
				<button on:click={toggleMenu} class="rounded-full">
					<MenuIcon />
				</button>
				<UserIcon />
			</div>
		</div>
	</header>

	<!-- Main content slot -->
	<main class="flex-1">
		<slot />
	</main>

	<Menu isOpen={isMenuOpen} onClose={closeMenu} />
</div>
