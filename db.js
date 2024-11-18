const { writeFile, readFile } = require('node:fs/promises');
const { resolve } = require('node:path');
const { Buffer } = require('node:buffer');
const controller = new AbortController();
const { signal } = controller;

const dbFile = "./db.json";

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

    set: async function (value, ...layers)
    {
        let database = await this.getAll();

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

        await writeFile(dbFile, JSON.stringify(database), { signal });

        return {};
        return { [layers.join(".")]: value };
    },

    getAll: async function ()
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
            value = !this.get('button_states', unitId, category);
        }
        return this.set(value, 'button_states', unitId, category);
    }
};

