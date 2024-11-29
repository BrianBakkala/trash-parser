// endpoint
// https://bindicator-439415.ue.r.appspot.com/

import * as papi from './particle_api.mjs';
import * as db from './db.mjs';
import * as fb from './fb.mjs';
import * as util from './utility.mjs';

import server from 'server';
const { get, post } = server.router;
const { header } = server.reply;


const jsonHeader = header('Content-Type', 'application/json');;

// Answers to any request
server({ security: { csrf: false } }, [
    get('/', ctx => jsonHeader, ctx => process.env.ENV_TEST),
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
    // get('/db/set-test', ctx => jsonHeader, async ctx => await db.setButtonState('51wt', "trash")),


    post('/hooks/set-button-state', ctx => jsonHeader,
        async function (ctx)
        {
            return await checkAuth(ctx,
                async function (ctx)
                {
                    return await fb.setButtonState(ctx.data.coreid, ctx.data.data);
                });
        }
    ),

    post('/hooks/get-button-state', ctx => jsonHeader,
        async function (ctx)
        {
            return await checkAuth(ctx,
                async function (ctx)
                {
                    return await fb.getButtonState(ctx.data.coreid, ctx.data.data);
                });
        }
    ),

    post('/hooks/get-bindicator-data', ctx => jsonHeader,
        async function (ctx)
        {
            return await checkAuth(ctx,
                async function (ctx)
                {
                    return await fb.getBindicatorData(ctx.data.coreid);
                });
        }
    ),

    post('/hooks/onboard-bindicator', ctx => jsonHeader,
        async function (ctx)
        {
            return await checkAuth(ctx,
                async function (ctx)
                {
                    return await fb.onboardBindicator(null, ctx.data.coreid);
                });
        }
    ),

    post('/hooks/onboard-bindicator/:household', ctx => jsonHeader,
        async function (ctx)
        {
            return await checkAuth(ctx,
                async function (ctx)
                {
                    return await fb.onboardBindicator(ctx.params.household, ctx.data.coreid);
                });
        }
    ),

    get('/hooks/check-schedule', ctx => jsonHeader, async ctx => await db.checkSchedule()),
    get('/hooks/override/:category/:value', ctx => jsonHeader, async ctx => await fb.setButtonStatesForAllBindicators(ctx.params.category, ctx.params.value)),

    get('/hooks/generate-days', ctx => jsonHeader, async ctx => await fb.generateTrashRecycleDays()),




    get('/papi/test', ctx => jsonHeader, async ctx => await papi.test()),

    // get('/fb/test', ctx => jsonHeader, async ctx => await fb.test()),
    // get('/fb/gbs', ctx => jsonHeader, async ctx => await fb.getButtonState('123456', 'trash')),
    // get('/fb/sbs', ctx => jsonHeader, async ctx => await fb.setButtonState('123456', 'trash')),
    // get('/fb/shbs', ctx => jsonHeader, async ctx => await fb.setHouseholdButtonStates('bakkala_holden', 'trash')),



]);

async function checkAuth(ctx, callback)
{
    const authHeader = ctx.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Basic '))
    {
        return { success: false, reason: "Security check failed. No auth credentials." };
    }

    const base64Creds = authHeader.split(' ')[1];
    const creds = Buffer.from(base64Creds, 'base64').toString('utf-8');

    const [username, password] = creds.split(':');

    // Perform your authentication logic here
    if (username === process.env.BASIC_AUTH_USER && password === process.env.BASIC_AUTH_PASSWORD)
    {
        const data = await callback(ctx);
        if (data && data.error)
        {
            return { success: false, error: data.error, result: { ...data } };

        }
        return { success: true, result: { ...data } };

    }

    return { success: false, reason: "Security check failed. Invalid credentials." };

};
