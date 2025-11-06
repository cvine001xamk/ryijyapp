<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import ColorPalette from './ColorPalette.svelte';
	import { jsPDF } from 'jspdf';
	import { rgbToHex, hexToRgb, getBrightness } from '$lib/utils/helperFunctions';
	import type { RGB } from '$lib/utils/helperFunctions';

	export let imageFile: File | null;
	export let pixelSize: number;
	export let borderColor: 'black' | 'white';

	let originalCanvas: HTMLCanvasElement;
	let processedCanvas: HTMLCanvasElement;
	let colorCounts: Map<string, number> = new Map();
	let gridInfo = '';
	let img: HTMLImageElement | null = null;
	let isImageLoaded = false;

	// New display mode related variables
	type DisplayMode = 'color' | 'number' | 'letter' | 'code';
	let displayMode: DisplayMode = 'color';
	let colorToIdentifier = new Map<string, string>();
	let nextNumber = 1;
	let nextLetter = 'A';

	const NUMBER_FONT_SIZE = 12;
	const NUMBER_MARGIN_BOTTOM = 15;
	const NUMBER_TEXT_COLOR = 'black';

	function getIdentifierForColor(hex: string): string {
		if (!colorToIdentifier.has(hex)) {
			switch (displayMode) {
				case 'number':
					colorToIdentifier.set(hex, nextNumber.toString());
					nextNumber++;
					break;
				case 'letter':
					colorToIdentifier.set(hex, nextLetter);
					nextLetter = String.fromCharCode(nextLetter.charCodeAt(0) + 1);
					break;
				case 'code':
					colorToIdentifier.set(hex, hex.substring(1, 4));
					break;
			}
		}
		return colorToIdentifier.get(hex) || '';
	}

	// Watch for new image file
	$: if (browser && imageFile) {
		loadImage(imageFile);
	}

	function loadImage(file: File) {
		const reader = new FileReader();
		reader.onload = (e) => {
			if (!img) img = new Image();
			img.onload = () => {
				if (!originalCanvas) return;
				const ctx = originalCanvas.getContext('2d');
				if (!ctx) return;

				originalCanvas.width = img!.width;
				originalCanvas.height = img!.height;
				ctx.drawImage(img!, 0, 0);
				isImageLoaded = true;
			};
			img.src = e.target?.result as string;
		};
		reader.readAsDataURL(file);
	}

	function getRepresentativeColorInBlock(
		originalPixels: Uint8ClampedArray,
		blockX: number,
		blockY: number,
		pixelSize: number,
		originalWidth: number,
		originalHeight: number
	): RGB {
		const colorCounts: Record<string, number> = {};
		let totalOpaquePixels = 0;

		for (let dy = 0; dy < pixelSize && blockY + dy < originalHeight; dy++) {
			for (let dx = 0; dx < pixelSize && blockX + dx < originalWidth; dx++) {
				const i = ((blockY + dy) * originalWidth + (blockX + dx)) * 4;
				const r = originalPixels[i];
				const g = originalPixels[i + 1];
				const b = originalPixels[i + 2];
				const a = originalPixels[i + 3];
				if (a > 0) {
					const key = `${r},${g},${b}`;
					colorCounts[key] = (colorCounts[key] || 0) + 1;
					totalOpaquePixels++;
				}
			}
		}

		if (totalOpaquePixels === 0) return { r: 238, g: 238, b: 238 };

		let primaryColorKey = '';
		let maxCount = 0;
		for (const key in colorCounts) {
			if (colorCounts[key] > maxCount) {
				maxCount = colorCounts[key];
				primaryColorKey = key;
			}
		}
		const [pr, pg, pb] = primaryColorKey.split(',').map(Number);
		const primaryColor = { r: pr, g: pg, b: pb };
		const primaryBrightness = getBrightness(pr, pg, pb);

		const contrastThreshold = 60;
		const secondaryPresence = Math.max(1, Math.floor(totalOpaquePixels * 0.15));

		for (const key in colorCounts) {
			if (key === primaryColorKey) continue;
			if (colorCounts[key] < secondaryPresence) continue;

			const [sr, sg, sb] = key.split(',').map(Number);
			const secondaryBrightness = getBrightness(sr, sg, sb);
			if (Math.abs(primaryBrightness - secondaryBrightness) > contrastThreshold) {
				if (
					primaryBrightness > secondaryBrightness &&
					primaryBrightness - secondaryBrightness > contrastThreshold
				) {
					return { r: sr, g: sg, b: sb };
				}
			}
		}

		return primaryColor;
	}

	function processImage(): void {
		if (!img?.src || !isImageLoaded) {
			alert('Please load an image first!');
			return;
		}

		const ctx = originalCanvas.getContext('2d');
		const pctx = processedCanvas.getContext('2d');
		if (!ctx || !pctx) return;

		const desired = parseInt(pixelSize.toString());
		let blockSize = Math.floor(originalCanvas.width / desired);
		if (blockSize < 1) blockSize = 1;

		const outputWidth = Math.ceil(originalCanvas.width / blockSize) * blockSize;
		const outputHeight = Math.ceil(originalCanvas.height / blockSize) * blockSize;
		const cols = outputWidth / blockSize;
		const rows = Math.ceil(originalCanvas.height / blockSize);
		gridInfo = `${cols} × ${rows} ruutua`;

		processedCanvas.width = outputWidth + 30;
		processedCanvas.height = outputHeight + 30;
		pctx.clearRect(0, 0, processedCanvas.width, processedCanvas.height);

		const imageData = ctx.getImageData(0, 0, originalCanvas.width, originalCanvas.height);
		const pixels = imageData.data;
		colorCounts = new Map();
		colorToIdentifier.clear();
		nextNumber = 1;
		nextLetter = 'A';

		for (let y = 0; y < outputHeight; y += blockSize) {
			for (let x = 0; x < outputWidth; x += blockSize) {
				const c = getRepresentativeColorInBlock(
					pixels,
					x,
					y,
					blockSize,
					originalCanvas.width,
					originalCanvas.height
				);
				const hex = rgbToHex(c.r, c.g, c.b);
				colorCounts.set(hex, (colorCounts.get(hex) || 0) + 1);

				if (displayMode === 'color') {
					pctx.fillStyle = `rgb(${c.r}, ${c.g}, ${c.b})`;
					pctx.fillRect(x, y, blockSize, blockSize);
				} else {
					pctx.fillStyle = 'white';
					pctx.fillRect(x, y, blockSize, blockSize);

					// Draw identifier
					const identifier = getIdentifierForColor(hex);
					pctx.fillStyle = 'black';
					pctx.font = `${Math.max(12, blockSize * 0.5)}px Arial`;
					pctx.textAlign = 'center';
					pctx.textBaseline = 'middle';
					pctx.fillText(identifier, x + blockSize / 2, y + blockSize / 2);
				}

				pctx.strokeStyle = borderColor;
				pctx.lineWidth = 1;
				pctx.strokeRect(x, y, blockSize, blockSize);
			}
		}

		// Draw numbering
		pctx.fillStyle = NUMBER_TEXT_COLOR;
		pctx.font = `${NUMBER_FONT_SIZE}px Arial`;
		pctx.textAlign = 'center';
		pctx.textBaseline = 'top';

		for (let col = 1; col <= cols; col++) {
			if (col === 1 || col % 10 === 0) {
				const xPos = (col - 1) * blockSize + blockSize / 2;
				const yPos = outputHeight + NUMBER_MARGIN_BOTTOM;
				pctx.fillText(col.toString(), xPos, yPos);
			}
		}

		for (let row = 1; row <= rows; row++) {
			if (row === 1 || row % 10 === 0) {
				const xPos = outputWidth + 15;
				const yPos = outputHeight - (row - 1) * blockSize - blockSize / 2;
				pctx.fillText(row.toString(), xPos, yPos);
			}
		}
	}

	const THREAD_LENGTH_PER_KNOT = 24; // cm per knot
	const THREADS_PER_KNOT = 4; // number of threads per knot

	function saveImage(): void {
		if (!processedCanvas?.width) {
			alert('No processed image!');
			return;
		}

		const pdf = new jsPDF();
		const pageWidth = pdf.internal.pageSize.getWidth();
		const pageHeight = pdf.internal.pageSize.getHeight();

		// Add title
		pdf.setFontSize(20);
		pdf.text('Ryijykaavio', pageWidth / 2, 15, { align: 'center' });

		// Add grid size info
		pdf.setFontSize(12);
		pdf.text(`Ruudukko: ${gridInfo}`, 20, 25);

		// Add processed image
		const imgData = processedCanvas.toDataURL('image/png');
		const imgWidth = Math.min(pageWidth - 40, 170); // Max width with margins
		const imgHeight = (processedCanvas.height * imgWidth) / processedCanvas.width;
		pdf.addImage(imgData, 'PNG', 20, 35, imgWidth, imgHeight);

		// Add color information
		let yPosition = imgHeight + 50;
		pdf.setFontSize(14);
		pdf.text('Käytetyt värit:', 20, yPosition);
		yPosition += 10;

		// Add color swatches and information
		pdf.setFontSize(12);
		for (const [hex, count] of colorCounts.entries()) {
			// Check if we need a new page
			if (yPosition > pageHeight - 20) {
				pdf.addPage();
				yPosition = 20;
			}

			const totalThreads = count * THREADS_PER_KNOT;
			const totalLength = (count * THREAD_LENGTH_PER_KNOT * THREADS_PER_KNOT) / 100; // Convert to meters

			// Draw color rectangle
			const rgb = hexToRgb(hex);
			if (rgb) {
				pdf.setFillColor(rgb.r, rgb.g, rgb.b);
				pdf.rect(20, yPosition - 5, 10, 10, 'F');
			}

			// Add color information with thread calculations
			const identifier = displayMode !== 'color' ? `(${colorToIdentifier.get(hex) || ''}) ` : '';
			pdf.text(
				`${identifier}${hex} - ${count} ruutua - ${totalThreads} lankaa (${totalLength.toFixed(1)} m)`,
				35,
				yPosition
			);
			yPosition += 15;
		}

		// Calculate and add total threads needed
		const totalKnots = Array.from(colorCounts.values()).reduce((sum, count) => sum + count, 0);
		const totalThreadCount = totalKnots * THREADS_PER_KNOT;
		const totalThreadLength = (totalKnots * THREAD_LENGTH_PER_KNOT * THREADS_PER_KNOT) / 100;

		yPosition += 10;
		pdf.setFontSize(14);
		pdf.text('Yhteensä:', 20, yPosition);
		yPosition += 10;
		pdf.setFontSize(12);
		pdf.text(`Solmuja: ${totalKnots}`, 20, yPosition);
		yPosition += 8;
		pdf.text(`Lankoja: ${totalThreadCount}`, 20, yPosition);
		yPosition += 8;
		pdf.text(`Lankojen kokonaispituus: ${totalThreadLength.toFixed(1)} m`, 20, yPosition);

		// Save the PDF
		pdf.save('ryijykaavio.pdf');
	}
