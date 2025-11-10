<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import ColorPalette from './ColorPalette.svelte';
	import { rgbToHex, getBrightness, hexToRgb } from '$lib/utils/helperFunctions';
	import type { RGB } from '$lib/utils/helperFunctions';
	import { generatePdf } from '$lib/utils/pdfGenerator';
	import CanvasControls from './CanvasControls.svelte';
	import {
		pixelSize,
		borderColor,
		aspectRatio,
		symbolType,
		showColor,
		colorAmount,
		maxColors,
		threadsPerKnot,
		tuftWidth,
		tuftHeight,
		wastage
	} from '$lib/stores/settingsStore';
	import { quantizeColors } from '$lib/utils/colorQuantization';
	import ColorPicker from './ColorPicker.svelte';
	import SaveConfirmationModal from './SaveConfirmationModal.svelte';

	export let imageFile: File | null;
	export let showOriginal = false;

	let originalCanvas: HTMLCanvasElement;
	let processedCanvas: HTMLCanvasElement;
	let colorCounts: Map<string, number> = new Map();
	let gridInfo = '';
	let img: HTMLImageElement | null = null;
	let isImageLoaded = false;
	let isProcessed = false;
	let isLoading = false;
	let isSaveModalOpen = false;

	let colorToIdentifier = new Map<string, string>();
	let nextNumber = 1;
	let nextLetter = 'A';

	let pixelatedData: (RGB | null)[][] = [];
	let gridDimensions = { rows: 0, cols: 0, blockWidth: 0, blockHeight: 0 };

	const NUMBER_FONT_SIZE = 12;
	const BOLD_LINE_WIDTH = 3;
	const NORMAL_LINE_WIDTH = 0.8;

	let showColorPicker = false;
	let colorPickerPos = { x: 0, y: 0 };
	let selectedPixel: { row: number; col: number } | null = null;

	function handleCanvasClick(event: MouseEvent) {
		if (!isProcessed) return;

		const { rows, cols, blockWidth, blockHeight } = gridDimensions;
		const outputWidth = cols * blockWidth;
		const outputHeight = rows * blockHeight;

		const rect = processedCanvas.getBoundingClientRect();
		const scaleX = outputWidth / rect.width;
		const scaleY = outputHeight / rect.height;

		const canvasX = (event.clientX - rect.left) * scaleX;
		const canvasY = (event.clientY - rect.top) * scaleY;

		const col = Math.floor(canvasX / blockWidth);
		const row = Math.floor(canvasY / blockHeight);

		if (col >= 0 && col < cols && row >= 0 && row < rows) {
			selectedPixel = { row, col };
			colorPickerPos = { x: event.clientX, y: event.clientY };
			showColorPicker = true;
		}
	}

	function changeColor(event: CustomEvent<string>) {
		if (!selectedPixel) return;
		const newColorHex = event.detail;
		const newColorRgb = hexToRgb(newColorHex);

		if (newColorRgb) {
			const { row, col } = selectedPixel;
			pixelatedData[row][col] = newColorRgb;
			drawCanvas();
		}
		showColorPicker = false;
	}

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

	function loadImage(file: File) {
		isProcessed = false;
		gridInfo = '';
		colorCounts = new Map();
		colorToIdentifier = new Map();
		pixelatedData = [];
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

				const imageData = ctx.getImageData(0, 0, originalCanvas.width, originalCanvas.height);
				const uniqueColors = new Set<string>();
				for (let i = 0; i < imageData.data.length; i += 4) {
					if (imageData.data[i + 3] > 0) {
						uniqueColors.add(
							`${imageData.data[i]},${imageData.data[i + 1]},${imageData.data[i + 2]}`
						);
					}
				}
				const newMaxColors = Math.min(uniqueColors.size, 30);
				maxColors.set(newMaxColors);
				// Only update colorAmount if the current value is greater than the new maximum
				colorAmount.update((currentAmount) => Math.min(currentAmount, newMaxColors));

				isImageLoaded = true;
				showOriginal = true;
			};
			img.src = e.target?.result as string;
		};
		reader.readAsDataURL(file);
	}

	function drawCanvas() {
		if (!isProcessed) return;
		const pctx = processedCanvas.getContext('2d');
		if (!pctx) return;

		const { rows, cols, blockWidth, blockHeight } = gridDimensions;
		const outputWidth = cols * blockWidth;
		const outputHeight = rows * blockHeight;

		processedCanvas.width = outputWidth + 30;
		processedCanvas.height = outputHeight + 30;
		pctx.clearRect(0, 0, processedCanvas.width, processedCanvas.height);

		colorCounts = new Map();
		const uniqueColors = new Set<string>();
		for (let r = 0; r < rows; r++) {
			for (let c = 0; c < cols; c++) {
				const color = pixelatedData[r][c];
				if (!color) continue;
				const hex = rgbToHex(color.r, color.g, color.b);
				colorCounts.set(hex, (colorCounts.get(hex) || 0) + 1);
				uniqueColors.add(hex);
			}
		}

		const sortedColors = Array.from(uniqueColors).sort();
		colorToIdentifier.clear();
		nextNumber = 1;
		nextLetter = 'A';
		for (const hex of sortedColors) {
			if ($symbolType !== 'ei mitään') {
				getIdentifierForColor(hex, $symbolType);
			}
		}

		for (let r = 0; r < rows; r++) {
			for (let c = 0; c < cols; c++) {
				const color = pixelatedData[r][c];
				if (!color) continue;

				const x = c * blockWidth;
				const y = r * blockHeight;
				const hex = rgbToHex(color.r, color.g, color.b);

				pctx.fillStyle = $showColor ? `rgb(${color.r}, ${color.g}, ${color.b})` : 'white';
				pctx.fillRect(x, y, blockWidth, blockHeight);

				if ($symbolType !== 'ei mitään') {
					const identifier = colorToIdentifier.get(hex) || '';
					if (!$showColor) {
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

		drawGrid(pctx, rows, cols, blockWidth, blockHeight, outputWidth, outputHeight);
		drawNumbering(pctx, rows, cols, blockWidth, blockHeight, outputWidth, outputHeight);
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
		pctx.strokeStyle = $borderColor;
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
		if (!img?.src || !isImageLoaded || isLoading) {
			return;
		}
		isLoading = true;
		showOriginal = false;

		setTimeout(() => {
			const ctx = originalCanvas.getContext('2d');
			if (!ctx) {
				isLoading = false;
				return;
			}

			const desired = parseInt($pixelSize.toString());
			const [widthRatio, heightRatio] = $aspectRatio.split(':').map(Number);

			const blockWidth = Math.floor(originalCanvas.width / desired);
			if (blockWidth < 1) {
				isLoading = false;
				return;
			}
			const blockHeight = Math.floor(blockWidth * (heightRatio / widthRatio));
			if (blockHeight < 1) {
				isLoading = false;
				return;
			}

			const cols = Math.floor(originalCanvas.width / blockWidth);
			const rows = Math.floor(originalCanvas.height / blockHeight);
			gridDimensions = { rows, cols, blockWidth, blockHeight };
			gridInfo = `${cols} × ${rows} ruutua`;

			const imageData = ctx.getImageData(0, 0, originalCanvas.width, originalCanvas.height);
			const { quantizedPixels } = quantizeColors(imageData, $colorAmount);

			pixelatedData = Array(rows)
				.fill(null)
				.map(() => Array(cols).fill(null));

			for (let r = 0; r < rows; r++) {
				for (let c = 0; c < cols; c++) {
					const x = c * blockWidth;
					const y = r * blockHeight;
					const representativeX = Math.floor(x + blockWidth / 2);
					const representativeY = Math.floor(y + blockHeight / 2);
					const i = (representativeY * originalCanvas.width + representativeX) * 4;
					pixelatedData[r][c] = {
						r: quantizedPixels[i],
						g: quantizedPixels[i + 1],
						b: quantizedPixels[i + 2]
					};
				}
			}

			isProcessed = true;
			drawCanvas();
			isLoading = false;
		}, 10);
	}

	function save() {
		isSaveModalOpen = true;
	}

	function confirmSave() {
		generatePdf({
			canvas: processedCanvas,
			gridInfo,
			colorCounts,
			colorToIdentifier,
			symbolType: $symbolType,
			threadsPerKnot: $threadsPerKnot,
			tuftWidth: $tuftWidth,
			tuftHeight: $tuftHeight,
			wastage: $wastage
		});
		isSaveModalOpen = false;
	}

	$: if (isProcessed && ($symbolType || $showColor || $borderColor)) {
		drawCanvas();
	}
</script>

<div class="flex flex-col items-center gap-4">
	<CanvasControls
		{isImageLoaded}
		on:process={processImage}
		on:save={save}
		bind:showOriginal
		{isProcessed}
	/>

	{#if isLoading}
		<div class="flex items-center justify-center">
			<div class="h-32 w-32 animate-spin rounded-full border-t-2 border-b-2 border-blue-500"></div>
		</div>
	{/if}

	<canvas
		bind:this={processedCanvas}
		class="w-full max-w-3xl rounded border shadow"
		class:hidden={showOriginal || isLoading}
		on:click={handleCanvasClick}
	></canvas>
	{#if gridInfo && !showOriginal && !isLoading}
		<p class="text-sm text-gray-700">{gridInfo}</p>
	{/if}
	{#if img}
		<img
			src={img.src}
			alt="Original"
			class="w-full max-w-3xl rounded border shadow"
			class:hidden={!showOriginal || isLoading}
		/>
	{/if}

	<ColorPicker
		show={showColorPicker}
		position={colorPickerPos}
		colors={Array.from(colorCounts.keys())}
		{colorToIdentifier}
		symbolType={$symbolType}
		on:select={changeColor}
		on:close={() => (showColorPicker = false)}
	/>

	<ColorPalette {colorCounts} {colorToIdentifier} symbolType={$symbolType} />
	<SaveConfirmationModal
		isOpen={isSaveModalOpen}
		onConfirm={confirmSave}
		onClose={() => (isSaveModalOpen = false)}
	/>
	<canvas bind:this={originalCanvas} class="hidden"></canvas>
</div>
