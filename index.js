const holden = require('./holden');
const server = require('server');
const { get, post } = server.router;

// Answers to any request
server([
    get('/', ctx => 'Hello'),
    get('/holden', async ctx => await holden.display()),
]);