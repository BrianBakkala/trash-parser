// endpoint
// https://bindicator-439415.ue.r.appspot.com/



const db = require('./db');
const holden = require('./holden');
const server = require('server');
const { get, post } = server.router;
const { header } = server.reply;

const jsonHeader = header('Content-Type', 'application/json');

// Answers to any request
server([
    get('/', ctx => jsonHeader, ctx => 'Hello'),
    get('/favicon.ico', ctx => jsonHeader, ctx => 'Hello'),
    get('/holden', ctx => jsonHeader, async ctx => await holden.display()),
    get('/holden/simple', ctx => jsonHeader, async ctx => await holden.display_simple()),
    get('/holden/full/:dow', ctx => jsonHeader, async ctx => await holden.display(ctx.params.dow)),
    get('/holden/simple/:dow', ctx => jsonHeader, async ctx => await holden.display_simple(ctx.params.dow)),
    get('/test', ctx => jsonHeader, async ctx => await holden.display_test(true, true)),
    get('/test/random', ctx => jsonHeader, async ctx => await holden.display_test(Math.random() < 0.5, Math.random() < 0.5)),
    get('/test/:trash/:recycling', ctx => jsonHeader, async ctx => await holden.display_test(ctx.params.trash, ctx.params.recycling)),


    get('/db/get-all', ctx => jsonHeader, async ctx => await db.getAll()),

    get('/db/get/:a', ctx => jsonHeader, async ctx => await db.get(ctx.params.a)),
    get('/db/get/:a/:b', ctx => jsonHeader, async ctx => await db.get(ctx.params.a, ctx.params.b)),
    get('/db/get/:a/:b/:c', ctx => jsonHeader, async ctx => await db.get(
        ctx.params.a,
        ctx.params.b,
        ctx.params.c,
    )), get('/db/get/:a/:b/:c/:d', ctx => jsonHeader, async ctx => await db.get(
        ctx.params.a,
        ctx.params.b,
        ctx.params.c,
        ctx.params.d,
    )),
    get('/db/get/:a/:b/:c/:d/:e', ctx => jsonHeader, async ctx => await db.get(
        ctx.params.a,
        ctx.params.b,
        ctx.params.c,
        ctx.params.d,
        ctx.params.e,
    )),
    get('/db/get/:a/:b/:c/:d/:e/:f', ctx => jsonHeader, async ctx => await db.get(
        ctx.params.a,
        ctx.params.b,
        ctx.params.c,
        ctx.params.d,
        ctx.params.e,
        ctx.params.f,
    )),


    get('/db/get-all', ctx => jsonHeader, async ctx => await db.getAll()),


]);