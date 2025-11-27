import { hexToRgb, getBrightness } from '$lib/utils/helperFunctions';
import type { RGB } from '$lib/utils/helperFunctions';

type SymbolType = 'kirjaimet' | 'numerot' | 'koodi' | 'ei mitään';

interface PngGeneratorOptions {
	canvas: HTMLCanvasElement;
	gridInfo: string;
	colorCounts: Map<string, number>;
	colorToIdentifier: Map<string, string>;
	symbolType: SymbolType;
	threadsPerKnot: number;
	tuftWidth: number;
	tuftHeight: number;
	wastage: number;
	pixelatedData: (RGB | null)[][];
	aspectRatio?: string;
}

export function generatePng(options: PngGeneratorOptions): void {
	const {
		canvas,
		gridInfo,
		colorCounts,
		colorToIdentifier,
		symbolType,
		threadsPerKnot,
		tuftWidth,
		tuftHeight,
		wastage,
		pixelatedData,
		aspectRatio // Add this to destructuring if it's in options, otherwise need to add it to interface
	} = options;

	if (!canvas?.width || !pixelatedData.length) {
		alert('No processed image!');
		return;
	}

	const rows = pixelatedData.length;
	const cols = pixelatedData[0].length;
	
	// Calculate block dimensions based on aspect ratio
	// Default to 1:1 if aspectRatio is missing or invalid
	let widthRatio = 1;
	let heightRatio = 1;
	
	if (options.aspectRatio) {
		const parts = options.aspectRatio.split(':').map(Number);
		if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
			widthRatio = parts[0];
			heightRatio = parts[1];
		}
	}

	// Settings for the output image
	const baseBlockSize = 20; 
	const blockWidth = baseBlockSize;
	const blockHeight = baseBlockSize * (heightRatio / widthRatio);
	
	const margin = 40;
	const legendWidth = 300;
	const headerHeight = 100;
	
	const gridWidth = cols * blockWidth;
	const gridHeight = rows * blockHeight;
	
	const totalWidth = gridWidth + legendWidth + margin * 3;
	const totalHeight = Math.max(gridHeight, 600) + headerHeight + margin * 2;

	const outputCanvas = document.createElement('canvas');
	outputCanvas.width = totalWidth;
	outputCanvas.height = totalHeight;
	const ctx = outputCanvas.getContext('2d');
	
	if (!ctx) return;

	// Fill background
	ctx.fillStyle = 'white';
	ctx.fillRect(0, 0, totalWidth, totalHeight);

	// Draw Header Info
	ctx.fillStyle = 'black';
	ctx.font = 'bold 24px Arial';
	ctx.textAlign = 'left';
	ctx.textBaseline = 'top';
	ctx.fillText('Ryijykaavio', margin, margin);

	ctx.font = '16px Arial';
	ctx.fillText(`Ruudukko: ${gridInfo}`, margin, margin + 40);

	const [gridCols, gridRows] = gridInfo.split(' × ').map((s) => parseInt(s.replace(' ruutua', '')));
	if (!isNaN(gridCols) && !isNaN(gridRows)) {
		const physicalWidth = gridCols * tuftWidth;
		const physicalHeight = gridRows * tuftHeight;
		ctx.fillText(`Fyysinen koko: ${physicalWidth.toFixed(1)} cm × ${physicalHeight.toFixed(1)} cm`, margin, margin + 65);
	}

	// Draw Grid
	const gridStartX = margin;
	const gridStartY = headerHeight + margin;

	// Draw pixels
	for (let r = 0; r < rows; r++) {
		for (let c = 0; c < cols; c++) {
			const color = pixelatedData[r][c];
			if (!color) continue;

			const x = gridStartX + c * blockWidth;
			const y = gridStartY + r * blockHeight;

			ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
			ctx.fillRect(x, y, blockWidth, blockHeight);

			// Draw symbol if needed
			if (symbolType !== 'ei mitään') {
				const hex = '#' + [color.r, color.g, color.b].map(x => x.toString(16).padStart(2, '0')).join('');
				const identifier = colorToIdentifier.get(hex) || '';
				
				const brightness = getBrightness(color.r, color.g, color.b);
				ctx.fillStyle = brightness > 128 ? 'black' : 'white';
				ctx.font = `${Math.min(blockWidth, blockHeight) * 0.6}px Arial`;
				ctx.textAlign = 'center';
				ctx.textBaseline = 'middle';
				ctx.fillText(identifier, x + blockWidth / 2, y + blockHeight / 2);
			}
		}
	}

	// Draw Grid Lines
	ctx.strokeStyle = '#ccc';
	ctx.lineWidth = 1;
	
	// Vertical lines
	for (let c = 0; c <= cols; c++) {
		const x = gridStartX + c * blockWidth;
		ctx.lineWidth = c % 5 === 0 ? 2 : 0.5;
		ctx.strokeStyle = c % 5 === 0 ? '#000' : '#ccc';
		ctx.beginPath();
		ctx.moveTo(x, gridStartY);
		ctx.lineTo(x, gridStartY + gridHeight);
		ctx.stroke();
	}

	// Horizontal lines
	for (let r = 0; r <= rows; r++) {
		const y = gridStartY + r * blockHeight;
		ctx.lineWidth = (rows - r) % 5 === 0 ? 2 : 0.5;
		ctx.strokeStyle = (rows - r) % 5 === 0 ? '#000' : '#ccc';
		ctx.beginPath();
		ctx.moveTo(gridStartX, y);
		ctx.lineTo(gridStartX + gridWidth, y);
		ctx.stroke();
	}

	// Draw Legend
	const legendStartX = gridStartX + gridWidth + margin;
	let legendY = gridStartY;

	ctx.fillStyle = 'black';
	ctx.font = 'bold 16px Arial';
	ctx.textAlign = 'left';
	ctx.textBaseline = 'top';
	ctx.fillText('Käytetyt värit:', legendStartX, legendY);
	legendY += 30;

	const threadLengthPerKnotCm = (tuftWidth + 2 * tuftHeight) * threadsPerKnot;
	const wastageFactor = 1 + wastage / 100;

	ctx.font = '14px Arial';
	for (const [hex, count] of colorCounts.entries()) {
		const totalLengthM = (threadLengthPerKnotCm * count) / 100;
		const lengthWithWastage = totalLengthM * wastageFactor;

		// Color swatch
		ctx.fillStyle = hex;
		ctx.fillRect(legendStartX, legendY, 20, 20);
		ctx.strokeStyle = '#000';
		ctx.lineWidth = 1;
		ctx.strokeRect(legendStartX, legendY, 20, 20);

		// Text info
		ctx.fillStyle = 'black';
		const identifier = symbolType !== 'ei mitään' ? `(${colorToIdentifier.get(hex) || ''}) ` : '';
		ctx.fillText(
			`${identifier}${hex} - ${count} kpl (${lengthWithWastage.toFixed(1)} m)`,
			legendStartX + 30,
			legendY + 2
		);
		
		legendY += 25;
	}

	legendY += 20;
	ctx.font = 'bold 16px Arial';
	ctx.fillText('Yhteensä:', legendStartX, legendY);
	legendY += 25;

	const totalKnots = Array.from(colorCounts.values()).reduce((sum, count) => sum + count, 0);
	const totalThreadLengthM = (threadLengthPerKnotCm * totalKnots) / 100;
	const totalLengthWithWastage = totalThreadLengthM * wastageFactor;

	ctx.font = '14px Arial';
	ctx.fillText(`Nukkia: ${totalKnots}`, legendStartX, legendY);
	legendY += 20;
	ctx.fillText(`Lankaa (${wastage}% hävikki): ${totalLengthWithWastage.toFixed(1)} m`, legendStartX, legendY);
	legendY += 20;
	ctx.fillText(`Lankaa / nukka: ${threadsPerKnot}`, legendStartX, legendY);


	// Download
	const url = outputCanvas.toDataURL('image/png');
	const a = document.createElement('a');
	a.href = url;
	a.download = 'ryijykaavio.png';
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
}
