import ExcelJS from 'exceljs';
import { hexToRgb, getBrightness, rgbToHex } from '$lib/utils/helperFunctions';
import type { RGB } from '$lib/utils/helperFunctions';

type SymbolType = 'kirjaimet' | 'numerot' | 'koodi' | 'ei mitään';

interface ExcelGeneratorOptions {
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
	aspectRatio: string;
}

export async function generateExcel(options: ExcelGeneratorOptions): Promise<void> {
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
		aspectRatio
	} = options;

	if (!canvas?.width) {
		alert('No processed image!');
		return;
	}

	const workbook = new ExcelJS.Workbook();
	
	// --- Sheet 1: Info & Legend ---
	const infoSheet = workbook.addWorksheet('Tiedot');

	// Title
	infoSheet.mergeCells('A1:E1');
	const titleCell = infoSheet.getCell('A1');
	titleCell.value = 'Ryijykaavio';
	titleCell.font = { size: 20, bold: true };
	titleCell.alignment = { horizontal: 'center' };

	// Grid Info
	infoSheet.getCell('A3').value = `Ruudukko: ${gridInfo}`;
	
	const [gridCols, gridRows] = gridInfo.split(' × ').map((s) => parseInt(s.replace(' ruutua', '')));
	if (!isNaN(gridCols) && !isNaN(gridRows)) {
		const totalWidth = gridCols * tuftWidth;
		const totalHeight = gridRows * tuftHeight;
		infoSheet.getCell('A4').value = `Fyysinen koko: ${totalWidth.toFixed(1)} cm × ${totalHeight.toFixed(1)} cm`;
	}

	// Color Info Header
	let currentRow = 6;
	infoSheet.getCell(`A${currentRow}`).value = 'Käytetyt värit:';
	infoSheet.getCell(`A${currentRow}`).font = { size: 14, bold: true };
	currentRow += 2;

	const threadLengthPerKnotCm = (tuftWidth + 2 * tuftHeight) * threadsPerKnot;
	const wastageFactor = 1 + wastage / 100;

	// Headers for color table
	infoSheet.getCell(`A${currentRow}`).value = 'Väri';
	infoSheet.getCell(`B${currentRow}`).value = 'Tunniste';
	infoSheet.getCell(`C${currentRow}`).value = 'Koodi';
	infoSheet.getCell(`D${currentRow}`).value = 'Määrä (kpl)';
	infoSheet.getCell(`E${currentRow}`).value = 'Langan pituus (m)';
	
	infoSheet.getRow(currentRow).font = { bold: true };
	currentRow++;

	for (const [hex, count] of colorCounts.entries()) {
		const totalLengthM = (threadLengthPerKnotCm * count) / 100;
		const lengthWithWastage = totalLengthM * wastageFactor;

		// Color Swatch
		const cell = infoSheet.getCell(`A${currentRow}`);
		cell.fill = {
			type: 'pattern',
			pattern: 'solid',
			fgColor: { argb: 'FF' + hex.substring(1) }
		};

		// Identifier
		const identifier = symbolType !== 'ei mitään' ? (colorToIdentifier.get(hex) || '') : '-';
		infoSheet.getCell(`B${currentRow}`).value = identifier;

		// Hex Code
		infoSheet.getCell(`C${currentRow}`).value = hex;

		// Count
		infoSheet.getCell(`D${currentRow}`).value = count;

		// Length
		infoSheet.getCell(`E${currentRow}`).value = parseFloat(lengthWithWastage.toFixed(1));

		currentRow++;
	}

	currentRow += 2;

	// Totals
	const totalKnots = Array.from(colorCounts.values()).reduce((sum, count) => sum + count, 0);
	const totalThreadLengthM = (threadLengthPerKnotCm * totalKnots) / 100;
	const totalLengthWithWastage = totalThreadLengthM * wastageFactor;

	infoSheet.getCell(`A${currentRow}`).value = 'Yhteensä:';
	infoSheet.getCell(`A${currentRow}`).font = { size: 14, bold: true };
	currentRow++;

	infoSheet.getCell(`A${currentRow}`).value = `Nukkia: ${totalKnots}`;
	currentRow++;
	infoSheet.getCell(`A${currentRow}`).value = `Lankojen kokonaispituus (${wastage}% hävikillä): ${totalLengthWithWastage.toFixed(1)} m`;
	currentRow++;
	infoSheet.getCell(`A${currentRow}`).value = `Lankojen määrä per nukka: ${threadsPerKnot}`;

	infoSheet.getColumn('A').width = 15;
	infoSheet.getColumn('B').width = 15;
	infoSheet.getColumn('C').width = 15;
	infoSheet.getColumn('D').width = 15;
	infoSheet.getColumn('E').width = 20;

	// --- Sheet 2: Grid Chart ---
	const gridSheet = workbook.addWorksheet('Kaavio');

	// Calculate cell dimensions based on aspect ratio
	// Default column width of 1 is approx 7 pixels. Default row height is 15 points (20 pixels).
	// We want to approximate the aspect ratio.
	// Let's set a base width, say 4 characters (~30 pixels).
	const [widthRatio, heightRatio] = aspectRatio.split(':').map(Number);
	
	// Excel column width is roughly number of characters. 1 unit ~ 7px.
	// Excel row height is in points. 1 point = 1.33px.
	
	// Let's try to make them proportional.
	// If 1:1, we want square cells.
	// If 1:2, height is 2x width.
	
	const baseColWidth = 4; // ~30-35px
	const baseRowHeight = 25; // ~33px
	
	// Adjust based on aspect ratio
	// If ratio is W:H
	// Width factor = 1
	// Height factor = H/W
	
	const heightFactor = heightRatio / widthRatio;
	
	const colWidth = baseColWidth;
	const rowHeight = baseRowHeight * heightFactor;

	// Set default sizes for the sheet
	// Note: setting defaultRowHeight/defaultColumnWidth might not work as expected in all Excel viewers,
	// so we'll iterate. But for performance, let's try to set columns.
	
	// We need to set column widths for all columns used.
	if (pixelatedData.length > 0) {
		const cols = pixelatedData[0].length;
		for (let c = 0; c < cols; c++) {
			gridSheet.getColumn(c + 1).width = colWidth;
		}
	}

	for (let r = 0; r < pixelatedData.length; r++) {
		const row = gridSheet.getRow(r + 1);
		row.height = rowHeight;
		
		for (let c = 0; c < pixelatedData[r].length; c++) {
			const pixel = pixelatedData[r][c];
			if (pixel) {
				const cell = row.getCell(c + 1);
				const hex = rgbToHex(pixel.r, pixel.g, pixel.b);
				
				cell.fill = {
					type: 'pattern',
					pattern: 'solid',
					fgColor: { argb: 'FF' + hex.substring(1) }
				};

				cell.border = {
					top: { style: 'thin', color: { argb: 'FF000000' } },
					left: { style: 'thin', color: { argb: 'FF000000' } },
					bottom: { style: 'thin', color: { argb: 'FF000000' } },
					right: { style: 'thin', color: { argb: 'FF000000' } }
				};

				if (symbolType !== 'ei mitään') {
					const identifier = colorToIdentifier.get(hex) || '';
					cell.value = identifier;
					cell.alignment = { vertical: 'middle', horizontal: 'center' };
					
					const brightness = getBrightness(pixel.r, pixel.g, pixel.b);
					cell.font = {
						color: { argb: brightness > 128 ? 'FF000000' : 'FFFFFFFF' },
						bold: true
					};
				}
			}
		}
	}

	// Generate buffer and download
	const buffer = await workbook.xlsx.writeBuffer();
	const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
	const url = window.URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = 'ryijykaavio.xlsx';
	a.click();
	window.URL.revokeObjectURL(url);
}
