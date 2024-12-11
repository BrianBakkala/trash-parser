import * as parsing from './parsing.mjs';
import * as util from './utility.mjs';

/**
 * displays the relevant data for trash
 *
 * @param {String} [dowLetter=null] day of the week letter [M,T,W,Th,F]
 * @return {obj} trash data
 */
export async function display(dowLetter = null)
{
    if (dowLetter == null)
    {
        const streetNameRegex = RegExp(process.env.STREET_NAME_REGEX);
        const streetNameRegexGroup = process.env.STREET_NAME_REGEX_DAY_GROUP;

        dowLetter = await util.getPDFfromURL(process.env.STREET_PDF_URL,

            function (items, table)
            {
                let desiredY = null;
                for (let yValue of Object.keys(table))
                {
                    if (streetNameRegex.test(table[yValue].join(" ")))
                    {
                        desiredY = yValue;
                        break;
                    }
                }

                if (!desiredY)
                {
                    console.error("Couldn't find street.");
                }

                const returnable = table[desiredY].join(" ").match(streetNameRegex)[streetNameRegexGroup];

                return returnable;

                // return {
                //     potential_match: table[desiredY].join(" ").match(streetNameRegex)[streetNameRegexGroup],
                //     pdf_text: data.text,
                // };
            }
        );
    };

    const DOW_MAP = { Su: 0, M: 1, T: 2, W: 3, Th: 4, F: 5, Sa: 6 }; ///0-based from JS Date.getDay()
    const dayOfWeekData = { day_of_week: dowLetter, day_of_week_number: DOW_MAP[dowLetter] };

    const calendarData = await util.getPDFfromURL(process.env.SCHEDULE_PDF_URL,

        function (items, table)
        {
            return {
                ...parsing.getTrashRecyclingDays(table,
                    dayOfWeekData.day_of_week_number,
                    "biweekly second",
                    parsing.getLikelyYear(table))
            };
        }
    );

    return { ...dayOfWeekData, ...calendarData };
}

export async function display_simple(dowLetter = null)
{
    const obj = await this.display(dowLetter);
    return obj.simple;
}

export async function display_test(trashBool = "true", recyclingBool = "true")
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