</script>

<div class="flex flex-col items-center gap-4">
	<div class="flex gap-3">
		<button
			on:click={processImage}
			class="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:bg-gray-300"
			disabled={!isImageLoaded}
		>
			Muodosta kaavio
		</button>

		{#if processedCanvas?.width}
			<button
				on:click={saveImage}
				class="rounded-lg bg-green-500 px-4 py-2 text-white hover:bg-green-600"
				disabled={!processedCanvas?.width}
			>
				Tallenna kaavio
			</button>
			<div class="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 shadow-sm">
				<span class="text-sm text-gray-700">Näyttötapa:</span>
				<select
					bind:value={displayMode}
					on:change={processImage}
					class="rounded border-gray-300 text-sm"
				>
					<option value="color">Värit</option>
					<option value="number">Numerot</option>
					<option value="letter">Kirjaimet</option>
					<option value="code">Koodit</option>
				</select>
			</div>
		{/if}
	</div>

	{#if gridInfo}
		<p class="text-sm text-gray-700">{gridInfo}</p>
	{/if}

	<canvas bind:this={processedCanvas} class="w-full max-w-3xl rounded border shadow"></canvas>
	<ColorPalette {colorCounts} {colorToIdentifier} {displayMode} />
	<canvas bind:this={originalCanvas} class="w-full max-w-3xl rounded border shadow"></canvas>
</div>
