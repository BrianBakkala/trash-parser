const calendarLines = ["SMTWTFSSMTWTFSSMTWTFS", "T2345612312", "78910111213456789103456789", "141516171819201112131415161710111213141516", "212223242526271819202122232417181920212223", "28293031252627282924252627282930", "31", "SMTWTFSSMTWTFSSMTWTFS", "12345612341", "789101112135678910112345678", "14151617181920121314151617189101112131415", "212223242526271920212223242516171819202122", "28293026T2829303123242526272829", "30", "SMTWTFSSMTWTFSSMTWTFS", "123T561231T34567", "7891011121345678910891011121314", "141516171819201112131415161715161718192021", "212223242526271819202122232422232425262728", "28293031252627282930312930", "SMTWTFSSMTWTFSSMTWTFS", "12345121234567", "67891011123456789891011121314", "131415161718191011121314151615161718192021", "2021222324252617181920212223222324T262728", "272829303124252627T2930293031"];

console.log(getTrashDays(calendarLines, 0));
function getTrashDays(lines, dayOfWeekIndex, year = 2024)
{
    const holidays = getHolidays(lines);

    let d = new Date(year, 0, 1);
    let jan1DOW = d.getDay();
    const firstDOWOffset = (dayOfWeekIndex - jan1DOW + 7) % 7;
    const firstDOW = new Date(year, 0, 1 + firstDOWOffset);
    console.log(firstDOW);
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

