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

// Function to get a random centroid from the pixels
function getRandomCentroid(pixels: RGB[]): RGB {
	return pixels[Math.floor(Math.random() * pixels.length)];
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

	const uniqueColors = Array.from(new Set(pixels.map((p) => JSON.stringify(p)))).map(
		(s) => JSON.parse(s) as RGB
	);
	if (uniqueColors.length <= k) {
		return { quantizedPixels: new Uint8ClampedArray(imageData.data), palette: uniqueColors };
	}

	let centroids: RGB[] = [];
	// Initialize centroids with random colors from the image
	for (let i = 0; i < k; i++) {
		centroids.push(getRandomCentroid(pixels));
	}

	let assignments: number[] = new Array(pixels.length);
	let oldAssignments: number[] | null = null;

	for (let iteration = 0; iteration < 10; iteration++) {
		// Assign each pixel to the closest centroid
		for (let i = 0; i < pixels.length; i++) {
			let minDistance = Infinity;
			let closestCentroid = 0;
			for (let j = 0; j < centroids.length; j++) {
				const distance = colorDistance(pixels[i], centroids[j]);
				if (distance < minDistance) {
					minDistance = distance;
					closestCentroid = j;
				}
			}
			assignments[i] = closestCentroid;
		}

		// Check for convergence
		if (JSON.stringify(assignments) === JSON.stringify(oldAssignments)) {
			break;
		}
		oldAssignments = [...assignments];

		// Update centroids
		const newCentroids: RGB[] = new Array(k).fill(null).map(() => ({ r: 0, g: 0, b: 0 }));
		const counts: number[] = new Array(k).fill(0);

		for (let i = 0; i < pixels.length; i++) {
			const centroidIndex = assignments[i];
			newCentroids[centroidIndex].r += pixels[i].r;
			newCentroids[centroidIndex].g += pixels[i].g;
			newCentroids[centroidIndex].b += pixels[i].b;
			counts[centroidIndex]++;
		}

		for (let i = 0; i < k; i++) {
			if (counts[i] > 0) {
				newCentroids[i].r = Math.round(newCentroids[i].r / counts[i]);
				newCentroids[i].g = Math.round(newCentroids[i].g / counts[i]);
				newCentroids[i].b = Math.round(newCentroids[i].b / counts[i]);
			} else {
				// Re-initialize centroid if it has no assigned pixels
				newCentroids[i] = getRandomCentroid(pixels);
			}
		}
		centroids = newCentroids;
	}

	// Create the new image data
	const quantizedPixels = new Uint8ClampedArray(imageData.data.length);
	let pixelIndex = 0;
	for (let i = 0; i < imageData.data.length; i += 4) {
		if (imageData.data[i + 3] > 0) {
			const centroidIndex = assignments[pixelIndex++];
			const centroid = centroids[centroidIndex];
			quantizedPixels[i] = centroid.r;
			quantizedPixels[i + 1] = centroid.g;
			quantizedPixels[i + 2] = centroid.b;
			quantizedPixels[i + 3] = 255; // Make it fully opaque
		} else {
			// Preserve transparency
			quantizedPixels[i] = 0;
			quantizedPixels[i + 1] = 0;
			quantizedPixels[i + 2] = 0;
			quantizedPixels[i + 3] = 0;
		}
	}

	return { quantizedPixels, palette: centroids };
}
