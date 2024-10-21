import pdfjsDist from 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.7.76/+esm';


export async function message()
{
	const pdf = await getPDF();
	return { message: "Hello, Holden!", pdf };
}



async function getPDF() {
	const response = await fetch("https://www.holdenma.gov/sites/g/files/vyhlif4526/f/uploads/trash_collection_by_street_020420.pdf");

	if (!response.ok) {
	  console.log(response);
	  throw new Error('Network response was not ok');
	}

	const pdfBytes = await response.arrayBuffer();
	const pdfDoc = await PDFDocument.load(pdfBytes);

	// Get the number of pages
	const numPages = pdfDoc.getPageCount();

	// Extract text from each page (if needed)
	const textPromises = [];
	for (let i = 0; i < numPages; i++) {
	  const page = pdfDoc.getPage(i);
	  const { text } = await page.getTextContent(); // Note: Adjusted for correct usage
	  textPromises.push(text);
	}

	const pdfText = textPromises.join('\n');

	return {
	  numberOfPages: numPages,
	  text: pdfText,
	};
  }
