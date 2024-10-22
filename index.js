// Include the server in your file
const server = require('server');
const { get, post } = server.router;


function helloWorld()
{
    return "helloWorld";
}
// Handle requests to the url "/" ( http://localhost:3000/ )
server([
    get('/favicon.ico', ctx => 'Hello world!!'),
    get('/holden', ctx => helloWorld()),
    get('/', ctx => 'Hello world!')
]);