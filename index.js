// endpoint
// endpoint



const holden = require('./holden');
const server = require('server');
const { get, post } = server.router;

// Answers to any request
server([
    get('/', ctx => 'Hello'),
    get('/holden', async ctx => await holden.display()),
    get('/holden/simple', async ctx => await holden.display_simple()),
    get('/holden/full/:dow', async ctx => await holden.display(ctx.params.dow)),
    get('/holden/simple/:dow', async ctx => await holden.display_simple(ctx.params.dow)),
]);