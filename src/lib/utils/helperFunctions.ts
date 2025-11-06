export interface RGB {
	r: number;
	g: number;
	b: number;
}

export const getBrightness = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;
export const rgbToHex = (r: number, g: number, b: number) =>
	'#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result
		? {
				r: parseInt(result[1], 16),
				g: parseInt(result[2], 16),
				b: parseInt(result[3], 16)
			}
		: null;
}
