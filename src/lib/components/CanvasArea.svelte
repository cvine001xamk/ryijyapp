<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import ColorPalette from './ColorPalette.svelte';
	import { rgbToHex, getBrightness } from '$lib/utils/helperFunctions';
	import type { RGB } from '$lib/utils/helperFunctions';
	import { generatePdf } from '$lib/utils/pdfGenerator';
	import CanvasControls from './CanvasControls.svelte';

	export let imageFile: File | null;
	export let pixelSize: number;
	export let borderColor: 'black' | 'white';
	export let aspectRatio = '1:1';
	export let symbolType: 'kirjaimet' | 'numerot' | 'koodi' | 'ei mitään' = 'ei mitään';
	export let showColor = true;
	export let showOriginal = false;

	let originalCanvas: HTMLCanvasElement;
	let processedCanvas: HTMLCanvasElement;
	let colorCounts: Map<string, number> = new Map();
	let gridInfo = '';
	let img: HTMLImageElement | null = null;
	let isImageLoaded = false;
	let isProcessed = false;

	let colorToIdentifier = new Map<string, string>();
	let nextNumber = 1;
	let nextLetter = 'A';

	const NUMBER_FONT_SIZE = 12;
	const BOLD_LINE_WIDTH = 2;
	const NORMAL_LINE_WIDTH = 1;

	function getIdentifierForColor(hex: string, type: 'kirjaimet' | 'numerot' | 'koodi'): string {
		if (!colorToIdentifier.has(hex)) {
			switch (type) {
				case 'numerot':
					colorToIdentifier.set(hex, nextNumber.toString());
					nextNumber++;
					break;
				case 'kirjaimet':
					colorToIdentifier.set(hex, nextLetter);
					nextLetter = String.fromCharCode(nextLetter.charCodeAt(0) + 1);
					break;
				case 'koodi':
					colorToIdentifier.set(hex, hex.substring(1, 4));
					break;
			}
		}
		return colorToIdentifier.get(hex) || '';
	}

	$: if (browser && imageFile) {
		loadImage(imageFile);
	}

	$: if (
		(pixelSize || borderColor || aspectRatio || symbolType || showColor) &&
		isProcessed &&
		browser &&
		imageFile
	) {
		processImage();
	}

	function loadImage(file: File) {
		isProcessed = false;
		gridInfo = '';
		colorCounts = new Map();
		colorToIdentifier = new Map();
		const pctx = processedCanvas?.getContext('2d');
		if (pctx) {
			pctx.clearRect(0, 0, processedCanvas.width, processedCanvas.height);
		}

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
				showOriginal = true;
			};
			img.src = e.target?.result as string;
		};
		reader.readAsDataURL(file);
	}

	function getRepresentativeColorInBlock(
		originalPixels: Uint8ClampedArray,
		blockX: number,
		blockY: number,
		blockWidth: number,
		blockHeight: number,
		originalWidth: number,
		originalHeight: number
	): RGB {
		const colorCounts: Record<string, number> = {};
		let totalOpaquePixels = 0;

		for (let dy = 0; dy < blockHeight && blockY + dy < originalHeight; dy++) {
			for (let dx = 0; dx < blockWidth && blockX + dx < originalWidth; dx++) {
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

	function fillCells(
		pctx: CanvasRenderingContext2D,
		pixels: Uint8ClampedArray,
		rows: number,
		cols: number,
		blockWidth: number,
		blockHeight: number
	) {
		for (let r = 0; r < rows; r++) {
			for (let c = 0; c < cols; c++) {
				const x = c * blockWidth;
				const y = r * blockHeight;
				const color = getRepresentativeColorInBlock(
					pixels,
					x,
					y,
					blockWidth,
					blockHeight,
					originalCanvas.width,
					originalCanvas.height
				);
				const hex = rgbToHex(color.r, color.g, color.b);
				colorCounts.set(hex, (colorCounts.get(hex) || 0) + 1);

				pctx.fillStyle = showColor ? `rgb(${color.r}, ${color.g}, ${color.b})` : 'white';
				pctx.fillRect(x, y, blockWidth, blockHeight);

				if (symbolType !== 'ei mitään') {
					const identifier = getIdentifierForColor(hex, symbolType);
					if (!showColor) {
						pctx.fillStyle = 'black';
					} else {
						const brightness = getBrightness(color.r, color.g, color.b);
						pctx.fillStyle = brightness > 128 ? 'black' : 'white';
					}
					pctx.font = `${Math.max(12, Math.min(blockWidth, blockHeight) * 0.5)}px Arial`;
					pctx.textAlign = 'center';
					pctx.textBaseline = 'middle';
					pctx.fillText(identifier, x + blockWidth / 2, y + blockHeight / 2);
				}
			}
		}
	}

	function drawGrid(
		pctx: CanvasRenderingContext2D,
		rows: number,
		cols: number,
		blockWidth: number,
		blockHeight: number,
		outputWidth: number,
		outputHeight: number
	) {
		pctx.strokeStyle = borderColor;
		for (let c = 0; c <= cols; c++) {
			pctx.lineWidth = c % 5 === 0 ? BOLD_LINE_WIDTH : NORMAL_LINE_WIDTH;
			pctx.beginPath();
			pctx.moveTo(c * blockWidth, 0);
			pctx.lineTo(c * blockWidth, outputHeight);
			pctx.stroke();
		}
		for (let r = 0; r <= rows; r++) {
			pctx.lineWidth = (rows - r) % 5 === 0 ? BOLD_LINE_WIDTH : NORMAL_LINE_WIDTH;
			pctx.beginPath();
			pctx.moveTo(0, r * blockHeight);
			pctx.lineTo(outputWidth, r * blockHeight);
			pctx.stroke();
		}
	}

	function drawNumbering(
		pctx: CanvasRenderingContext2D,
		rows: number,
		cols: number,
		blockWidth: number,
		blockHeight: number,
		outputWidth: number,
		outputHeight: number
	) {
		pctx.fillStyle = 'black';
		pctx.font = `${NUMBER_FONT_SIZE}px Arial`;
		pctx.textAlign = 'center';
		pctx.textBaseline = 'top';

		for (let col = 1; col <= cols; col++) {
			if (col % 10 === 0) {
				const xPos = (col - 1) * blockWidth + blockWidth / 2;
				const yPos = outputHeight + 5;
				pctx.fillText(col.toString(), xPos, yPos);
			}
		}

		pctx.textAlign = 'left';
		pctx.textBaseline = 'middle';
		for (let row = 1; row <= rows; row++) {
			const rowFromBottom = rows - row + 1;
			if (rowFromBottom % 10 === 0) {
				const xPos = outputWidth + 5;
				const yPos = (row - 1) * blockHeight + blockHeight / 2;
				pctx.fillText(rowFromBottom.toString(), xPos, yPos);
			}
		}
	}

	function processImage(): void {
		showOriginal = false;
		if (!img?.src || !isImageLoaded) {
			return;
		}

		const ctx = originalCanvas.getContext('2d');
		const pctx = processedCanvas.getContext('2d');
		if (!ctx || !pctx) return;

		const desired = parseInt(pixelSize.toString());
		const [widthRatio, heightRatio] = aspectRatio.split(':').map(Number);

		const blockWidth = Math.floor(originalCanvas.width / desired);
		if (blockWidth < 1) return;
		const blockHeight = Math.floor(blockWidth * (heightRatio / widthRatio));
		if (blockHeight < 1) return;

		const cols = Math.floor(originalCanvas.width / blockWidth);
		const rows = Math.floor(originalCanvas.height / blockHeight);
		const outputWidth = cols * blockWidth;
		const outputHeight = rows * blockHeight;
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

		fillCells(pctx, pixels, rows, cols, blockWidth, blockHeight);
		drawGrid(pctx, rows, cols, blockWidth, blockHeight, outputWidth, outputHeight);
		drawNumbering(pctx, rows, cols, blockWidth, blockHeight, outputWidth, outputHeight);
		isProcessed = true;
	}

	function save() {
		generatePdf({
			canvas: processedCanvas,
			gridInfo,
			colorCounts,
			colorToIdentifier,
			symbolType
		});
	}
</script>

<div class="flex flex-col items-center gap-4">
	<CanvasControls
		{isImageLoaded}
		processedCanvasWidth={processedCanvas?.width}
		on:process={processImage}
		on:save={save}
		bind:showOriginal
		{isProcessed}
	/>

	<canvas
		bind:this={processedCanvas}
		class="w-full max-w-3xl rounded border shadow"
		class:hidden={showOriginal}
	></canvas>
	{#if gridInfo && !showOriginal}
		<p class="text-sm text-gray-700">{gridInfo}</p>
	{/if}
	{#if img}
		<img
			src={img.src}
			alt="Original"
			class="w-full max-w-3xl rounded border shadow"
			class:hidden={!showOriginal}
		/>
	{/if}

	<ColorPalette {colorCounts} {colorToIdentifier} {symbolType} />
	<canvas bind:this={originalCanvas} class="hidden"></canvas>
</div>
