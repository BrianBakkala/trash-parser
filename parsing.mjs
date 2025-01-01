// const static_lines = [["2025 hometown Trash/Recycling Calendar"], ["January", "February", "March"], ["S", "M", "T", "W", "T", "F", "S", "S", "M", "T", "W", "T", "F", "S", "S", "M", "T", "W", "T", "F", "S"], ["T", "2", "3", "4", "5", "6", "1", "2", "3", "1", "2"], ["7", "8", "9", "10", "11", "12", "13", "4", "5", "6", "7", "8", "9", "10", "3", "4", "5", "6", "7", "8", "9"], ["14", "15", "16", "17", "18", "19", "20", "11", "12", "13", "14", "15", "16", "17", "10", "11", "12", "13", "14", "15", "16"], ["21", "22", "23", "24", "25", "26", "27", "18", "19", "20", "21", "22", "23", "24", "17", "18", "19", "20", "21", "22", "23"], ["28", "29", "30", "31", "25", "26", "27", "28", "29", "24", "25", "26", "27", "28", "29", "30"], ["31"], ["April", "May", "June"], ["S", "M", "T", "W", "T", "F", "S", "S", "M", "T", "W", "T", "F", "S", "S", "M", "T", "W", "T", "F", "S"], ["1", "2", "3", "4", "5", "6", "1", "2", "3", "4", "1"], ["7", "8", "9", "10", "11", "12", "13", "5", "6", "7", "8", "9", "10", "11", "2", "3", "4", "5", "6", "7", "8"],
// ["14", "15", "16", "17", "18", "19", "20", "12", "13", "14", "15", "16", "17", "18", "9", "10", "11", "12", "13", "14", "15"], ["21", "22", "23", "24", "25", "26", "27", "19", "20", "21", "22", "23", "24", "25", "16", "17", "18", "19", "20", "21", "22"], ["28", "29", "30", "26", "T", "28", "29", "30", "31", "23", "24", "25", "26", "27", "28", "29"], ["30"], ["July", "August", "September"], ["S", "M", "T", "W", "T", "F", "S", "S", "M", "T", "W", "T", "F", "S", "S", "M", "T", "W", "T", "F", "S"], ["1", "2"], ["3", "T", "5", "6", "1", "2", "3", "1", "T", "3", "4", "5", "6", "7"], ["7", "8", "9", "10", "11", "12", "13", "4", "5", "6", "7", "8", "9", "10", "8", "9", "10", "11", "12", "13", "14"], ["14", "15", "16", "17", "18", "19", "20", "11", "12", "13", "14", "15", "16", "17", "15", "16", "17", "18", "19", "20", "21"], ["21", "22", "23", "24", "25", "26", "27", "18", "19", "20", "21", "22", "23", "24", "22", "23", "24", "25", "26", "27", "28"], ["28", "29", "30", "31", "25", "26", "27", "28", "29", "30", "31", "29", "30"], ["October", "November", "December"], ["S", "M", "T", "W", "T", "F", "S", "S", "M", "T", "W", "T", "F", "S", "S", "M", "T", "W", "T", "F", "S"], ["1", "2", "3", "4", "5", "1", "2", "1", "2", "3", "4", "5", "6", "7"], ["6", "7", "8", "9", "10", "11", "12", "3", "4", "5", "6", "7", "8", "9", "8", "9", "10", "11", "12", "13", "14"], ["13", "14", "15", "16", "17", "18", "19", "10", "11", "12", "13", "14", "15", "16", "15", "16", "17", "18", "19", "20", "21"], ["20", "21", "22", "23", "24", "25", "26", "17", "18", "19", "20", "21", "22", "23", "22", "23", "24", "T", "26", "27", "28"], ["27", "29", "29", "30", "31", "24", "25", "26", "27", "T", "29", "30", "29", "30", "31"], ["RECYCLING WEEKS ARE SHOWN IN GREEN"], ["All trash/recycling pickups will be moved forward ONE day due to the holiday. "]  


