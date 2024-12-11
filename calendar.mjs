const DOW_MAP = { Su: 0, M: 1, T: 2, W: 3, Th: 4, F: 5, Sa: 6 }; ///0-based from JS Date.getDay()
const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];
export function getDays(dayOfWeek, scheme, holidays = null, year = 2024, full = false)
{
    if (DOW_MAP.hasOwnProperty(dayOfWeek))
    {
        dayOfWeek = DOW_MAP[dayOfWeek];
    }

    if (holidays == null)
    {
        holidays = getSampleHolidays(year);
    }

    let collectionDays = [];

    const d = new Date(year, 0, 1);
    const jan1DOW = d.getDay();
    const firstDOWOffset = (dayOfWeek - jan1DOW + 7) % 7;

    let isRecyclingWeek = scheme == "biweekly second" ? false : true;

    for (let i = 0; 1 + firstDOWOffset + i < 367 * 2; i += 7)
    {
        const bigOffset = 1 + firstDOWOffset + i;
        const dowDate = new Date(year, 0, bigOffset);

        if (!full && dowDate < new Date().setHours(0, 0, 0, 0))
        {
            continue;
        }

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
            collectionDays.push(dateToPush);
        }

        if (scheme.split(" ")[0] == "biweekly")
        {
            isRecyclingWeek = !isRecyclingWeek;
        }
    }

    const resultObj = {
        holidays: holidays,
        days: collectionDays.map(x => x.toLocaleDateString('en-CA'))
    };

    return resultObj;
}

export function naturalDate(datestamp, abbrev = false)
{
    //parse input
    const [year, monthNum, day] = datestamp.split("-");

    let m = monthNames[monthNum - 1];

    return (abbrev ? m.slice(0, 3) : m) + " " + +day;
}

function getSampleHolidays(year = 2024)
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


export function getHolidaysDatabase(year = 2024)
{
    try
    {
        let db = {};
        [
            getHolidayEntry(year, "New Years' Day", (year) => "January 1, " + year),
            getHolidayEntry(year, "Martin Luther King Jr. Day", martinLutherKingJrDay),
            getHolidayEntry(year, "Presidents' Day", presidentsDay),
            getHolidayEntry(year, "Easter Sunday", easterSunday),
            getHolidayEntry(year, "Patriots' Day", patriotsDay),
            getHolidayEntry(year, "Memorial Day", memorialDay),
            getHolidayEntry(year, "Independence Day", (year) => "July 4, " + year),
            getHolidayEntry(year, "Labor Day", laborDay),
            getHolidayEntry(year, "Indigenous People's Day", columbusDay),
            getHolidayEntry(year, "Veterans Day", (year) => "November 11, " + year),
            getHolidayEntry(year, "Thanksgiving Day", thanksgivingDay),
            getHolidayEntry(year, "Christmas Day", (year) => "December 25, " + year),

        ].forEach(entry =>
            db[entry.name] = entry
        );
    } catch (error)
    {
        throw new Error("Error calculating holidays.");
    }


    return db;
}

function getHolidayEntry(startYear, name, calculationFunction)
{
    let datestamps = [];

    for (let year of [startYear, startYear + 1])
    {
        const dateObj = new Date(calculationFunction(year));
        datestamps.push(dateObj.toLocaleDateString('en-CA'));
    }

    return {
        name,
        datestamps,

        formatted_date: naturalDate(datestamps[0]),

        is_selected: false,
    };

}

function formatDate(month, day, year)
{
    return monthNames[month - 1] + " " + day + ", " + year;
}

// Martin Luther King Jr. Day (Third Monday of January)
function martinLutherKingJrDay(year)
{
    const date = new Date(year, 0, 1); // January 1st
    const firstMonday = (8 - date.getDay()) % 7 + 1; // Find the first Monday
    const thirdMonday = firstMonday + 14; // Add 14 days to get the third Monday
    return formatDate(1, thirdMonday, year);
}

// Presidents' Day (Third Monday of February)
function presidentsDay(year)
{
    const date = new Date(year, 1, 1); // February 1st
    const firstMonday = (8 - date.getDay()) % 7 + 1;
    const thirdMonday = firstMonday + 14;
    return formatDate(2, thirdMonday, year);
}

// Patriots' Day (Third Monday of April, Massachusetts-only)
function patriotsDay(year)
{
    const date = new Date(year, 3, 1); // April 1st
    const firstMonday = (8 - date.getDay()) % 7 + 1;
    const thirdMonday = firstMonday + 14;
    return formatDate(4, thirdMonday, year);
}

// Memorial Day (Last Monday of May)
function memorialDay(year)
{
    const date = new Date(year, 4, 31); // May 31st
    const lastMonday = 31 - (date.getDay() === 0 ? 6 : date.getDay() - 1);
    return formatDate(5, lastMonday, year);
}

// Labor Day (First Monday of September)
function laborDay(year)
{
    const date = new Date(year, 8, 1); // September 1st
    const firstMonday = (8 - date.getDay()) % 7 + 1;
    return formatDate(9, firstMonday, year);
}

// Columbus Day (Second Monday of October)
function columbusDay(year)
{
    const date = new Date(year, 9, 1); // October 1st
    const firstMonday = (8 - date.getDay()) % 7 + 1;
    const secondMonday = firstMonday + 7;
    return formatDate(10, secondMonday, year);
}

// Thanksgiving Day (Fourth Thursday of November)
function thanksgivingDay(year)
{
    const date = new Date(year, 10, 1); // November 1st
    const firstThursday = (11 - date.getDay()) % 7 + 1;
    const fourthThursday = firstThursday + 21;
    return formatDate(11, fourthThursday, year);
}


function easterSunday(year)
{
    // Computus algorithm to calculate the date of Easter
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31); // March = 3, April = 4
    const day = ((h + l - 7 * m + 114) % 31) + 1;

    return formatDate(month, day, year);
}