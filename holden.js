
const pdf = require('pdf-parse');
const parsing = require('./parsing');

module.exports = {
    /**
     * displays the relevant data for trash
     *
     * @param {String} [dowLetter=null] day of the week letter [M,T,W,Th,F]
     * @return {obj} trash data
     */
    display: async function (dowLetter = null)
    {
        if (dowLetter == null)
        {
            dowLetter = await getPDFfromURL("https://www.holdenma.gov/sites/g/files/vyhlif4526/f/uploads/trash_collection_by_street_020420.pdf",

                function (data)
                {
                    return data.text.match(/Hayfield (Lane|Ln\.?)\s*(M|T|W|Th|F)/)[2];

                    return {
                        potential_match: data.text.match(/Hayfield La?ne?\s*(M|T|W|Th|F)/)[2],
                        pdf_text: data.text,
                    };
                }
            );
        }

        const DOW_MAP = { Su: 0, M: 1, T: 2, W: 3, Th: 4, F: 5, Sa: 6 }; ///0-based from JS Date.getDay()
        const dayOfWeekData = { day_of_week: dowLetter, day_of_week_number: DOW_MAP[dowLetter] };

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
    },

    display_test: async function (trashBool = "true", recyclingBool = "true")
    {
        const now = new Date();
        const year = now.getFullYear();

        trashBool = JSON.parse(trashBool);
        recyclingBool = JSON.parse(recyclingBool);

        return {
            trash_simple: trashBool,
            recycling_simple: recyclingBool,
            year
        };
    }
};

/**
 *
 *
 * @param {String} url  of the pdf
 * @param {function} callback
 * @return {function} the result of the callback 
 */
async function getPDFfromURL(url, callback)
{

    const response = await fetch(url);
    const pdfBytes = await response.arrayBuffer();

    return pdf(pdfBytes).then(function (data)
    {
        return callback(data);
    });
}
