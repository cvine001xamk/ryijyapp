import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const STORAGE_KEY = 'ryijyapp_auth';
const VALID_KEY = 'akatemia';

// Initialize with stored value to prevent flash on page load
function getInitialAuthState(): boolean {
	if (!browser) return false;
	return localStorage.getItem(STORAGE_KEY) === 'true';
}

// Create the store with initial value from localStorage
export const isAuthorized = writable<boolean>(getInitialAuthState());

/**
 * Check if user is already authorized from localStorage
 * Should be called on app initialization
 */
export function checkAuth(): void {
	if (!browser) return;
	
	const stored = localStorage.getItem(STORAGE_KEY);
	if (stored === 'true') {
		isAuthorized.set(true);
	}
}

/**
 * Attempt to authorize with the provided key
 * @param key - The authorization key to validate
 * @returns true if authorization successful, false otherwise
 */
export function authorize(key: string): boolean {
	if (key === VALID_KEY) {
		if (browser) {
			localStorage.setItem(STORAGE_KEY, 'true');
		}
		isAuthorized.set(true);
		return true;
	}
	return false;
}

/**
 * Clear authorization (for testing/maintenance)
 */
export function logout(): void {
	if (browser) {
		localStorage.removeItem(STORAGE_KEY);
	}
	isAuthorized.set(false);
}
