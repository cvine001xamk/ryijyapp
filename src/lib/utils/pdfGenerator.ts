import { jsPDF } from 'jspdf';
import { hexToRgb } from '$lib/utils/helperFunctions';

type SymbolType = 'kirjaimet' | 'numerot' | 'koodi' | 'ei mitään';

interface PdfGeneratorOptions {
	canvas: HTMLCanvasElement;
	gridInfo: string;
	colorCounts: Map<string, number>;
	colorToIdentifier: Map<string, string>;
	symbolType: SymbolType;
	threadsPerKnot: number;
	tuftWidth: number;
	tuftHeight: number;
	wastage: number;
}

export function generatePdf(options: PdfGeneratorOptions): void {
	const {
		canvas,
		gridInfo,
		colorCounts,
		colorToIdentifier,
		symbolType,
		threadsPerKnot,
		tuftWidth,
		tuftHeight,
		wastage
	} = options;

	if (!canvas?.width) {
		alert('No processed image!');
		return;
	}

	const pdf = new jsPDF();
	const pageWidth = pdf.internal.pageSize.getWidth();
	const pageHeight = pdf.internal.pageSize.getHeight();
	const bottomMargin = 20;

	const checkPageBreak = (y: number, lineHeight: number) => {
		if (y + lineHeight > pageHeight - bottomMargin) {
			pdf.addPage();
			return bottomMargin;
		}
		return y;
	};

	// Add title
	pdf.setFontSize(20);
	pdf.text('Ryijykaavio', pageWidth / 2, 15, { align: 'center' });

	// Add grid size info
	pdf.setFontSize(12);
	pdf.text(`Ruudukko: ${gridInfo}`, 20, 25);

	const [gridCols, gridRows] = gridInfo.split(' × ').map((s) => parseInt(s.replace(' ruutua', '')));
	if (!isNaN(gridCols) && !isNaN(gridRows)) {
		const totalWidth = gridCols * tuftWidth;
		const totalHeight = gridRows * tuftHeight;
		pdf.text(`Fyysinen koko: ${totalWidth.toFixed(1)} cm × ${totalHeight.toFixed(1)} cm`, 20, 32);
	}

	// Add processed image
	const imgData = canvas.toDataURL('image/png');
	const imgWidth = Math.min(pageWidth - 40, 170); // Max width with margins
	const imgHeight = (canvas.height * imgWidth) / canvas.width;
	pdf.addImage(imgData, 'PNG', 20, 42, imgWidth, imgHeight);

	// Add color information
	let yPosition = imgHeight + 57;
	yPosition = checkPageBreak(yPosition, 10);
	pdf.setFontSize(14);
	pdf.text('Käytetyt värit:', 20, yPosition);
	yPosition += 10;

	const threadLengthPerKnotCm = (tuftWidth + 2 * tuftHeight) * threadsPerKnot;
	const wastageFactor = 1 + wastage / 100;

	// Add color swatches and information
	pdf.setFontSize(12);
	for (const [hex, count] of colorCounts.entries()) {
		yPosition = checkPageBreak(yPosition, 15);

		const totalLengthM = (threadLengthPerKnotCm * count) / 100;
		const lengthWithWastage = totalLengthM * wastageFactor;

		// Draw color rectangle
		const rgb = hexToRgb(hex);
		if (rgb) {
			pdf.setFillColor(rgb.r, rgb.g, rgb.b);
			pdf.rect(20, yPosition - 5, 10, 10, 'F');
		}

		// Add color information with thread calculations
		const identifier = symbolType !== 'ei mitään' ? `(${colorToIdentifier.get(hex) || ''}) ` : '';
		pdf.text(
			`${identifier}${hex} - ${count} ruutua - ${lengthWithWastage.toFixed(1)} m`,
			35,
			yPosition
		);
		yPosition += 15;
	}

	// Calculate and add total threads needed
	const totalKnots = Array.from(colorCounts.values()).reduce((sum, count) => sum + count, 0);
	const totalThreadLengthM = (threadLengthPerKnotCm * totalKnots) / 100;
	const totalLengthWithWastage = totalThreadLengthM * wastageFactor;

	yPosition += 10;
	yPosition = checkPageBreak(yPosition, 10);
	pdf.setFontSize(14);
	pdf.text('Yhteensä:', 20, yPosition);
	yPosition += 10;

	yPosition = checkPageBreak(yPosition, 8);
	pdf.setFontSize(12);
	pdf.text(`Nukkia: ${totalKnots}`, 20, yPosition);
	yPosition += 8;

	yPosition = checkPageBreak(yPosition, 8);
	pdf.text(
		`Lankojen kokonaispituus (${wastage}% hävikillä): ${totalLengthWithWastage.toFixed(1)} m`,
		20,
		yPosition
	);
	yPosition += 8;

	yPosition = checkPageBreak(yPosition, 8);
	pdf.text(`Lankojen määrä per nukka: ${threadsPerKnot}`, 20, yPosition);

	// Save the PDF
	pdf.save('ryijykaavio.pdf');
}
