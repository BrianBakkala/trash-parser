import { PDFDocument } from 'pdf-lib';

export async function message()
{
	const pdf = await getPDF();
	return { message: "Hello, Holden!", pdf };
}


async function getPDF()
{
	// The URL of the PDF file (you could also extract this from the request)
	const pdfUrl = 'https://www.holdenma.gov/sites/g/files/vyhlif4526/f/uploads/trash_collection_by_street_020420.pdf';

	try
	{
		// Fetch the PDF file from an external source (e.g., a URL)
		const response = await fetch(pdfUrl);
		const pdfBytes = await response.arrayBuffer();

		// Load the PDF document using pdf-lib
		const pdfDoc = await PDFDocument.load(pdfBytes);

		// Extract text from each page (note: this is basic text extraction)
		let textContent = '';
		const pages = pdfDoc.getPages();
		for (const page of pages)
		{
			const text = page.getTextContent();
			textContent += text.items.map(item => item.str).join(' ') + '\n';
		}

		console.log(pdfDoc);

		// Return the text content as a plain-text response
		return textContent;

	} catch (error)
	{
		return new Response(`Error processing PDF: ${error.message}`, {
			headers: { 'Content-Type': 'text/plain' },
		});
	}

}