/**
 *
 *
 * @param {array} lines string arrays of each line of the PDF
 * @param {number} dayOfWeekIndex trash day 0-6
 * @param {number} [year=2025]
 * @return {obj} data representing the trash and recycling days 
 */
export function getHometownTrashRecyclingDays(lines, dayOfWeekIndex, recycleScheme = "biweekly second", year = 2025)
{
    const holidays = getHolidays(lines);

    let trashDays = [];
    let recyclingDays = [];

    const d = new Date(year, 0, 1);
    const jan1DOW = d.getDay();
    const firstDOWOffset = (dayOfWeekIndex - jan1DOW + 7) % 7;
    let isRecyclingWeek = (recycleScheme == "biweekly_first");

    for (let i = 0; 1 + firstDOWOffset + i < 367; i += 7)
    {
        const bigOffset = 1 + firstDOWOffset + i;
        const dowDate = new Date(year, 0, bigOffset);

        let dateToPush = dowDate;

        for (let dOffset = 0; dOffset < dowDate.getDay(); dOffset += 1)
        {
            const date = new Date(year, 0, bigOffset - dOffset);
            if (holidays.map(x => x.toDateString()).includes(date.toDateString()))
            {
                dateToPush = new Date(year, 0, bigOffset + 1);
                break;
            }
        }

        trashDays.push(dateToPush);

        if (isRecyclingWeek)
        {
            recyclingDays.push(dateToPush);
        }

        if (recycleScheme.startsWith("biweekly"))
        {
            isRecyclingWeek = !isRecyclingWeek;
        }
    }

    const today = new Date();
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);

    const relevantTrashDays = trashDays.filter(x => x >= yesterday).slice(0, 2);
    const relevantRecyclingDays = recyclingDays.filter(x => x >= yesterday).slice(0, 2);

    const trashObject = {
        today: today.toLocaleDateString('en-CA'),
        tomorrow: tomorrow.toLocaleDateString('en-CA'),
        yesterday: yesterday.toLocaleDateString('en-CA'),

        recycle_scheme: recycleScheme,
        trash_scheme: "weekly",

        holidays: holidays.map(x => x.toLocaleDateString('en-CA')),

        trash_day_curr: relevantTrashDays[0] ?? null,
        trash_day_curr_string: relevantTrashDays[0] ? relevantTrashDays[0].toLocaleDateString('en-CA') : null,
        trash_day_next: relevantTrashDays[1] ? relevantTrashDays[1].toLocaleDateString('en-CA') : null,

        recycling_day_curr: relevantRecyclingDays[0] ?? null,
        recycling_day_curr_string: relevantRecyclingDays[0] ? relevantRecyclingDays[0].toLocaleDateString('en-CA') : null,
        recycling_day_next: relevantRecyclingDays[1] ? relevantRecyclingDays[1].toLocaleDateString('en-CA') : null,

        trash_days: trashDays.map(x => x.toLocaleDateString('en-CA')),
        recycling_days: recyclingDays.map(x => x.toLocaleDateString('en-CA'))
    };

    const simpleObject = {
        trash_simple: (
            (today.toDateString() == trashObject.trash_day_curr.toDateString() && today.getHours() <= 12) ||
            (tomorrow.toDateString() == trashObject.trash_day_curr.toDateString() && today.getHours() >= 12)
        ),
        recycling_simple: (
            (today.toDateString() == trashObject.recycling_day_curr.toDateString() && today.getHours() <= 12) ||
            (tomorrow.toDateString() == trashObject.recycling_day_curr.toDateString() && today.getHours() >= 12)
        ),
        year
    };

    return { ...simpleObject, ...trashObject, simple: simpleObject };
}

/**
 * Takes a 
 *
 * @param {array} lines string arrays of each line of the PDF
 * @param {number} [year=2025] year to look for
 * @return {array} array of dates, representing the holidays 
 */
