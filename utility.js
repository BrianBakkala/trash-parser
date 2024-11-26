const fs = require('fs');

Array.prototype.unique = function ()
{
    return [...new Set(this)];
};


function writeJSONToFile(obj, filename = 'sample.json')
{
    // Convert JSON object to string
    const jsonString = JSON.stringify(obj, null, 2); // 'null, 2' for pretty printing with 2 spaces indentation

    // Write to sample.json
    fs.writeFileSync(filename, jsonString, 'utf8');


    console.log('Data has been written to ' + filename);

};
module.exports = { writeJSONToFile };