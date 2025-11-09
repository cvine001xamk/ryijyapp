import { writable } from 'svelte/store';

export const pixelSize = writable(30);
export const borderColor = writable<'black' | 'white'>('black');
export const aspectRatio = writable('1:1');
export const symbolType = writable<'kirjaimet' | 'numerot' | 'koodi' | 'ei mitään'>('ei mitään');
export const showColor = writable(true);
export const colorAmount = writable<number>(30);
export const maxColors = writable<number>(30);
