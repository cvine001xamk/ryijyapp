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

export function getPaletteFromImage(imageData: ImageData, k: number): RGB[] {
	const colorCounts = new Map<number, number>();
	const pixelsSample: RGB[] = [];
	const maxSample = 10000;
	let pixelCount = 0;

	for (let i = 0; i < imageData.data.length; i += 4) {
		if (imageData.data[i + 3] > 0) {
			const r = imageData.data[i];
			const g = imageData.data[i + 1];
			const b = imageData.data[i + 2];
			
			// Track unique colors using integer representation for performance
			const colorInt = (r << 16) | (g << 8) | b;
			colorCounts.set(colorInt, (colorCounts.get(colorInt) || 0) + 1);

			// Reservoir sampling for k-means
			if (pixelCount < maxSample) {
				pixelsSample.push({ r, g, b });
			} else {
				const j = Math.floor(Math.random() * (pixelCount + 1));
				if (j < maxSample) {
					pixelsSample[j] = { r, g, b };
				}
			}
			pixelCount++;
		}
	}

	// Filter out noise: find colors that make up 99% of the image
	const sortedColors = Array.from(colorCounts.entries()).sort((a, b) => b[1] - a[1]);
	const significantColors: RGB[] = [];
	let cumulativeCount = 0;
	const threshold = pixelCount * 0.99;

	for (const [colorInt, count] of sortedColors) {
		significantColors.push({
			r: (colorInt >> 16) & 255,
			g: (colorInt >> 8) & 255,
			b: colorInt & 255
		});
		cumulativeCount += count;
		if (cumulativeCount >= threshold) {
			break;
		}
	}

	// If significant colors fit in k, use them (ignoring the long tail of noise)
	if (significantColors.length <= k) {
		return significantColors;
	}

	// Otherwise, perform k-means on the sample
	let centroids: RGB[] = [];
	// Initialize centroids with random pixels from the sample
	for (let i = 0; i < k; i++) {
		centroids.push(getRandomCentroid(pixelsSample));
	}

	let assignments: number[] = new Array(pixelsSample.length);
	let oldAssignments: number[] | null = null;

	for (let iteration = 0; iteration < 10; iteration++) {
		// Assign each pixel to the closest centroid
		for (let i = 0; i < pixelsSample.length; i++) {
			let minDistance = Infinity;
			let closestCentroid = 0;
			for (let j = 0; j < centroids.length; j++) {
				const distance = colorDistance(pixelsSample[i], centroids[j]);
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

		for (let i = 0; i < pixelsSample.length; i++) {
			const centroidIndex = assignments[i];
			newCentroids[centroidIndex].r += pixelsSample[i].r;
			newCentroids[centroidIndex].g += pixelsSample[i].g;
			newCentroids[centroidIndex].b += pixelsSample[i].b;
			counts[centroidIndex]++;
		}

		for (let i = 0; i < k; i++) {
			if (counts[i] > 0) {
				newCentroids[i].r = Math.round(newCentroids[i].r / counts[i]);
				newCentroids[i].g = Math.round(newCentroids[i].g / counts[i]);
				newCentroids[i].b = Math.round(newCentroids[i].b / counts[i]);
			} else {
				newCentroids[i] = getRandomCentroid(pixelsSample);
			}
		}
		centroids = newCentroids;
	}

	return mergeSimilarColors(centroids, 25);
}

function mergeSimilarColors(palette: RGB[], threshold: number): RGB[] {
	let mergedPalette = [...palette];
	let changed = true;

	while (changed && mergedPalette.length > 2) {
		changed = false;
		let minDist = Infinity;
		let mergeIdx1 = -1;
		let mergeIdx2 = -1;

		// Find closest pair
		for (let i = 0; i < mergedPalette.length; i++) {
			for (let j = i + 1; j < mergedPalette.length; j++) {
				const dist = colorDistance(mergedPalette[i], mergedPalette[j]);
				if (dist < minDist) {
					minDist = dist;
					mergeIdx1 = i;
					mergeIdx2 = j;
				}
			}
		}

		if (minDist < threshold) {
			// Merge
			const c1 = mergedPalette[mergeIdx1];
			const c2 = mergedPalette[mergeIdx2];
			const newColor: RGB = {
				r: Math.round((c1.r + c2.r) / 2),
				g: Math.round((c1.g + c2.g) / 2),
				b: Math.round((c1.b + c2.b) / 2)
			};

			// Remove old colors and add new one
			mergedPalette = mergedPalette.filter((_, idx) => idx !== mergeIdx1 && idx !== mergeIdx2);
			mergedPalette.push(newColor);
			changed = true;
		}
	}

	return mergedPalette;
}

export function mapColorsToPalette(colors: RGB[], palette: RGB[]): RGB[] {
	return colors.map(color => {
		let minDistance = Infinity;
		let closestColor: RGB = palette[0];

		for (const paletteColor of palette) {
			const distance = colorDistance(color, paletteColor);
			if (distance < minDistance) {
				minDistance = distance;
				closestColor = paletteColor;
			}
		}
		return closestColor;
	});
}
