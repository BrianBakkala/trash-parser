// endpoint
// https://bindicator-439415.ue.r.appspot.com/

import * as papi from './particle_api.mjs';
import * as fb from './fb.mjs';
import * as holden from './holden.mjs';
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
    get('/test', ctx => jsonHeader, async ctx => { return { success: true, message: "hello there" }; }),
    // get('/test/random', ctx => jsonHeader, async ctx => await holden.display_test(Math.random() < 0.5, Math.random() < 0.5)),
    // get('/test/:trash/:recycling', ctx => jsonHeader, async ctx => await holden.display_test(ctx.params.trash, ctx.params.recycling)),


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


    post('/hooks/get-bindicator-settings', ctx => jsonHeader,
        async function (ctx)
        {
            // console.log("#", "Received:", ctx.data);

            return await checkAuth(ctx,
                async function (ctx)
                {
                    return await fb.getBindicatorSettings(ctx.data);
                });
        }
    ),


    post('/hooks/get-preview-days', ctx => jsonHeader,
        async function (ctx)
        {

            return await checkAuth(ctx,
                async function (ctx)
                {
                    return await fb.getPreviewDays(ctx.data, 5);
                });
        }
    ),

    post('/hooks/get-holiday-data', ctx => jsonHeader,
        async function (ctx)
        {

            return await checkAuth(ctx,
                async function (ctx)
                {
                    return await fb.getHolidayData(ctx.data.device_uuid);
                });
        }
    ),



    post('/hooks/get-bindicators-for-household', ctx => jsonHeader,
        async function (ctx)
        {
            const data = typeof ctx.data === 'string' ? JSON.parse(ctx.data) : ctx.data;
            return await fb.getBindicators(data.household_id);
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

    post('/hooks/onboard-bindicator/:householdId', ctx => jsonHeader,
        async function (ctx)
        {
            return await checkAuth(ctx,
                async function (ctx)
                {
                    return await fb.onboardBindicator(ctx.params.householdId, ctx.data.coreid);
                });
        }
    ),



    post('/hooks/check-schedule', ctx => jsonHeader,
        async function (ctx)
        {
            return await checkAuth(ctx,
                async function (ctx)
                {
                    return await fb.checkSchedule();
                });
        }
    ),

    post('/hooks/check-schedule/:bindicator', ctx => jsonHeader,
        async function (ctx)
        {
            return await checkAuth(ctx,
                async function (ctx)
                {
                    return await fb.checkSchedule(ctx.params.bindicator);
                });
        }
    ),

    post('/hooks/generate-days', ctx => jsonHeader,
        async function (ctx)
        {
            return await checkAuth(ctx,
                async function (ctx)
                {
                    return await fb.generateTrashRecycleDays();
                });
        }
    ),

    post('/hooks/generate-days/:bindicator', ctx => jsonHeader,
        async function (ctx)
        {
            return await checkAuth(ctx,
                async function (ctx)
                {
                    return await fb.generateTrashRecycleDays(ctx.params.bindicator);
                });
        }
    ),

    post('/hooks/post-provision', ctx => jsonHeader,
        async function (ctx)
        {
            return await checkAuth(ctx,
                async function (ctx)
                {
                    return await fb.addProvisioningBindicator(ctx.data.verification_key, ctx.data.device_uuid);
                });
        }
    ),

    post('/hooks/whoami', ctx => jsonHeader,
        async function (ctx)
        {
            return await checkAuth(ctx,
                async function (ctx)
                {
                    return await fb.whoAmI(ctx.data);
                });
        }
    ),


    // /hooks/settings/set-schedule/:category
    // /hooks/settings/set-scheme/:category
    // /hooks/settings/set-holidays



    get('/hooks/override/:category/:value', ctx => jsonHeader, async ctx => await fb.setButtonStatesForAllBindicators(ctx.params.category, ctx.params.value)),

    // get('/papi/test', ctx => jsonHeader, async ctx => await papi.test()),

    // get('/fb/test', ctx => jsonHeader, async ctx => await fb.test()),
    // get('/fb/gbs', ctx => jsonHeader, async ctx => await fb.getButtonState('123456', 'trash')),
    // get('/fb/sbs', ctx => jsonHeader, async ctx => await fb.setButtonState('123456', 'trash')),
    // get('/fb/shbs', ctx => jsonHeader, async ctx => await fb.setHouseholdButtonStates('bakkala_holden', 'trash')),



]);

async function checkAuth(ctx, callback)
{
    const authHeader = ctx.headers.authorization || ctx.headers.Authorization;

    if (!authHeader || !authHeader.startsWith('Basic '))
    {
        console.error("Security check failed. No auth credentials.");
        return { success: false, reason: "Security check failed. No auth credentials." };
    }

    const base64Creds = authHeader.split(' ')[1];
    const creds = Buffer.from(base64Creds, 'base64').toString('utf-8');

    const [username, password] = creds.split(':');

    //   authentication logic  
    if (username === process.env.BASIC_AUTH_USER && password === process.env.BASIC_AUTH_PASSWORD)
    {
        const data = await callback(ctx);
        if (data && data.error)
        {
            console.error("Error with data:", { ...data });
            return { success: false, error: data.error, result: { ...data } };

        }
        return { success: true, result: { ...data } };
    }

    console.error("Security check failed. Invalid credentials.");
    return { success: false, reason: "Security check failed. Invalid credentials." };

};
