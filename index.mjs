import * as fb from './fb.mjs';

import server from 'server';
const { get, post } = server.router;
const { header, render } = server.reply;


const jsonHeader = header('Content-Type', 'application/json');;

// answers to any request
server({ security: { csrf: false } }, [
    get('/', ctx => jsonHeader, ctx => process.env.ENV_TEST),
    get('/privacy-policy', ctx => render('privacy_policy.html')),
    get('/favicon.ico', ctx => jsonHeader, ctx => 'Hello'),

    // device prefs
    post('/hooks/get-bindicator-data', ctx => jsonHeader,
        async function (ctx)
        {
            return await checkAuth(ctx,
                async function (ctx)
                {
                    let obj = { ...ctx.data };

                    if (obj.hasOwnProperty('coreid'))
                    {
                        obj = { photon_id: ctx.data.coreid };
                    }

                    // console.log(obj);

                    return await fb.getBindicatorData(obj);
                });
        }
    ),

    post('/hooks/update-bindicator-data', ctx => jsonHeader,
        async function (ctx)
        {
            return await checkAuth(ctx,
                async function (ctx)
                {
                    return await fb.updateBindicatorData(ctx.data);
                });
        }
    ),

    // global prefs
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

    // holidays
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

    // home-screen
    post('/hooks/get-bindicators-for-household', ctx => jsonHeader,
        async function (ctx)
        {
            const data = typeof ctx.data === 'string' ? JSON.parse(ctx.data) : ctx.data;
            return await fb.getBindicators(data.household_id);
        }
    ),

    // check schedule
    // 
    // cronjob
    // https://console.cron-job.org/jobs/5646139

    post('/hooks/check-schedule', ctx => jsonHeader,
        async function (ctx)
        {
            let isSimple = (ctx.headers['Simple-Response'] || ctx.headers['simple-response']) ?? false;

            return await checkAuth(ctx,
                async function (ctx)
                {
                    return await fb.checkSchedule(isSimple);
                });
        }
    ),

    // provisioning
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


    // buttons

    post('/hooks/set-button-state', ctx => jsonHeader,
        async function (ctx)
        {
            return await checkAuth(ctx,
                async function (ctx)
                {
                    const { category, value } = JSON.parse(atob(ctx.data.data));
                    return await fb.setButtonState({ photon_id: ctx.data.coreid }, category, value);
                });
        }
    ),


    post('/hooks/get-button-states', ctx => jsonHeader,
        async function (ctx)
        {
            return await checkAuth(ctx,
                async function (ctx)
                {
                    return await fb.getButtonStates({ photon_id: ctx.data.coreid });
                });
        }
    ),

    // test
    // get('/hooks/override/:category/:value', ctx => jsonHeader, async ctx => await fb.setButtonStatesForAllBindicators(ctx.params.category, JSON.parse(ctx.params.value))),

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
        return { success: false, error: "API key mismatch.", result: {} };
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
