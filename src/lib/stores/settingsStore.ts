import { writable } from 'svelte/store';

export const pixelSize = writable(30);
export const borderColor = writable<'black' | 'white'>('black');
export const aspectRatio = writable('1:2');
export const symbolType = writable<'kirjaimet' | 'numerot' | 'koodi' | 'ei mitään'>('ei mitään');
export const showColor = writable(true);
export const colorAmount = writable<number>(15);
export const maxColors = writable<number>(30);
export const threadsPerKnot = writable<number>(3);
export const tuftWidth = writable<number>(1.0);
export const tuftHeight = writable<number>(1.0);
