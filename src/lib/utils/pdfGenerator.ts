import { jsPDF } from 'jspdf';
import { hexToRgb } from '$lib/utils/helperFunctions';

const THREAD_LENGTH_PER_KNOT = 24; // cm per knot
const THREADS_PER_KNOT = 4; // number of threads per knot

type DisplayMode = 'color' | 'number' | 'letter' | 'code';

interface PdfGeneratorOptions {
	canvas: HTMLCanvasElement;
	gridInfo: string;
	colorCounts: Map<string, number>;
	colorToIdentifier: Map<string, string>;
	displayMode: DisplayMode;
}

export function generatePdf(options: PdfGeneratorOptions): void {
	const { canvas, gridInfo, colorCounts, colorToIdentifier, displayMode } = options;

	if (!canvas?.width) {
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
	const imgData = canvas.toDataURL('image/png');
	const imgWidth = Math.min(pageWidth - 40, 170); // Max width with margins
	const imgHeight = (canvas.height * imgWidth) / canvas.width;
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
