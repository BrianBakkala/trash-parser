// endpoint
// https://bindicator-439415.ue.r.appspot.com/

import * as papi from './particle_api.mjs';
import * as fb from './fb.mjs';
import * as hometown from './hometown.mjs';
import * as util from './utility.mjs';

import server from 'server';
const { get, post } = server.router;
const { header } = server.reply;


const jsonHeader = header('Content-Type', 'application/json');;

// Answers to any request
server({ security: { csrf: false } }, [
    get('/', ctx => jsonHeader, ctx => process.env.ENV_TEST),
    get('/favicon.ico', ctx => jsonHeader, ctx => 'Hello'),

    // get('/hometown', ctx => jsonHeader, async ctx => await hometown.display()),
    // get('/hometown/simple', ctx => jsonHeader, async ctx => await hometown.display_simple()),
    // get('/hometown/full/:dow', ctx => jsonHeader, async ctx => await hometown.display(ctx.params.dow)),
    // get('/hometown/simple/:dow', ctx => jsonHeader, async ctx => await hometown.display_simple(ctx.params.dow)),
    get('/test', ctx => jsonHeader, async ctx => { return { success: true, message: "hello there" }; }),
    // get('/test/random', ctx => jsonHeader, async ctx => await hometown.display_test(Math.random() < 0.5, Math.random() < 0.5)),
    // get('/test/:trash/:recycling', ctx => jsonHeader, async ctx => await hometown.display_test(ctx.params.trash, ctx.params.recycling)),


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


    post('/hooks/get-global-settings', ctx => jsonHeader,
        async function (ctx)
        {
            // console.log("#", "Received:", ctx.data);

            return await checkAuth(ctx,
                async function (ctx)
                {
                    return await fb.getGlobalSettings(ctx.data.household_id);
                });
        }
    ),


    post('/hooks/save-settings', ctx => jsonHeader,
        async function (ctx)
        {

            return await checkAuth(ctx,
                async function (ctx)
                {
                    return await fb.saveSettings(ctx.data, 5);
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
    post('/hooks/save-holiday-data', ctx => jsonHeader,
        async function (ctx)
        {

            return await checkAuth(ctx,
                async function (ctx)
                {
                    return await fb.saveHolidayData(ctx.data.device_uuid, ctx.data.selected_holidays);
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

    post('/hooks/check-schedule/:household', ctx => jsonHeader,
        async function (ctx)
        {
            return await checkAuth(ctx,
                async function (ctx)
                {
                    return await fb.checkSchedule(ctx.params.household);
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

    post('/hooks/generate-days/:household', ctx => jsonHeader,
        async function (ctx)
        {
            return await checkAuth(ctx,
                async function (ctx)
                {
                    return await fb.generateTrashRecycleDays(ctx.params.household);
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

    get('/hooks/override/:category/:value', ctx => jsonHeader, async ctx => await fb.setButtonStatesForAllBindicators(ctx.params.category, ctx.params.value)),

]);

async function checkAuth(ctx, callback)
{
    const authHeader = ctx.headers.authorization || ctx.headers.Authorization;

    if (!authHeader || !authHeader.startsWith('Basic '))
    {
        console.error("Security check failed. No auth credentials.");
        return { success: false, reason: "Security check failed. No auth credentials." };
    }

    //get request data
    const base64Creds = authHeader.split(' ')[1];
    const creds = Buffer.from(base64Creds, 'base64').toString('utf-8');
    const [username, password] = creds.split(':');
    const headerAPIKey1 = ctx.headers['API-Key-1'] || ctx.headers['api-key-1'];
    const headerAPIKey2 = ctx.headers['API-Key-2'] || ctx.headers['api-key-2'];


    //fetch "the right answers" from fb
    const apiAuth = await fb.getAPIAuth();

    //authentication logic  
    if (username !== apiAuth.basic_auth_user && password !== apiAuth.basic_auth_password)
    {
        console.error("Security check failed. Invalid credentials.");
        return { success: false, reason: "Security check failed. Invalid credentials." };
    }

    if (headerAPIKey1 != apiAuth.api_key_1 || headerAPIKey2 != apiAuth.api_key_2)
    {
        console.error("API key mismatch.");
        return { success: false, error: data.error, result: { ...data } };
    }

    const data = await callback(ctx);
    if (data && data.error)
    {
        console.error("Error with data:", { ...data });
        return { success: false, error: data.error, result: { ...data } };
    }

    //conquered the gauntlet
    return { success: true, result: { ...data } };

};
