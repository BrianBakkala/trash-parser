// const static_lines = [["2024 hometown Trash/Recycling Calendar"], ["January", "February", "March"], ["S", "M", "T", "W", "T", "F", "S", "S", "M", "T", "W", "T", "F", "S", "S", "M", "T", "W", "T", "F", "S"], ["T", "2", "3", "4", "5", "6", "1", "2", "3", "1", "2"], ["7", "8", "9", "10", "11", "12", "13", "4", "5", "6", "7", "8", "9", "10", "3", "4", "5", "6", "7", "8", "9"], ["14", "15", "16", "17", "18", "19", "20", "11", "12", "13", "14", "15", "16", "17", "10", "11", "12", "13", "14", "15", "16"], ["21", "22", "23", "24", "25", "26", "27", "18", "19", "20", "21", "22", "23", "24", "17", "18", "19", "20", "21", "22", "23"], ["28", "29", "30", "31", "25", "26", "27", "28", "29", "24", "25", "26", "27", "28", "29", "30"], ["31"], ["April", "May", "June"], ["S", "M", "T", "W", "T", "F", "S", "S", "M", "T", "W", "T", "F", "S", "S", "M", "T", "W", "T", "F", "S"], ["1", "2", "3", "4", "5", "6", "1", "2", "3", "4", "1"], ["7", "8", "9", "10", "11", "12", "13", "5", "6", "7", "8", "9", "10", "11", "2", "3", "4", "5", "6", "7", "8"],
// ["14", "15", "16", "17", "18", "19", "20", "12", "13", "14", "15", "16", "17", "18", "9", "10", "11", "12", "13", "14", "15"], ["21", "22", "23", "24", "25", "26", "27", "19", "20", "21", "22", "23", "24", "25", "16", "17", "18", "19", "20", "21", "22"], ["28", "29", "30", "26", "T", "28", "29", "30", "31", "23", "24", "25", "26", "27", "28", "29"], ["30"], ["July", "August", "September"], ["S", "M", "T", "W", "T", "F", "S", "S", "M", "T", "W", "T", "F", "S", "S", "M", "T", "W", "T", "F", "S"], ["1", "2"], ["3", "T", "5", "6", "1", "2", "3", "1", "T", "3", "4", "5", "6", "7"], ["7", "8", "9", "10", "11", "12", "13", "4", "5", "6", "7", "8", "9", "10", "8", "9", "10", "11", "12", "13", "14"], ["14", "15", "16", "17", "18", "19", "20", "11", "12", "13", "14", "15", "16", "17", "15", "16", "17", "18", "19", "20", "21"], ["21", "22", "23", "24", "25", "26", "27", "18", "19", "20", "21", "22", "23", "24", "22", "23", "24", "25", "26", "27", "28"], ["28", "29", "30", "31", "25", "26", "27", "28", "29", "30", "31", "29", "30"], ["October", "November", "December"], ["S", "M", "T", "W", "T", "F", "S", "S", "M", "T", "W", "T", "F", "S", "S", "M", "T", "W", "T", "F", "S"], ["1", "2", "3", "4", "5", "1", "2", "1", "2", "3", "4", "5", "6", "7"], ["6", "7", "8", "9", "10", "11", "12", "3", "4", "5", "6", "7", "8", "9", "8", "9", "10", "11", "12", "13", "14"], ["13", "14", "15", "16", "17", "18", "19", "10", "11", "12", "13", "14", "15", "16", "15", "16", "17", "18", "19", "20", "21"], ["20", "21", "22", "23", "24", "25", "26", "17", "18", "19", "20", "21", "22", "23", "22", "23", "24", "T", "26", "27", "28"], ["27", "29", "29", "30", "31", "24", "25", "26", "27", "T", "29", "30", "29", "30", "31"], ["RECYCLING WEEKS ARE SHOWN IN GREEN"], ["All trash/recycling pickups will be moved forward ONE day due to the holiday. "]  


/**
 *
 *
 * @param {array} lines string arrays of each line of the PDF
 * @param {number} dayOfWeekIndex trash day 0-6
 * @param {number} [year=2024]
 * @return {obj} data representing the trash and recycling days 
 */
export function getTrashRecyclingDays(lines, dayOfWeekIndex, recycleScheme = "biweekly second", year = 2024)
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

        holidays: holidays.map(x => x.toDateString()),

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
 * @param {number} [year=2024] year to look for
 * @return {array} array of dates, representing the holidays 
 */
