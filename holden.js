
const pdf = require('pdf-parse');
const parsing = require('./parsing');

module.exports = {
    display: async function (dowLetter = null)
    {
        if (dowLetter == null)
        {
            dowLetter = await getPDFfromURL("https://www.holdenma.gov/sites/g/files/vyhlif4526/f/uploads/trash_collection_by_street_020420.pdf",

                function (data)
                {
                    return data.text.match(/Hayfield La?ne?\s*(M|T|W|Th|F)/)[1];

                    return {
                        potential_match: data.text.match(/Hayfield La?ne?\s*(M|T|W|Th|F)/)[1],
                        pdf_text: data.text,
                    };
                }
            );
        }

        const dowMap = { M: 1, T: 2, W: 3, Th: 4, F: 5 }; ///0-based from JS Date.getDay()
        const dayOfWeekData = { day_of_week: dowLetter, day_of_week_number: dowMap[dowLetter] };

        const calendarData = await getPDFfromURL("https://www.holdenma.gov/sites/g/files/vyhlif4526/f/uploads/2024.pdf",

            function (data)
            {
                const cleanedUpText = data.text
                    .replace("272929", "272829")
                    .replace("12345121\n2\n34567", "12345121234567")
                    .replace("12\n3T56", "123T56");

                const delim = "      ";
                const calendarLines = cleanedUpText
                    .split(delim)[0].trim().split("\n");
                const restOfText = cleanedUpText
                    .split(delim).slice(1).join(delim);

                // return calendarLines;

                // return { restOfText };
                // return parsing.getLikelyYear(restOfText);

                return { ...parsing.getTrashDays(calendarLines, dayOfWeekData.day_of_week_number, parsing.getLikelyYear(restOfText)) };
            }
        );

        return { ...dayOfWeekData, ...calendarData };
    },

    display_simple: async function (dowLetter = null)
    {
        const obj = await this.display(dowLetter);
        return obj.simple;
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
