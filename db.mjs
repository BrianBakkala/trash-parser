import { writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const controller = new AbortController();
const { signal } = controller;

import * as holden from './holden.mjs';
import * as calendar from './calendar.mjs';
import * as papi from './particle_api.mjs';


const LIVE_DB_FILE = "./db_dynamic.json";
const STATIC_DB_FILE = "./db_static.json";
let preloadStaticDB = {};



/*******GET AND SET************/
export async function getGeneric(db, ...destinationLayers)
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
}

export async function setGeneric(db, value, ...destinationLayers)
{
    let database = await this.getAll(db);

    // Traverse the destinationLayers dynamically
    let currentLayer = database;
    for (let i = 0; i < destinationLayers.length - 1; i++)
    {
        // Create the layer if it doesn't exist
        if (!currentLayer.hasOwnProperty(destinationLayers[i]))
        {
            currentLayer[destinationLayers[i]] = {};
        }
        currentLayer = currentLayer[destinationLayers[i]];
    }

    // Set the value at the final layer
    currentLayer[destinationLayers[destinationLayers.length - 1]] = value;

    await writeFile(db, JSON.stringify(database), { signal });

    return { [destinationLayers.join(".")]: value };
}

export async function set(value, ...destinationLayers)
{
    return await this.setGeneric(LIVE_DB_FILE, value, ...destinationLayers);
}

export async function setStatic(value, ...destinationLayers)
{
    const newSet = await this.setGeneric(STATIC_DB_FILE, value, ...destinationLayers);
    preloadStaticDB = await this.getAll(STATIC_DB_FILE); // make sure preload is correct
    return newSet;
}

export async function get(...destinationLayers)
{
    return await this.getGeneric(LIVE_DB_FILE, ...destinationLayers);
}

export async function getStatic(...destinationLayers)
{
    return await this.getGeneric(STATIC_DB_FILE, ...destinationLayers);
}


export async function getAll(dbFile = LIVE_DB_FILE)
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
}

/*****SPECIFIC SETS******/
/**
 *
 *
 * @param {String} unitId the photon unit Id number
 * @param {String} category recycling/trash
 * @param {String} value defaults to the opposite of the current value, otherwise this value overwrites
 */
export async function setButtonState(photonID, category, value = null)
{
    let currentVal = await this.get('button_states', photonID, category);
    if (value == null)
    {
        value = !currentVal.result;
    }

    try
    {
        // if (currentVal != value)
        {
            await this.set(value, 'button_states', photonID, category);
            await papi.publishParticleEvent("button_state_changed", { photon_id: photonID, category, value });
        }

    }
    catch (e)
    {
        return "Error: " + e;
    }

}

export async function setHouseholdButtonStates(household, category, value = null)
{
    const householdsMap = await this.getStatic('households');
    for (let photonID in householdsMap)
    {
        if (householdsMap[photonID] == household)
        {
            await this.setButtonState(photonID, category, value);
        }
    }
}


export async function getButtonState(unitId, category)
{
    return await this.get('button_states', unitId, category);
}




/******* SCHEDULE************/

export async function checkSchedule()
{
    const d = new Date();
    console.log(d);
    const tomorrow = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);

    const todayDateString = d.toLocaleDateString('en-CA');
    const tomorrowDateString = tomorrow.toLocaleDateString('en-CA');

    const scheduleCheckedDate = await this.get('schedule_checked');

    console.log(scheduleCheckedDate);

    let result = [];
    if (scheduleCheckedDate && scheduleCheckedDate.result && scheduleCheckedDate.result != todayDateString)
    {
        const households = await this.getUniqueHouseholds();

        const trashDays = await this.getStatic('trash_days');
        const recycleDays = await this.getStatic('recycle_days');


        for (let householdIndex in households)
        {
            const household = households[householdIndex];
            if (trashDays[household] && trashDays[household].includes(todayDateString))
            {

                //trash was this morning, missed it
                await this.setHouseholdButtonStates(household, "trash", false);
                result.push({ household, category: "trash", value: false, message: "trash was this morning, missed it" });
            }
            if (recycleDays[household] && recycleDays[household].includes(todayDateString))
            {
                //recycle was this morning, missed it
                await this.setHouseholdButtonStates(household, "recycle", false);
                result.push({ household, category: "recycle", value: false, message: "recycle was this morning, missed it" });
            }

            if (trashDays[household] && trashDays[household].includes(tomorrowDateString))
            {
                //trash is tomorrow, light up
                await this.setHouseholdButtonStates(household, "trash", true);
                result.push({ household, category: "trash", value: true, message: "trash is tomorrow, light up" });

            }
            if (recycleDays[household] && recycleDays[household].includes(tomorrowDateString))
            {
                //recycle is tomorrow, light up
                await this.setHouseholdButtonStates(household, "recycle", true);
                result.push({ household, category: "recycle", value: true, message: "recycle is tomorrow, light up" });

            }
        }

        // await this.set(todayDateString, 'schedule_checked');
    }


    return { result };
}

export async function overrideAll(category, value)
{
    const households = await this.getUniqueHouseholds();

    for (let householdIndex in households)
    {
        const household = households[householdIndex];
        await this.setHouseholdButtonStates(household, category, value);
    }
}


export async function generateTrashRecycleDays()
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

}

export async function getUniqueHouseholds()
{
    const notUnique = Object.values(await this.getStatic('households'));
    return [...new Set(notUnique)];
}