function getHolidays(lines, year = 2024)
{
    const months = getMonths(lines);
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
        const line = linesArray[lineIndex];
        const nature = determineLineNature(line);

        if (nature == "title" || nature == "day_headers")
        {
            continue;
        }
        else if (nature == "month_headers")
        {
            bigRowCounter += 1;

            for (let monthIndex in line)
            {
                result[bigRowCounter * NUM_MONTH_COLUMNS + +monthIndex] = [];
            }

        }
        else if (nature == "dates")
        {
            let rowMonthIndex = 0;
            let weekCount = 0;

            if (line.length == 1)
            {
                for (let i = 0; i < NUM_MONTH_COLUMNS; i += 1)
                {
                    const possibleMonth = result[bigRowCounter * NUM_MONTH_COLUMNS + i];
                    const lastDay = possibleMonth[possibleMonth.length - 1];
                    const unattachedDay = line[0];

                    if (+lastDay + 1 == +unattachedDay)
                    {
                        result[bigRowCounter * NUM_MONTH_COLUMNS + i].push(unattachedDay);
                    }
                }
            }
            else
            {
                for (let dateIndex in line)
                {
                    const dateNum = line[dateIndex];
                    const nextDate = line[+dateIndex + 1] ? line[+dateIndex + 1] : null;
                    const prevDate = line[+dateIndex - 1] ? line[+dateIndex - 1] : null;

                    const offset = bigRowCounter * NUM_MONTH_COLUMNS;

                    result[offset + rowMonthIndex].push(dateNum);

                    if (+nextDate < +dateNum)
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

/**
 * Takes a string of integers and attempts to interpret it as three groups of consecutive days of the month in the same week.
 *
 * @param {String} numString
 * @return {array} 0-3 integer arrays
 */
function getConsecutiveNumbers(numString)
{
    const oneDigitRegex = /^\d/g;
    const twoDigitRegex = /^\d\d/g;
    const endsWithTRegex = /^\dT/g;

    let outputArray = [];
    let arrayIndex = 0;

    let match = null;

    let failsafe = 100;

    while (numString.length > 0 && failsafe > 0)
    {
        let expectedNum = +(match) + 1;

        if (match == null)
        {
            match = getFirstNumber(numString);
        }
        else if (outputArray[arrayIndex]?.length == 7)
        {
            arrayIndex += 1;
            match = getFirstNumber(numString);
        }
        else if (numString.startsWith("T"))
        {
            match = "T";
        }
        else if (endsWithTRegex.test(numString))
        {
            match = numString.split("T")[0];

            if (!numString.startsWith("" + expectedNum))
            {
                arrayIndex += 1;
            }
        }
        else if (numString.startsWith("" + expectedNum))
        {
            match = ("" + expectedNum);
        }
        else
        {
            if (outputArray[arrayIndex] && outputArray[arrayIndex].length > 0 && match != "T")
            {
                arrayIndex += 1;
                match = getFirstNumber(numString);
            }
            else if (twoDigitRegex.test(numString))
            {
                if (+numString.match(twoDigitRegex)[0] <= 31 && +numString.match(twoDigitRegex)[0] >= 1)
                {
                    match = Math.min(+numString.match(oneDigitRegex)[0], +numString.match(twoDigitRegex)[0]) + "";
                }
                else
                {
                    match = numString.match(oneDigitRegex)[0];
                }
            }
            else if (oneDigitRegex.test(numString))
            {
                match = numString.match(oneDigitRegex)[0];
            }
        }

        outputArray[arrayIndex] = outputArray[arrayIndex] ?? [];
        outputArray[arrayIndex].push(match);
        numString = numString.slice(match.length);

        if (match == "T")
        {
            match = expectedNum;
        }

        failsafe--;
    }

    if (numString.length > 0)
    {
        console.error("Unable to parse string");
    }
    else
    {
        return outputArray;
    }
}

/**
 * Takes a string of integers and attempts to find the first number, interpreting the string as a list of consecutive days of the month.
 *
 * @param {*} numString
 * @return {*} 
 */
function getFirstNumber(numString)
{
    if (numString.length < 4)
    {
        if (+(numString.slice(0, 2)) > 15)
        {
            return numString.slice(0, 2);
        }
        return numString.slice(0, 1);
    }

    const numbersErrorCorrectionData = { 1: { first_number: 0, second_number: 0 }, 2: { first_number: 0, second_number: 0 } };
    for (let numDigits = 2; numDigits >= 1; numDigits -= 1)
    {
        if (numString[0] == "T")
        {
            return "T";
        }

        const firstNumber = numString.slice(0, numDigits);
        let secondNumber = numString.slice(numDigits, 2 * numDigits);
        if (secondNumber.startsWith("T"))
        {
            secondNumber = numString.slice(numDigits + 1, 2 * numDigits + 1);
        }

        if (firstNumber.includes("T") || secondNumber.includes("T"))
        {
            if (firstNumber.endsWith("T"))
            {
                return firstNumber.split("T")[0];
            }
        }

        numbersErrorCorrectionData[numDigits].first_number = firstNumber;
        numbersErrorCorrectionData[numDigits].second_number = secondNumber;

        if (Math.abs((+firstNumber) - (+secondNumber)) == 1)
        {
            return firstNumber;
        }
    }

    const oneDigitDiff = Math.abs((+numbersErrorCorrectionData[1].first_number) - (+numbersErrorCorrectionData[1].second_number));
    const twoDigitDiff = Math.abs((+numbersErrorCorrectionData[2].first_number) - (+numbersErrorCorrectionData[2].second_number));

    if (oneDigitDiff < twoDigitDiff)
    {
        return numbersErrorCorrectionData[1].first_number;
    }

    return numbersErrorCorrectionData[2].first_number;

}

// console.lg(getTrashRecyclingDays(static_lines, 3, 2024)); 