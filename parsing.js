// const calendarLines = ["SMTWTFSSMTWTFSSMTWTFS", "T2345612312", "78910111213456789103456789", "141516171819201112131415161710111213141516", "212223242526271819202122232417181920212223", "28293031252627282924252627282930", "31", "SMTWTFSSMTWTFSSMTWTFS", "12345612341", "789101112135678910112345678", "14151617181920121314151617189101112131415", "212223242526271920212223242516171819202122", "28293026T2829303123242526272829", "30", "SMTWTFSSMTWTFSSMTWTFS", "123T561231T34567", "7891011121345678910891011121314", "141516171819201112131415161715161718192021", "212223242526271819202122232422232425262728", "28293031252627282930312930", "SMTWTFSSMTWTFSSMTWTFS", "12345121234567", "67891011123456789891011121314", "131415161718191011121314151615161718192021", "2021222324252617181920212223222324T262728", "272829303124252627T2930293031"];

//const restOfText ="      \n2024 Holden Trash/Recycling Calendar\nNovemberOctoberDecember\nJanuaryFebruaryMarch\nAprilMayJune\nJulySeptemberAugust\n(Ex. Monday will be picked up on Tuesday, Tuesday on Wednesday, etc.) \nAll trash/recycling pickups will be moved forward ONE day due to the holiday. \nT\nWachusett Watershed Regional Recycling Center\n131 Raymond Huntington Hwy., W. Boylston, MA\nFor more info:  www.wachusettearthday.org\n978-464-2854\nBulk / Recycling / Electronics / Propane / Textiles / Tires \nOTHER SERVICES AVAILABLE\nDocument Shredding -9 am to 12 pm  Dates TBD\nFirst 2 boxes are free\nHousehold Hazardous Products -April 27 and October 26, 2024 \n9am -1pm -Disposal Fees Apply\nPlease visit the Center's website at: www.wachusettearthday.org\nfor 2024  hours of operation and special collection dates\nFOR MORE INFORMATION ON COMPOSTING, HAZARDOUS WASTE DATES, TRASH & RECYCLING\nSEE OUR WEBSITE www.holdenma.govCASELLA WASTE SERVICES 888-532-2735 (Bulk Pick-Up)\nChristmas Tree Chipping\nJanuary 6 & 13\n8:00 am to 2:30 pm\nDPW -Lower Adams Rd\nREMINDERS:\n•Lid must be closed on trash toter\n•Noyard debris\n•  Noplastic bags or styrofoam in the \nrecycling\n•  Overflow trash must be in blue \nbags. Blue Bags can be purchased at \nTown Hall, Big Y, Jed's and A1 Plus \nConvenience\n•  Cardboard must be broken down \ninto 2x2 pieces\nBatteries / Items for Reuse & Swap\nRECYCLING WEEKS ARE SHOWN IN GREEN"

console.log(getLikelyYear(restOfText));
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

        for (let dOffset = 0; dOffset < dowDate.getDay(); dOffset++)
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
        today: today.toISOString().split("T")[0],
        tomorrow: tomorrow.toISOString().split("T")[0],
        yesterday: yesterday.toISOString().split("T")[0],

        trash_day_curr: relevantTrashDays[0] ?? null,
        trash_day_curr_string: relevantTrashDays[0] ? relevantTrashDays[0].toISOString().split("T")[0] : null,
        trash_day_next: relevantTrashDays[1] ? relevantTrashDays[1].toISOString().split("T")[0] : null,

        recycling_day_curr: relevantRecyclingDays[0] ?? null,
        recycling_day_curr_string: relevantRecyclingDays[0] ? relevantRecyclingDays[0].toISOString().split("T")[0] : null,
        recycling_day_next: relevantRecyclingDays[1] ? relevantRecyclingDays[1].toISOString().split("T")[0] : null,

        trash_days: trashDays.map(x => x.toISOString().split("T")[0]),
        recycling_days: recyclingDays.map(x => x.toISOString().split("T")[0])
    };

    const simpleObject = {
        trash_simple: (
            (today.toDateString() == trashObject.trash_day_curr.toDateString() && today.getHours() <= 12) ||
            (tomorrow.toDateString() == trashObject.trash_day_curr.toDateString() && today.getHours() >= 12)
        ),
        recycling_simple: (
            (today.toDateString() == trashObject.recycling_day_curr.toDateString() && today.getHours() <= 12) ||
            (tomorrow.toDateString() == trashObject.recycling_day_curr.toDateString() && today.getHours() >= 12)
        )
    };

    return { ...simpleObject, ...trashObject, simple: simpleObject };
}

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

function getLikelyYear(text)
{
    console.log(text);
}


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
            bigRowIndex++;
        }
    }

    return monthData;

}

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
            arrayIndex++;
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
                arrayIndex++;
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
                arrayIndex++;
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

module.exports = { getTrashDays };