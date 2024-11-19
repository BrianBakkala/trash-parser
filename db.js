const { writeFile, readFile } = require('node:fs/promises');
const { resolve } = require('node:path');
const { Buffer } = require('node:buffer');
const controller = new AbortController();
const { signal } = controller;
const holden = require('./holden');
const parsing = require('./parsing');
const calendar = require('./calendar');

const LIVE_DB_FILE = "./db_dynamic.json";
const STATIC_DB_FILE = "./db_static.json";
let preloadStaticDB = {};

module.exports = {

    /*******GET AND SET************/
    getGeneric: async function (db, ...destinationLayers)
    {
        let database;

        if (db == STATIC_DB_FILE)
        {
            if (Object.keys(preloadStaticDB).length === 0)
            {
                //preload static db if empty
                preloadStaticDB = await this.getAll(db);
            }

            database = preloadStaticDB;
        }
        else
        {
            database = await this.getAll(db);
        }

        // Loop through the destinationLayer to find the nested data
        let result = database;
        for (const layer of destinationLayers)
        {
            if (result[layer] === undefined)
            {
                return {};
            }
            result = result[layer]; // Move deeper into the next layer
        }

        if (result.constructor !== Object)
        {
            return { result };
        }

        return result;
    },

    setGeneric: async function (db, value, ...destinationLayers)
    {
        let database = await this.getAll(db);

        // Traverse the destinationLayers dynamically
        let currentLayer = database;
        for (let i = 0; i < destinationLayers.length - 1; i++)
        {
            // Create the layer if it doesn't exist
            currentLayer[destinationLayers[i]] = currentLayer[destinationLayers[i]] ?? {};
            currentLayer = currentLayer[destinationLayers[i]];
        }

        // Set the value at the final layer
        currentLayer[destinationLayers[destinationLayers.length - 1]] = value;

        await writeFile(db, JSON.stringify(database), { signal });

        return { [destinationLayers.join(".")]: value };
    },

    set: async function (value, ...destinationLayers)
    {
        return await this.setGeneric(LIVE_DB_FILE, value, ...destinationLayers);
    },

    setStatic: async function (value, ...destinationLayers)
    {
        const newSet = await this.setGeneric(STATIC_DB_FILE, value, ...destinationLayers);
        preloadStaticDB = await this.getAll(STATIC_DB_FILE); // make sure preload is correct
        return newSet;
    },

    get: async function (...destinationLayers)
    {
        return await this.getGeneric(LIVE_DB_FILE, ...destinationLayers);
    },

    getStatic: async function (...destinationLayers)
    {
        return await this.getGeneric(STATIC_DB_FILE, ...destinationLayers);
    },


    getAll: async function (dbFile = LIVE_DB_FILE)
    {
        try
        {
            let result = await readFile(resolve(dbFile), { encoding: 'utf8' });
            result = JSON.parse(result);
            // console.log(result);
            return result;

        } catch (err)
        {
            console.error(err.message);
        }
    },

    /*****SPECIFIC SETS******/
    /**
     *
     *
     * @param {String} unitId the photon unit Id number
     * @param {String} category recycling/trash
     * @param {String} value defaults to the opposite of the current value, otherwise this value overwrites
     */
    setButtonState: async function (photonID, category, value = null)
    {
        if (value == null)
        {
            let currentVal = await this.get('button_states', photonID, category);
            value = !currentVal.result;
        }
        return this.set(value, 'button_states', photonID, category);
    },

    setAllButtonStates: async function (household, category, value = null)
    {
        const householdsMap = await this.getStatic('households');
        for (let photonID in householdsMap)
        {
            if (householdsMap[photonID] == household)
            {
                this.setButtonState(photonID, category, value);
            }
        }
    },


    getButtonState: async function (unitId, category)
    {
        return await this.get('button_states', unitId, category);
    },




    /******* SCHEDULE************/

    checkSchedule: async function (force = false)
    {
        const d = new Date();
        const tomorrow = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);

        const todayDateString = d.toISOString().split("T")[0];
        const tomorrowDateString = tomorrow.toISOString().split("T")[0];
        if (!force && d.getHours() != 12)
        {
            return false;
        }

        const scheduleCheckedDate = await this.get('schedule_checked');

        console.log(scheduleCheckedDate);

        let result = [];
        if (force || scheduleCheckedDate.result != todayDateString)
        {
            const households = await this.getUniqueHouseholds();

            const trashDays = await this.getStatic('trash_days');
            const recycleDays = await this.getStatic('recycle_days');


            for (let householdIndex in households)
            {
                const household = households[householdIndex];
                console.log(trashDays[household]);
                console.log(todayDateString);
                if (trashDays[household] && trashDays[household].includes(todayDateString))
                {

                    //trash was this morning, missed it
                    await this.setAllButtonStates(household, "trash", false);
                    result.push({ household, category: "trash", value: false });
                }
                if (recycleDays[household] && recycleDays[household].includes(todayDateString))
                {
                    //recycle was this morning, missed it
                    await this.setAllButtonStates(household, "recycle", false);
                    result.push({ household, category: "recycle", value: false });
                }

                if (trashDays[household] && trashDays[household].includes(tomorrowDateString))
                {
                    //trash is tomorrow, light up
                    await this.setAllButtonStates(household, "trash", true);
                    result.push({ household, category: "trash", value: true });

                }
                if (recycleDays[household] && recycleDays[household].includes(tomorrowDateString))
                {
                    //recycle is tomorrow, light up
                    await this.setAllButtonStates(household, "recycle", true);
                    result.push({ household, category: "recycle", value: true });

                }
            }


            await this.set(todayDateString, 'schedule_checked');
        }


        return { result };
    },



    generateTrashRecycleDays: async function ()
    {
        const staticDB = await this.getAll(STATIC_DB_FILE);
        const households = await this.getUniqueHouseholds();
        const holdenDB = await holden.display();

        for (let household of households)
        {
            console.log(household);
            if (household == "holden_bakkala")
            {
                await this.setStatic(holdenDB.trash_days, "trash_days", household);
                await this.setStatic(holdenDB.recycling_days, "recycle_days", household);
            }

            else
            {
                const trashDays = calendar.getDays(staticDB.trash_dotw[household], staticDB.trash_scheme[household]);
                await this.setStatic(trashDays.days, "trash_days", household);

                const recycleDays = calendar.getDays(staticDB.recycle_dotw[household], staticDB.recycle_scheme[household]);
                await this.setStatic(recycleDays.days, "recycle_days", household);

            }
        }

    },

    getUniqueHouseholds: async function ()
    {
        const notUnique = Object.values(await this.getStatic('households'));
        return [...new Set(notUnique)];
    }



};

