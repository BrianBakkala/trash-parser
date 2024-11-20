// endpoint
// https://bindicator-439415.ue.r.appspot.com/



const db = require('./db.js');
const holden = require('./holden');
const papi = require('./particle_api');

const server = require('server');
const { get, post } = server.router;
const { header } = server.reply;

const jsonHeader = header('Content-Type', 'application/json');

// Answers to any request
server({ security: { csrf: false } }, [
    get('/', ctx => jsonHeader, ctx => 'Hello'),
    get('/favicon.ico', ctx => jsonHeader, ctx => 'Hello'),

    // get('/holden', ctx => jsonHeader, async ctx => await holden.display()),
    // get('/holden/simple', ctx => jsonHeader, async ctx => await holden.display_simple()),
    // get('/holden/full/:dow', ctx => jsonHeader, async ctx => await holden.display(ctx.params.dow)),
    // get('/holden/simple/:dow', ctx => jsonHeader, async ctx => await holden.display_simple(ctx.params.dow)),
    // get('/test', ctx => jsonHeader, async ctx => await holden.display_test(true, true)),
    // get('/test/random', ctx => jsonHeader, async ctx => await holden.display_test(Math.random() < 0.5, Math.random() < 0.5)),
    // get('/test/:trash/:recycling', ctx => jsonHeader, async ctx => await holden.display_test(ctx.params.trash, ctx.params.recycling)),


    // get('/db/get-all', ctx => jsonHeader, async ctx => await db.getAll()),

    // get('/db/get/:a', ctx => jsonHeader, async ctx => await db.get(ctx.params.a)),
    // get('/db/get/:a/:b', ctx => jsonHeader, async ctx => await db.get(ctx.params.a, ctx.params.b)),

    // get('/db/get-all', ctx => jsonHeader, async ctx => await db.getAll()),


    // get('/hooks/check-schedule/:photonid', ctx => jsonHeader, async ctx => await db.checkSchedule('u1234', "trash")),
    get('/db/set-test', ctx => jsonHeader, async ctx => await db.setButtonState('51wt', "trash")),

    post('/hooks/set-button-state', ctx => jsonHeader,
        async function (ctx)
        {
            if (ctx.data["8LplHeuLKUnwogNYuxOD1YioIQ08WyN39jkiN9JQ6Zsyk7dn2V"] == "lBdUeV2wS4IhVjhlcZxoAujMMVOCydUC2VNXqaP63r6e90cAJL")
            {
                await db.setButtonState(ctx.data.coreid, ctx.data.data);
                return { success: true };
            }
            else
            {
                return { success: false, reason: "Security check failed." };
            }
        }
    ),
    post('/hooks/get-button-state', ctx => jsonHeader,
        async function (ctx)
        {
            if (ctx.data["8LplHeuLKUnwogNYuxOD1YioIQ08WyN39jkiN9JQ6Zsyk7dn2V"] == "lBdUeV2wS4IhVjhlcZxoAujMMVOCydUC2VNXqaP63r6e90cAJL")
            {
                return await db.getButtonState(ctx.data.coreid, ctx.data.data);
            }
            else
            {
                return { success: false, reason: "Security check failed." };
            }
        }
    ),


    get('/hooks/check-schedule', ctx => jsonHeader, async ctx => await db.checkSchedule()),
    get('/hooks/check-schedule/force', ctx => jsonHeader, async ctx => await db.checkSchedule(true)),
    get('/hooks/generate-days', ctx => jsonHeader, async ctx => await db.generateTrashRecycleDays()),

    get('/papi/test', ctx => jsonHeader, async ctx => await papi.test()),



]);