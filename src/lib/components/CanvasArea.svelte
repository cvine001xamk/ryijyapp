<script lang="ts">
	import { onMount, createEventDispatcher } from 'svelte';
	import { browser } from '$app/environment';
	import ColorPalette from './ColorPalette.svelte';
	import { rgbToHex, getBrightness, hexToRgb } from '$lib/utils/helperFunctions';
	import type { RGB } from '$lib/utils/helperFunctions';
	import { generatePdf } from '$lib/utils/pdfGenerator';
	import { generateExcel } from '$lib/utils/excelGenerator';

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
		wastage,
		grayscale
	} from '$lib/stores/settingsStore';
	import { getPaletteFromImage, mapColorsToPalette } from '$lib/utils/colorQuantization';
	import ColorPicker from './ColorPicker.svelte';
	import SaveConfirmationModal from './SaveConfirmationModal.svelte';
	import ResetIcon from '$lib/icons/ResetIcon.svelte';
	import EyeIcon from '$lib/icons/EyeIcon.svelte';
	import GridIcon from '$lib/icons/GridIcon.svelte';
	import PostProcessSettings from './PostProcessSettings.svelte';

	export let imageFile: File | null;
	export let showOriginal = false;

	const dispatch = createEventDispatcher();

	let originalCanvas: HTMLCanvasElement;
	let processedCanvas: HTMLCanvasElement;
	let colorCounts: Map<string, number> = new Map();
	let gridInfo = '';
	let img: HTMLImageElement | null = null;
	let isImageLoaded = false;
	let isProcessed = false;
	let isLoading = false;
	let isSaveModalOpen = false;
	let imageUrl: string | null = null;

	let colorToIdentifier = new Map<string, string>();
	let identifierToColor = new Map<string, string>();
	let nextNumber = 1;
	let nextLetter = 'A';

	let pixelatedData: (RGB | null)[][] = [];
	let gridDimensions = { rows: 0, cols: 0, blockWidth: 0, blockHeight: 0 };
	let cachedGridCanvas: HTMLCanvasElement | null = null;

	function updateGridData() {
		if (!isProcessed) return;
		const { rows, cols } = gridDimensions;
		
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
			const type = $symbolType === 'ei mitään' ? 'numerot' : $symbolType;
			getIdentifierForColor(hex, type);
		}

		identifierToColor.clear();
		for (const [hex, identifier] of colorToIdentifier.entries()) {
			identifierToColor.set(identifier, hex);
		}
	}

	function renderGridToCache() {
		if (!isProcessed) return;
		
		const { rows, cols, blockWidth, blockHeight } = gridDimensions;
		const outputWidth = cols * blockWidth;
		const outputHeight = rows * blockHeight;

		if (!cachedGridCanvas) {
			cachedGridCanvas = document.createElement('canvas');
		}
		
		cachedGridCanvas.width = outputWidth;
		cachedGridCanvas.height = outputHeight;
		const ctx = cachedGridCanvas.getContext('2d');
		if (!ctx) return;

		// Draw background
		ctx.fillStyle = 'white';
		ctx.fillRect(0, 0, outputWidth, outputHeight);

		// Draw pixels
		for (let r = 0; r < rows; r++) {
			for (let c = 0; c < cols; c++) {
				const color = pixelatedData[r][c];
				if (!color) continue;

				const x = c * blockWidth;
				const y = r * blockHeight;
				const hex = rgbToHex(color.r, color.g, color.b);

				ctx.fillStyle = $showColor ? `rgb(${color.r}, ${color.g}, ${color.b})` : 'white';
				ctx.fillRect(x, y, blockWidth, blockHeight);

				if ($symbolType !== 'ei mitään') {
					const identifier = colorToIdentifier.get(hex) || '';
					if (!$showColor) {
						ctx.fillStyle = 'black';
					} else {
						const brightness = getBrightness(color.r, color.g, color.b);
						ctx.fillStyle = brightness > 128 ? 'black' : 'white';
					}
					ctx.font = `${Math.max(12, Math.min(blockWidth, blockHeight) * 0.5)}px Arial`;
					ctx.textAlign = 'center';
					ctx.textBaseline = 'middle';
					ctx.fillText(identifier, x + blockWidth / 2, y + blockHeight / 2);
				}
			}
		}

		// Draw grid lines
		ctx.strokeStyle = $borderColor;
		for (let c = 0; c <= cols; c++) {
			ctx.lineWidth = c % 5 === 0 ? BOLD_LINE_WIDTH : NORMAL_LINE_WIDTH;
			ctx.beginPath();
			ctx.moveTo(c * blockWidth, 0);
			ctx.lineTo(c * blockWidth, outputHeight);
			ctx.stroke();
		}
		for (let r = 0; r <= rows; r++) {
			ctx.lineWidth = (rows - r) % 5 === 0 ? BOLD_LINE_WIDTH : NORMAL_LINE_WIDTH;
			ctx.beginPath();
			ctx.moveTo(0, r * blockHeight);
			ctx.lineTo(outputWidth, r * blockHeight);
			ctx.stroke();
		}
	}

	const NUMBER_FONT_SIZE = 12;
	const BOLD_LINE_WIDTH = 3;
	const NORMAL_LINE_WIDTH = 0.8;

	let showColorPicker = false;
	let colorPickerPos = { x: 0, y: 0 };
	let selectedPixel: { row: number; col: number } | null = null;
	let inputBuffer = '';
	let bufferTimeout: ReturnType<typeof setTimeout> | null = null;

	let scale = 1;
	let pan = { x: 0, y: 0 };
	let isPanning = false;
	let lastPanPosition = { x: 0, y: 0 };
	let isPinching = false;
	let lastTouchDistance = 0;

	function handleCanvasClick(event: MouseEvent) {
		if (!isProcessed || isPanning) return;

		const { rows, cols, blockWidth, blockHeight } = gridDimensions;
		const outputWidth = cols * blockWidth;
		const outputHeight = rows * blockHeight;

		const rect = processedCanvas.getBoundingClientRect();
		const scaleX = outputWidth / rect.width;
		const scaleY = outputHeight / rect.height;

		const bitmapX = (event.clientX - rect.left) * scaleX;
		const bitmapY = (event.clientY - rect.top) * scaleY;

		const finalX = (bitmapX - pan.x) / scale;
		const finalY = (bitmapY - pan.y) / scale;

		const col = Math.floor(finalX / blockWidth);
		const row = Math.floor(finalY / blockHeight);

		if (col >= 0 && col < cols && row >= 0 && row < rows) {
			selectedPixel = { row, col };
			colorPickerPos = { x: event.clientX, y: event.clientY + 50 };
			showColorPicker = true;
			drawCanvas();
		}
	}

	function changeColor(event: CustomEvent<string>) {
		if (!selectedPixel) return;
		const newColorHex = event.detail;
		const newColorRgb = hexToRgb(newColorHex);

		if (newColorRgb) {
			const { row, col } = selectedPixel;
			pixelatedData[row][col] = newColorRgb;
			selectedPixel = null;
			updateGridData();
			renderGridToCache();
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
		imageUrl = null;
		const pctx = processedCanvas?.getContext('2d');
		if (pctx) {
			pctx.clearRect(0, 0, processedCanvas.width, processedCanvas.height);
		}

		const reader = new FileReader();
		reader.onload = (e) => {
			if (e.target?.result) {
				imageUrl = e.target.result as string;
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
					// drawCanvas(); // No need to draw canvas initially
				};
				img.src = e.target.result as string;
			}
		};
		reader.readAsDataURL(file);
	}

	function drawCanvas() {
		if (!isProcessed && (!showOriginal || !img)) return;
		const pctx = processedCanvas.getContext('2d');
		if (!pctx) return;

		let outputWidth, outputHeight;

		if (isProcessed) {
			const { rows, cols, blockWidth, blockHeight } = gridDimensions;
			outputWidth = cols * blockWidth;
			outputHeight = rows * blockHeight;
		} else if (img) {
			outputWidth = img.width;
			outputHeight = img.height;
		} else {
			return;
		}

		processedCanvas.width = outputWidth + 30;
		processedCanvas.height = outputHeight + 30;
		pctx.clearRect(0, 0, processedCanvas.width, processedCanvas.height);

		pctx.save();
		pctx.translate(pan.x, pan.y);
		pctx.scale(scale, scale);

		if (showOriginal && img) {
			// Draw original image scaled to fit the grid dimensions
			pctx.drawImage(img, 0, 0, outputWidth, outputHeight);
		} else if (isProcessed && cachedGridCanvas) {
			pctx.drawImage(cachedGridCanvas, 0, 0);
			
			// Draw selection highlight on top
			if (selectedPixel) {
				const { blockWidth, blockHeight } = gridDimensions;
				pctx.strokeStyle = 'white';
				pctx.lineWidth = BOLD_LINE_WIDTH;
				pctx.strokeRect(
					selectedPixel.col * blockWidth,
					selectedPixel.row * blockHeight,
					blockWidth,
					blockHeight
				);
			}
		}

		pctx.restore();
		
		if (isProcessed && scale === 1 && pan.x === 0 && pan.y === 0) {
			const { rows, cols, blockWidth, blockHeight } = gridDimensions;
			drawNumbering(pctx, rows, cols, blockWidth, blockHeight, outputWidth, outputHeight);
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

		if (selectedPixel) {
			pctx.strokeStyle = 'white';
			pctx.lineWidth = BOLD_LINE_WIDTH;
			pctx.strokeRect(
				selectedPixel.col * blockWidth,
				selectedPixel.row * blockHeight,
				blockWidth,
				blockHeight
			);
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

	export function processImage(): void {
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
			
			if ($grayscale) {
				for (let i = 0; i < imageData.data.length; i += 4) {
					const r = imageData.data[i];
					const g = imageData.data[i + 1];
					const b = imageData.data[i + 2];
					const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
					imageData.data[i] = gray;
					imageData.data[i + 1] = gray;
					imageData.data[i + 2] = gray;
				}
			}

			// 1. Get palette from original image (preserves exact colors if count is low)
			const palette = getPaletteFromImage(imageData, $colorAmount);

			// 2. Downsample: Calculate average color for each block
			const blockColors: RGB[] = [];
			const validBlocks: {r: number, c: number}[] = [];

			for (let r = 0; r < rows; r++) {
				for (let c = 0; c < cols; c++) {
					const x = c * blockWidth;
					const y = r * blockHeight;
					
					let rSum = 0, gSum = 0, bSum = 0, count = 0;
					
					// Iterate over pixels in the block
					for (let by = 0; by < blockHeight; by++) {
						for (let bx = 0; bx < blockWidth; bx++) {
							const pixelX = x + bx;
							const pixelY = y + by;
							
							if (pixelX < originalCanvas.width && pixelY < originalCanvas.height) {
								const i = (pixelY * originalCanvas.width + pixelX) * 4;
								// Only consider non-transparent pixels
								if (imageData.data[i + 3] > 0) {
									rSum += imageData.data[i];
									gSum += imageData.data[i + 1];
									bSum += imageData.data[i + 2];
									count++;
								}
							}
						}
					}

					if (count > 0) {
						blockColors.push({
							r: Math.round(rSum / count),
							g: Math.round(gSum / count),
							b: Math.round(bSum / count)
						});
						validBlocks.push({r, c});
					}
				}
			}

			// 3. Map downsampled colors to the palette
			const quantizedPixels = mapColorsToPalette(blockColors, palette);

			// Update colorAmount to reflect the actual number of colors used
			colorAmount.set(palette.length);

			pixelatedData = Array(rows)
				.fill(null)
				.map(() => Array(cols).fill(null));

			// 4. Map back to grid
			for (let i = 0; i < validBlocks.length; i++) {
				const { r, c } = validBlocks[i];
				pixelatedData[r][c] = quantizedPixels[i];
			}

			gridInfo = `${cols} × ${rows} ruutua, ${palette.length} väriä`;

			isProcessed = true;

			isProcessed = true;
			updateGridData();
			renderGridToCache();
			drawCanvas();
			isLoading = false;
		}, 10);
	}

	function save() {
		isSaveModalOpen = true;
	}

	function confirmSave(format: 'pdf' | 'excel') {
		const options = {
			canvas: processedCanvas,
			gridInfo,
			colorCounts,
			colorToIdentifier,
			symbolType: $symbolType,
			threadsPerKnot: $threadsPerKnot,
			tuftWidth: $tuftWidth,
			tuftHeight: $tuftHeight,
			wastage: $wastage,
			pixelatedData,
			aspectRatio: $aspectRatio
		};

		if (format === 'pdf') {
			generatePdf(options);
		} else {
			generateExcel(options);
		}
		isSaveModalOpen = false;
	}

	function handleResetView() {
		scale = 1;
		pan = { x: 0, y: 0 };
		drawCanvas();
	}

	$: if (isProcessed && ($symbolType || $showColor || $borderColor || showOriginal !== undefined)) {
		updateGridData();
		renderGridToCache();
		drawCanvas();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!selectedPixel) return;

		const { key } = event;

		if (key.startsWith('Arrow')) {
			if (bufferTimeout) clearTimeout(bufferTimeout);
			inputBuffer = '';

			let { row, col } = selectedPixel;
			const { rows, cols, blockWidth, blockHeight } = gridDimensions;

			let moved = false;
			if (key === 'ArrowUp') {
				if (row > 0) {
					row--;
					moved = true;
				}
			} else if (key === 'ArrowDown') {
				if (row < rows - 1) {
					row++;
					moved = true;
				}
			} else if (key === 'ArrowLeft') {
				if (col > 0) {
					col--;
					moved = true;
				}
			} else if (key === 'ArrowRight') {
				if (col < cols - 1) {
					col++;
					moved = true;
				}
			}

			if (moved) {
				event.preventDefault();
				selectedPixel = { row, col };

				const rect = processedCanvas.getBoundingClientRect();
				const outputWidth = cols * blockWidth;
				const outputHeight = rows * blockHeight;
				const scaleX = outputWidth / rect.width;
				const scaleY = outputHeight / rect.height;

				const canvasX = (col + 0.5) * blockWidth;
				const canvasY = (row + 0.5) * blockHeight;

				const bitmapX = canvasX * scale + pan.x;
				const bitmapY = canvasY * scale + pan.y;

				colorPickerPos = {
					x: bitmapX / scaleX + rect.left,
					y: bitmapY / scaleY + rect.top + 50
				};

				drawCanvas();
			}
		} else if (/^[a-zA-Z]$/.test(key)) {
			if ($symbolType === 'ei mitään') return;
			event.preventDefault();
			if (bufferTimeout) clearTimeout(bufferTimeout);
			inputBuffer = '';

			const pressedKey = key.toUpperCase();
			if (identifierToColor.has(pressedKey)) {
				const hex = identifierToColor.get(pressedKey);
				if (hex) {
					const newColorRgb = hexToRgb(hex);
					if (newColorRgb && selectedPixel) {
						const { row, col } = selectedPixel;
						pixelatedData[row][col] = newColorRgb;
						updateGridData();
						renderGridToCache();
						drawCanvas();
					}
				}
			}
		} else if (/^\d$/.test(key)) {
			if ($symbolType === 'ei mitään') return;
			event.preventDefault();
			if (bufferTimeout) clearTimeout(bufferTimeout);
			inputBuffer += key;

			const isPrefix = Array.from(identifierToColor.keys()).some(
				(id) => id.startsWith(inputBuffer) && id !== inputBuffer
			);
			const isFullMatch = identifierToColor.has(inputBuffer);

			const applyColorChange = (buffer: string) => {
				const hex = identifierToColor.get(buffer);
				if (hex) {
					const newColorRgb = hexToRgb(hex);
					if (newColorRgb && selectedPixel) {
						const { row, col } = selectedPixel;
						pixelatedData[row][col] = newColorRgb;
						updateGridData();
						renderGridToCache();
						drawCanvas();
					}
				}
			};

			if (isFullMatch && !isPrefix) {
				applyColorChange(inputBuffer);
				inputBuffer = '';
			} else if (isFullMatch || isPrefix) {
				bufferTimeout = setTimeout(() => {
					if (identifierToColor.has(inputBuffer)) {
						applyColorChange(inputBuffer);
					}
					inputBuffer = '';
					bufferTimeout = null;
				}, 400);
			} else {
				inputBuffer = '';
			}
		}
	}

	function handleWheel(event: WheelEvent) {
		event.preventDefault();

		const zoomIntensity = 0.1;
		const delta = -event.deltaY;
		const oldScale = scale;

		let newScale = scale + (delta > 0 ? zoomIntensity : -zoomIntensity);

		if (newScale < 1) {
			handleResetView();
			return;
		}

		scale = Math.max(1, Math.min(newScale, 5)); // Clamp scale, min 1

		const rect = processedCanvas.getBoundingClientRect();
		const mouseX = event.clientX - rect.left;
		const mouseY = event.clientY - rect.top;

		pan.x = mouseX - (mouseX - pan.x) * (scale / oldScale);
		pan.y = mouseY - (mouseY - pan.y) * (scale / oldScale);

		drawCanvas();
	}

	function handleMouseDown(event: MouseEvent) {
		if (event.button === 1) {
			// Middle mouse button
			isPanning = true;
			lastPanPosition = { x: event.clientX, y: event.clientY };
			processedCanvas.style.cursor = 'grabbing';
		}
	}

	function handleMouseMove(event: MouseEvent) {
		if (isPanning) {
			const dx = event.clientX - lastPanPosition.x;
			const dy = event.clientY - lastPanPosition.y;
			lastPanPosition = { x: event.clientX, y: event.clientY };

			pan.x += dx;
			pan.y += dy;
			drawCanvas();
		}
	}

	function handleMouseUp(event: MouseEvent) {
		if (event.button === 1) {
			isPanning = false;
			processedCanvas.style.cursor = 'default';
		}
	}

	function getTouchDistance(touches: TouchList): number {
		const dx = touches[0].clientX - touches[1].clientX;
		const dy = touches[0].clientY - touches[1].clientY;
		return Math.sqrt(dx * dx + dy * dy);
	}

	function handleTouchStart(event: TouchEvent) {
		if (event.touches.length === 2) {
			isPinching = true;
			lastTouchDistance = getTouchDistance(event.touches);
		} else if (event.touches.length === 1) {
			isPanning = true;
			lastPanPosition = { x: event.touches[0].clientX, y: event.touches[0].clientY };
		}
	}

	function handleTouchMove(event: TouchEvent) {
		event.preventDefault();
		if (isPinching && event.touches.length === 2) {
			const newTouchDistance = getTouchDistance(event.touches);
			const delta = newTouchDistance - lastTouchDistance;
			lastTouchDistance = newTouchDistance;

			const oldScale = scale;
			let newScale = scale + delta * 0.01; // Adjust sensitivity
			
			if (newScale < 1) {
				handleResetView();
				return;
			}

			scale = Math.max(1, Math.min(newScale, 5));

			const rect = processedCanvas.getBoundingClientRect();
			const touchCenterX = (event.touches[0].clientX + event.touches[1].clientX) / 2 - rect.left;
			const touchCenterY = (event.touches[0].clientY + event.touches[1].clientY) / 2 - rect.top;

			pan.x = touchCenterX - (touchCenterX - pan.x) * (scale / oldScale);
			pan.y = touchCenterY - (touchCenterY - pan.y) * (scale / oldScale);

			drawCanvas();
		} else if (isPanning && event.touches.length === 1) {
			const dx = event.touches[0].clientX - lastPanPosition.x;
			const dy = event.touches[0].clientY - lastPanPosition.y;
			lastPanPosition = { x: event.touches[0].clientX, y: event.touches[0].clientY };

			pan.x += dx;
			pan.y += dy;
			drawCanvas();
		}
	}

	function handleTouchEnd(event: TouchEvent) {
		if (event.touches.length < 2) {
			isPinching = false;
		}
		if (event.touches.length < 1) {
			isPanning = false;
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} on:mouseup={handleMouseUp} on:mousemove={handleMouseMove} />

<div class="flex flex-col items-center gap-4">


	{#if isLoading}
		<div class="flex items-center justify-center">
			<div class="h-32 w-32 animate-spin rounded-full border-t-2 border-b-2 border-[#a4036f]"></div>
		</div>
	{/if}

	{#if isProcessed && !isLoading}
		<div class:invisible={showOriginal}>
			<PostProcessSettings />
		</div>
	{/if}

	<div class="w-full max-w-3xl">
		{#if !isProcessed && imageUrl}
			<img src={imageUrl} alt="Uploaded" class="w-full rounded border shadow" />
		{/if}
		
		<canvas
			bind:this={processedCanvas}
			class="w-full rounded border shadow"
			class:hidden={!isProcessed || isLoading}
			on:click={handleCanvasClick}
			on:wheel={handleWheel}
			on:mousedown={handleMouseDown}
			on:touchstart={handleTouchStart}
			on:touchmove={handleTouchMove}
			on:touchend={handleTouchEnd}
		></canvas>
	</div>

	{#if isProcessed && !isLoading}
		<div class="flex w-full max-w-3xl items-center justify-between">
			<p class="text-sm text-gray-700">
				{#if !showOriginal}
					{gridInfo}
				{:else}
					Alkuperäinen kuva
				{/if}
			</p>

			<div class="flex gap-2">
				<button
					on:click={handleResetView}
					class="rounded-full bg-gray-200 p-2 text-gray-700 hover:bg-gray-300"
					class:opacity-50={showOriginal || (scale === 1 && pan.x === 0 && pan.y === 0)}
					disabled={showOriginal || (scale === 1 && pan.x === 0 && pan.y === 0)}
					aria-label="Reset view"
					title="Reset view"
				>
					<ResetIcon />
				</button>
				<button
					on:click={() => (showOriginal = !showOriginal)}
					class="rounded-full bg-gray-200 p-2 text-gray-700 hover:bg-gray-300"
					aria-label={showOriginal ? 'Show grid' : 'Show original'}
					title={showOriginal ? 'Show grid' : 'Show original'}
				>
					{#if showOriginal}
						<GridIcon />
					{:else}
						<EyeIcon />
					{/if}
				</button>
			</div>
		</div>
	{/if}

	<ColorPicker
		show={showColorPicker}
		position={colorPickerPos}
		colors={Array.from(colorCounts.keys())}
		{colorToIdentifier}
		symbolType={$symbolType}
		on:select={changeColor}
		on:close={() => {
			showColorPicker = false;
			selectedPixel = null;
			drawCanvas();
		}}
	/>

	<ColorPalette
		{colorCounts}
		{colorToIdentifier}
		symbolType={$symbolType}
		on:save={save}
	/>
	<SaveConfirmationModal
		isOpen={isSaveModalOpen}
		onConfirm={confirmSave}
		onClose={() => (isSaveModalOpen = false)}
	/>
	<canvas bind:this={originalCanvas} class="hidden"></canvas>
</div>
