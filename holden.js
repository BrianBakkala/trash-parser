
const pdf = require('pdf-parse');

module.exports = {
    display: async function ()
    {
        const day_of_week = await getPDFfromURL("https://www.holdenma.gov/sites/g/files/vyhlif4526/f/uploads/trash_collection_by_street_020420.pdf",

            function (data)
            {
                const textLines = data.text.split("\n");

                return data.text.match(/Hayfield La?ne?\s*(M|T|W|Th|F)/)[1];

                return {

                    potential_match: data.text.match(/Hayfield La?ne?\s*(M|T|W|Th|F)/)[1],
                    pdf_text: data.text,
                    pdf_text_lines: textLines,

                };
            }
        );
        const data = await getPDFfromURL("https://www.holdenma.gov/sites/g/files/vyhlif4526/f/uploads/2024.pdf",

            function (data)
            {
                const textLines = data.text.replace("272929", "272829").split("      ")[0].trim().split("\n");

                return textLines;
            }
        );

        return { day_of_week, data };
    }
};


async function getPDFfromURL(url, callback)
{

    const response = await fetch(url);
    const pdfBytes = await response.arrayBuffer();

    return pdf(pdfBytes).then(function (data)
    {
        return callback(data);
    });
}

function getMonths()
{

}