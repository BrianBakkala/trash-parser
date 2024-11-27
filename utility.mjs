import * as fs from 'fs';
import { PdfReader } from 'pdfreader-fixed'; // using ESM syntax


Object.defineProperty(Array.prototype, 'unique', {
    value: function ()
    {
        return [...new Set(this)];
    },
    writable: true,
    configurable: true,
    enumerable: false  // This makes the method non-enumerable
});

export function round(num, numPlaces)
{
    const factor = Math.pow(10, numPlaces);
    return Math.round(num * factor) / factor;
}

export function roundToInterval(num, interval)
{
    // Calculate how many decimal places the interval has
    const intervalPrecision = (interval.toString().split('.')[1] || '').length;

    // Apply the rounding to the nearest interval
    const result = Math.round(num / interval) * interval;

    // Use the interval precision to determine how many decimal places to keep
    return parseFloat(result.toFixed(intervalPrecision));
}
export function writeJSONToFile(obj, filename = 'sample.json')
{
    // Convert JSON object to string
    const jsonString = JSON.stringify(obj, null, 2); // 'null, 2' for pretty printing with 2 spaces indentation

    // Write to sample.json
    fs.writeFileSync(filename, jsonString, 'utf8');


    console.log('Data has been written to ' + filename);

};


/**
 *
 *
 * @param {String} url  of the pdf
 * @param {function} callback
 * @return {function} the result of the callback 
 */
export async function getPDFfromURL(url, callback)
{

    const response = await fetch(url);
    const pdfBuffer = await response.arrayBuffer();


    const items = {};

    return await new Promise((resolve, reject) =>
    {
        new PdfReader().parseBuffer(pdfBuffer, function (err, item)
        {
            if (!item)
            {
                const result = callback(items, convertPDFItemsToPseudoTable(items));
                resolve(result);
                return result;
            }
            if (item.y)
            {
                const adjustedY = roundToInterval(item.y, .4);
                items[adjustedY] = items[adjustedY] ?? [];
                items[adjustedY].push(item);
            }
        });
    });

}

function convertPDFItemsToPseudoTable(items)
{
    let result = [];

    for (let yValue of Object.keys(items))
    {
        items[yValue] = items[yValue]
            .sort((a, b) => a.x - b.x)
            .map((z) => z.text);
    }

    const sortedKeys = Object.keys(items)
        .sort((a, b) => parseFloat(a) - parseFloat(b));


    for (let yValue of sortedKeys)
    {
        result.push(items[yValue]);
    }

    return result;
}


function trimBuffer(buffer)
{
    let length = buffer.byteLength;
    const view = new Uint8Array(buffer);

    // Traverse backwards and find the last non-null byte
    while (length > 0 && view[length - 1] === 0)
    {
        length--;
    }

    // Slice the buffer to remove the trailing nulls
    return buffer.slice(0, length);
}
