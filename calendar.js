
const dowMap = { Su: 0, M: 1, T: 2, W: 3, Th: 4, F: 5, Sa: 6 }; ///0-based from JS Date.getDay()



function getDays(dayOfWeek, scheme, holidays = null, year = 2024)
{
    if (dowMap.hasOwnProperty(dayOfWeek))
    {
        dayOfWeek = dowMap[dayOfWeek];
    }

    if (holidays == null)
    {
        holidays = getHolidays(year);
    }
    let recyclingDays = [];

    const d = new Date(year, 0, 1);
    const jan1DOW = d.getDay();
    const firstDOWOffset = (dayOfWeek - jan1DOW + 7) % 7;

    let isRecyclingWeek = scheme == "biweekly second" ? false : true;

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

        if (isRecyclingWeek)
        {
            recyclingDays.push(dateToPush);
        }

        if (scheme.split(" ")[0] == "biweekly")
        {
            isRecyclingWeek = !isRecyclingWeek;
        }
    }

    const trashObject = {
        holidays: holidays,
        days: recyclingDays.map(x => x.toISOString().split("T")[0])
    };

    return trashObject;
}


function getHolidays(year = 2024)
{
    return [
        new Date("January 1, " + year),
        new Date("May 27, " + year),
        new Date("July 4, " + year),
        new Date("September 2, " + year),
        new Date("November 28, " + year),
        new Date("December 25, " + year)
    ];
}

module.exports = { getDays };