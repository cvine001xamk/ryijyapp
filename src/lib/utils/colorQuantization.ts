import type { RGB } from './helperFunctions';

export function reduceColors(colors: RGB[], targetCount: number): RGB[] {
	if (colors.length <= targetCount) return colors;

	let clusters = colors.map((color) => ({
		colors: [color],
		centroid: { ...color }
	}));

	while (clusters.length > targetCount) {
		let minDistance = Infinity;
		let closestPair = [0, 1];

		// Find closest clusters
		for (let i = 0; i < clusters.length; i++) {
			for (let j = i + 1; j < clusters.length; j++) {
				const distance = colorDistance(clusters[i].centroid, clusters[j].centroid);
				if (distance < minDistance) {
					minDistance = distance;
					closestPair = [i, j];
				}
			}
		}

		// Merge clusters
		const [i, j] = closestPair;
		const merged = {
			colors: [...clusters[i].colors, ...clusters[j].colors],
			centroid: calculateCentroid([...clusters[i].colors, ...clusters[j].colors])
		};

		clusters = [
			...clusters.slice(0, i),
			...clusters.slice(i + 1, j),
			...clusters.slice(j + 1),
			merged
		];
	}

	return clusters.map((cluster) => cluster.centroid);
}

export function colorDistance(a: RGB, b: RGB): number {
	return Math.sqrt(Math.pow(a.r - b.r, 2) + Math.pow(a.g - b.g, 2) + Math.pow(a.b - b.b, 2));
}

function calculateCentroid(colors: RGB[]): RGB {
	const sum = colors.reduce(
		(acc, color) => ({
			r: acc.r + color.r,
			g: acc.g + color.g,
			b: acc.b + color.b
		}),
		{ r: 0, g: 0, b: 0 }
	);

	return {
		r: Math.round(sum.r / colors.length),
		g: Math.round(sum.g / colors.length),
		b: Math.round(sum.b / colors.length)
	};
}
