// const calendarLines = ["SMTWTFSSMTWTFSSMTWTFS", "T2345612312", "78910111213456789103456789", "141516171819201112131415161710111213141516", "212223242526271819202122232417181920212223", "28293031252627282924252627282930", "31", "SMTWTFSSMTWTFSSMTWTFS", "12345612341", "789101112135678910112345678", "14151617181920121314151617189101112131415", "212223242526271920212223242516171819202122", "28293026T2829303123242526272829", "30", "SMTWTFSSMTWTFSSMTWTFS", "123T561231T34567", "7891011121345678910891011121314", "141516171819201112131415161715161718192021", "212223242526271819202122232422232425262728", "28293031252627282930312930", "SMTWTFSSMTWTFSSMTWTFS", "12345121234567", "67891011123456789891011121314", "131415161718191011121314151615161718192021", "2021222324252617181920212223222324T262728", "272829303124252627T2930293031"];

/**
 *
 *
 * @param {array} lines string arrays of each line of the PDF
 * @param {number} dayOfWeekIndex trash day 0-6
 * @param {number} [year=2024]
 * @return {obj} data representing the trash and recycling days 
 */
function getTrashDays(lines, dayOfWeekIndex, year = 2024)
{
    const holidays = getHolidays(lines);
    let trashDays = [];
    let recyclingDays = [];

    const d = new Date(year, 0, 1);
    const jan1DOW = d.getDay();
    const firstDOWOffset = (dayOfWeekIndex - jan1DOW + 7) % 7;

    let isRecyclingWeek = false;

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

        isRecyclingWeek = !isRecyclingWeek;
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
function getLikelyYear(text)
{
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
 * Parses the Holden Trash PDF as a table containing 12 months
 *
 * @param {array} linesArray string arrays of each line of the PDF
 * @return {array} array of json representations of each month
 */
function getMonths(linesArray)
{
    const headerRowRegex = /^SMTW/g;

    const monthData = {};
    const monthsInRow = 3;

    let bigRowIndex = -1;
    let monthIndex = 0;

    for (let row of linesArray)
    {
        const isAHeaderRow = headerRowRegex.test(row);
        monthData[monthIndex] = monthData[monthIndex] ?? [];

        if (!isAHeaderRow)
        {
            const numberArray = getConsecutiveNumbers(row);

            for (let weekIndex of Array.from(Array(monthsInRow).keys()))
            {
                let monthIndex = (bigRowIndex * 3) + +weekIndex;

                let week;
                let w = weekIndex;
                do
                {
                    week = numberArray[w];
                    w--;

                } while (week === undefined);

                monthData[monthIndex] = monthData[monthIndex] ?? [];
                const prevLast = monthData[monthIndex][monthData[monthIndex].length - 1];

                if (monthData[monthIndex].length == 0 || +(prevLast) + 1 == +week[0])
                {
                    monthData[monthIndex].push(...week);
                }
                else if (prevLast == "T" || week[0] == "T")
                {
                    monthData[monthIndex].push(...week);
                }

            }

        }
        else
        {
            bigRowIndex += 1;
        }
    }

    return monthData;

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

module.exports = { getTrashDays, getLikelyYear };