// src/lib/utils/colorQuantization.ts

export interface RGB {
	r: number;
	g: number;
	b: number;
}

// Function to calculate the Euclidean distance between two colors
function colorDistance(color1: RGB, color2: RGB): number {
	return Math.sqrt(
		Math.pow(color1.r - color2.r, 2) +
			Math.pow(color1.g - color2.g, 2) +
			Math.pow(color1.b - color2.b, 2)
	);
}

// Function to get a random centroid from a given set of colors
function getRandomCentroid(colors: RGB[]): RGB {
	return colors[Math.floor(Math.random() * colors.length)];
}

// The main k-means function
export function quantizeColors(
	imageData: ImageData,
	k: number
): { quantizedPixels: Uint8ClampedArray; palette: RGB[] } {
	const pixels: RGB[] = [];
	for (let i = 0; i < imageData.data.length; i += 4) {
		// Consider only opaque pixels
		if (imageData.data[i + 3] > 0) {
			pixels.push({ r: imageData.data[i], g: imageData.data[i + 1], b: imageData.data[i + 2] });
		}
	}

	if (pixels.length === 0) {
		return { quantizedPixels: new Uint8ClampedArray(imageData.data), palette: [] };
	}

	// Extract all unique colors from the original image
	const originalUniqueColors = Array.from(new Set(pixels.map((p) => JSON.stringify(p)))).map(
		(s) => JSON.parse(s) as RGB
	);

	let finalPalette: RGB[];

	if (k >= originalUniqueColors.length) {
		// If desired colors are more than or equal to original unique colors, use all original unique colors
		finalPalette = originalUniqueColors;
	} else {
		// Otherwise, perform k-means clustering on the unique colors
		let centroids: RGB[] = [];
		// Initialize centroids with random unique colors from the image
		for (let i = 0; i < k; i++) {
			centroids.push(getRandomCentroid(originalUniqueColors));
		}

		let assignments: number[] = new Array(originalUniqueColors.length);
		let oldAssignments: number[] | null = null;

		for (let iteration = 0; iteration < 10; iteration++) {
			// Assign each unique color to the closest centroid
			for (let i = 0; i < originalUniqueColors.length; i++) {
				let minDistance = Infinity;
				let closestCentroid = 0;
				for (let j = 0; j < centroids.length; j++) {
					const distance = colorDistance(originalUniqueColors[i], centroids[j]);
					if (distance < minDistance) {
						minDistance = distance;
						closestCentroid = j;
					}
				}
				assignments[i] = closestCentroid;
			}

			// Check for convergence
			if (oldAssignments && JSON.stringify(assignments) === JSON.stringify(oldAssignments)) {
				break;
			}
			oldAssignments = [...assignments];

			// Update centroids
			const newCentroids: RGB[] = new Array(k).fill(null).map(() => ({ r: 0, g: 0, b: 0 }));
			const counts: number[] = new Array(k).fill(0);

			for (let i = 0; i < originalUniqueColors.length; i++) {
				const centroidIndex = assignments[i];
				newCentroids[centroidIndex].r += originalUniqueColors[i].r;
				newCentroids[centroidIndex].g += originalUniqueColors[i].g;
				newCentroids[centroidIndex].b += originalUniqueColors[i].b;
				counts[centroidIndex]++;
			}

			for (let i = 0; i < k; i++) {
				if (counts[i] > 0) {
					newCentroids[i].r = Math.round(newCentroids[i].r / counts[i]);
					newCentroids[i].g = Math.round(newCentroids[i].g / counts[i]);
					newCentroids[i].b = Math.round(newCentroids[i].b / counts[i]);
				} else {
					// Re-initialize centroid if it has no assigned unique colors
					newCentroids[i] = getRandomCentroid(originalUniqueColors);
				}
			}
			centroids = newCentroids;
		}
		finalPalette = centroids;
	} // Missing closing brace added here

	// Create the new image data by mapping original pixels to the final palette
	const quantizedPixels = new Uint8ClampedArray(imageData.data.length);
	let pixelIndex = 0;
	for (let i = 0; i < imageData.data.length; i += 4) {
		if (imageData.data[i + 3] > 0) {
			const originalPixel: RGB = {
				r: imageData.data[i],
				g: imageData.data[i + 1],
				b: imageData.data[i + 2]
			};

			let minDistance = Infinity;
			let closestColor: RGB = finalPalette[0]; // Default to the first color in the palette

			for (const paletteColor of finalPalette) {
				const distance = colorDistance(originalPixel, paletteColor);
				if (distance < minDistance) {
					minDistance = distance;
					closestColor = paletteColor;
				}
			}

			quantizedPixels[i] = closestColor.r;
			quantizedPixels[i + 1] = closestColor.g;
			quantizedPixels[i + 2] = closestColor.b;
			quantizedPixels[i + 3] = 255; // Make it fully opaque
		} else {
			// Preserve transparency
			quantizedPixels[i] = 0;
			quantizedPixels[i + 1] = 0;
			quantizedPixels[i + 2] = 0;
			quantizedPixels[i + 3] = 0;
		}
	}

	return { quantizedPixels, palette: finalPalette };
}