function getHolidays(lines, year = 2025)
{
    const months = getMonths(lines);

    // console.log(months);
    let holidays = [];

    for (let monthIndex in months)
    {
        const month = months[monthIndex];

        for (let dayIndex in month)
        {
            const day = month[dayIndex];

            if (!+day && day == "T")
            {
                holidays.push(new Date(year, +monthIndex, (+(dayIndex) + 1)));
            }
        }
    }

    return holidays;
}

/**
 * Scans a String and returns the most frequently occurring year in the text. The function starts with last year, and scans forward 10 years.
 *
 * @param {String} text
 * @return {int} most commonly occuring year in the text
 */
export function getLikelyYear(lines)
{
    const filteredLines = lines.filter(x => determineLineNature(x) == 'unknown');
    const text = filteredLines.join(" ");

    const now = new Date();
    const thisYear = now.getFullYear();
    let highestCount = 0;
    let mostFreqYear = thisYear;

    for (let y = -1; y < 10; y += 1)
    {
        const year = thisYear + y;

        let count = (text.match(RegExp(year, 'g')) || []).length;

        if (count > highestCount)
        {
            highestCount = count;
            mostFreqYear = year;
        }

    }

    return +mostFreqYear;
}

/**
 * Parses the hometown Trash PDF as a table containing 12 months
 *
 * @param {array} linesArray string arrays of each line of the PDF
 * @return {array} array of json representations of each month
 */
function getMonths(linesArray)
{
    const NUM_MONTH_COLUMNS = 3;

    let result = {};
    let bigRowCounter = -1;

    for (let lineIndex = 0; lineIndex < linesArray.length; lineIndex++)
    {
        const line = linesArray[lineIndex].filter(x => x);
        const nature = determineLineNature(line);

        if (nature == "title" || nature == "day_headers")
        {
            continue;
        }
        else if (nature == "month_headers")
        {
            bigRowCounter += 1;
        }
        else if (nature == "dates")
        {
            let rowMonthIndex = 0;
            let weekCount = 0;


            for (let dateIndex in line)
            {
                const prevDate = line[+dateIndex - 1] ? line[+dateIndex - 1] : null;
                const dateNum = line[dateIndex];
                const nextDate = line[+dateIndex + 1] ? line[+dateIndex + 1] : null;

                let modifiedDateNum = dateNum;

                if (dateNum == "T")
                {
                    modifiedDateNum = +nextDate - 1;

                }


                const offset = bigRowCounter * NUM_MONTH_COLUMNS;

                const possibleMonth = result[offset + rowMonthIndex];

                if (possibleMonth)
                {
                    const lastDay = possibleMonth[possibleMonth.length - 1] ?? 0;
                    if (lastDay != "T" && (+lastDay >= modifiedDateNum || +lastDay + 1 != modifiedDateNum))
                    {
                        rowMonthIndex++;
                        dateIndex--; //try the next month                 
                    }

                }

                result[offset + rowMonthIndex] = result[offset + rowMonthIndex] ?? [];
                result[offset + rowMonthIndex].push(dateNum);

                if (+nextDate <= +modifiedDateNum)
                {
                    weekCount = 0;
                    rowMonthIndex += 1;
                }
                else
                {
                    weekCount += 1;
                }

            }


        }
    }

    return result;

}

//month_headers, day_headers, dates, title, unknown

function determineLineNature(line)
{
    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    const dayAbbrevs = ["S", "M", "T", "W", "T", "F", "S"];
    const dates = ["T", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10",
        "11", "12", "13", "14", "15", "16", "17", "18", "19", "20",
        "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31"];

    // Check if every element in the array is a valid month name
    if (line.every(item => monthNames.includes(item)))
    {
        return "month_headers";
    }
    else if (line.every(item => dayAbbrevs.includes(item)))
    {
        return "day_headers";
    }
    else if (line.every(item => dates.includes(item)))
    {
        return "dates";
    }
    else if (line[0].includes("Trash") && line[0].includes("Calendar"))
    {
        return "title";
    }

    return "unknown";

}