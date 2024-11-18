const { readFile } = require('node:fs/promises');
const { resolve } = require('node:path');
const dbFile = "./db.json";

module.exports = {

    clear: async function ()
    {

    },

    get: async function (...layers)
    {
        const database = await this.getAll();

        // Loop through the layers to find the nested data
        let result = database;
        for (const layer of layers)
        {
            if (result[layer] === undefined)
            {
                return {}; // Return empty object if any layer is not found
            }
            result = result[layer]; // Move deeper into the next layer
        }

        // If we successfully find the final layer, return it
        return { result };
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

    remove: async function ()
    {

    }
};

