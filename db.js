const { writeFile, readFile } = require('node:fs/promises');
const { resolve } = require('node:path');
const { Buffer } = require('node:buffer');
const controller = new AbortController();
const { signal } = controller;
const holden = require('./holden');
const parsing = require('./parsing');
const calendar = require('./calendar');


const liveDBFile = "./db_dynamic.json";
const staticDBFile = "./db_static.json";

module.exports = {

    get: async function (...destinationLayers)
    {
        const database = await this.getAll();

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

        return { result };
    },

    setGeneric: async function (db, value, ...layers)
    {
        let database = await this.getAll(db);

        // Traverse the layers dynamically
        let currentLayer = database;
        for (let i = 0; i < layers.length - 1; i++)
        {
            // Create the layer if it doesn't exist
            currentLayer[layers[i]] = currentLayer[layers[i]] ?? {};
            currentLayer = currentLayer[layers[i]];
        }

        // Set the value at the final layer
        currentLayer[layers[layers.length - 1]] = value;

        await writeFile(db, JSON.stringify(database), { signal });

        return { [layers.join(".")]: value };
    },

    set: async function (value, ...layers)
    {
        return this.setGeneric(liveDBFile, value, ...layers);
    },

    setStatic: async function (value, ...layers)
    {
        return this.setGeneric(staticDBFile, value, ...layers);
    },



    getAll: async function (dbFile = liveDBFile)
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



    checkSchedule: async function ()
    {
        const d = new Date();
        const dateString = d.toDateString();
        if (d.getHours() != 12)
        {
            // return false;
        }

        const scheduleCheckedDate = await this.get('schedule_checked');
        // if (scheduleCheckedDate.result != dateString)
        if (1 == 1)
        {
            const staticDB = await this.getAll(staticDBFile);
            const households = Object.values(staticDB.households);

            return staticDB;


            await this.set(dateString, 'schedule_checked');
        }


        return { result: "s" };
    },


    /**
     *
     *
     * @param {String} unitId the photon unit Id number
     * @param {String} category recycling/trash
     * @param {String} value defaults to the opposite of the current value, otherwise this value overwrites
     */
    setButtonState: async function (unitId, category, value = null)
    {
        if (value == null)
        {
            let currentVal = await this.get('button_states', unitId, category);
            value = !currentVal.result;
        }
        return this.set(value, 'button_states', unitId, category);
    },

    getButtonState: async function (unitId, category)
    {
        return await this.get('button_states', unitId, category);
    },


    generateTrashDays: async function ()
    {
        const staticDB = await this.getAll(staticDBFile);
        const households = [...new Set(Object.values(staticDB.households))];
        const holdenDB = await holden.display();
        console.log(households);

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





}; 