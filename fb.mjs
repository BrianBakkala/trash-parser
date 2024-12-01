import admin from 'firebase-admin';
import * as calendar from './calendar.mjs';
import * as holden from './holden.mjs';
import * as util from './utility.mjs';
import * as papi from './particle_api.mjs';
import * as crypto from 'crypto';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const serviceAccount = require('./config/firebaseServiceAccountKey.json');


const db = await intializeFirebase();  // Firestore instance


async function intializeFirebase()
{
    // Initialize Firebase with the service account key
    await admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
    return await admin.firestore();
}
///ONBOARDING HOOKS

export async function createBindicator(householdId, photonId)
{
    await db.collection('bindicators').doc(photonId).set(
        {
            photon_id: photonId,
            household_id: householdId,
            household_name: "",

            trash_on: false,
            recycle_on: false,

            holidays: {},

            recycle_schedule: "W",
            trash_schedule: "W",

            trash_scheme: "weekly",
            recycle_scheme: "biweekly first"
        }
    );
}

export async function onboardBindicator(householdId, photonId)
{
    return new Promise((resolve, reject) =>
    {
        createBindicator(householdId, photonId)
            .then(() => generateTrashRecycleDays(photonId))
            .then(() => resolve());
    });
}

export async function getBindicators(householdId)
{
    try
    {
        const querySnapshot = await db.collection('bindicators')
            .where('household_id', '==', householdId).get();

        let bindicators = { bindicators: [] };
        let count = 0;
        querySnapshot.forEach((doc) =>
        {
            const data = doc.data();
            bindicators.bindicators.push(data);
            count += 1;
        });

        return { count, ...bindicators };

    }
    catch (error)
    {
        console.error("Error fetching bindicators:", error);
        throw error;
    }
}




///BUTTON STATES
export async function getBindicatorData(photonId)
{
    return await new Promise(async (resolve, reject) =>
    {
        return await db.collection('bindicators').doc(photonId).get()
            .then(
                (doc) =>
                {
                    const data = doc.data();
                    let result;
                    if (!data)
                    {
                        result = { error: "Bindicator not found." };
                    }
                    else
                    {

                        result = {
                            trash_on: data.trash_on,
                            recycle_on: data.recycle_on,
                            household_id: data.household_id,
                        };

                    }
                    resolve(result);
                    return result;
                }
            );
    });
}

export async function getButtonState(photonId, category)
{
    return await new Promise(async (resolve, reject) =>
    {
        return await db.collection('bindicators').doc(photonId).get()
            .then(
                (doc) =>
                {
                    const data = doc.data();
                    const result = { state: data[category + '_on'] };
                    resolve(result);
                    return result;
                }
            );
    });
}

export async function setButtonState(photonId, category, value = null)
{
    return new Promise((resolve, reject) =>
    {
        this.getButtonState(photonId, category).then((state) =>
        {
            if (value == null)
            {
                value = !state.state;
            }

            db.collection('bindicators').doc(photonId).update({ [category + '_on']: value })
                .then(() =>
                {
                    papi.publishParticleEvent("button_state_changed", { photon_id: photonId, category, value });
                    resolve();
                });

        });
    });
}

async function setButtonStatesForDocumentGroup(docGroup, category, value) 
{
    return new Promise(async (resolve, reject) =>
    {
        if (!docGroup.empty)
        {
            // Start a batch  
            const batch = db.batch();

            docGroup.forEach((doc) =>
            {
                if (value == null)
                {
                    value = !doc.data()[category + '_on'];
                }

                batch.update(doc.ref, { [category + '_on']: value });
            });

            // Commit the batch  
            await batch.commit().then(() => { resolve(); });
        }

    });
}

async function setHouseholdButtonStates(household, category, value = null) 
{
    return new Promise(async (resolve, reject) =>
    {
        setButtonStatesForDocumentGroup(

            await db.collection('bindicators').where('household_id', '==', household).get(),

            category,
            value
        ).then(() => resolve());
    });
}

async function setButtonStatesForAllBindicators(category, value = null) 
{
    return new Promise(async (resolve, reject) =>
    {
        setButtonStatesForDocumentGroup(

            await db.collection('bindicators').get(),

            category,
            value
        ).then(() => resolve());
    });
}

export async function generateTrashRecycleDays(bindicator) 
{
    let docGroup;

    if (!bindicator)
    {
        docGroup = await db.collection('bindicators').get();
    }
    else
    {
        docGroup = await db.collection('bindicators').where('__name__', '==', bindicator).get();
    }


    const holdenDB = await holden.display();

    return new Promise(async (resolve, reject) =>
    {
        if (!docGroup.empty)
        {
            // Start a batch  
            const batch = db.batch();

            docGroup.forEach((doc) =>
            {
                const data = doc.data();
                if (data.household_id == "bakkala_holden")
                {
                    batch.update(doc.ref, { trash_days: holdenDB.trash_days, recycle_days: holdenDB.recycling_days });
                }
                else
                {
                    const trashDays = calendar.getDays(data.trash_schedule, data.trash_scheme);
                    const recycleDays = calendar.getDays(data.recycle_schedule, data.recycle_scheme);

                    batch.update(doc.ref, { trash_days: trashDays.days, recycle_days: recycleDays.days });
                }
            });

            // Commit the batch  
            await batch.commit().then(() => { resolve(); });
        }

    });
}

export async function checkSchedule(bindicator)
{
    const d = new Date();
    const tomorrow = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);

    const todayDateString = d.toLocaleDateString('en-CA');
    const tomorrowDateString = tomorrow.toLocaleDateString('en-CA');

    let docGroup;

    if (!bindicator)
    {
        docGroup = await db.collection('bindicators').get();
    }
    else
    {
        docGroup = await db.collection('bindicators').where('__name__', '==', bindicator).get();
    }

    let result = [];

    return await new Promise(async (resolve, reject) =>
    {
        const batch = db.batch();

        docGroup.forEach((doc) =>
        {
            const data = doc.data();

            if (data.trash_days && data.trash_days.includes(todayDateString))
            {
                //trash was this morning, missed it
                result.push({ household: data.household_id, category: "trash", value: false, message: "trash was this morning, missed it" });
                batch.update(doc.ref, { trash_on: false });
            }
            if (data.trash_days && data.trash_days.includes(tomorrowDateString))
            {
                //trash is tomorrow, light up
                result.push({ household: data.household_id, category: "trash", value: true, message: "trash is tomorrow, light up" });
                batch.update(doc.ref, { trash_on: true });
            }

            if (data.recycle_days && data.recycle_days.includes(todayDateString))
            {
                //recycle was this morning, missed it
                result.push({ household: data.household_id, category: "recycle", value: false, message: "recycle was this morning, missed it" });
                batch.update(doc.ref, { recycle_on: false });
            }
            if (data.recycle_days && data.recycle_days.includes(tomorrowDateString))
            {
                //recycle is tomorrow, light up
                result.push({ household: data.household_id, category: "recycle", value: true, message: "recycle is tomorrow, light up" });
                batch.update(doc.ref, { recycle_on: true });
            }

        });

        await batch.commit().then(() => { resolve({ result }); });
        return { result };
    });
}

function uuid()
{
    return crypto.randomUUID();
}



export function test()
{
    // const hh = "bakkala_northborough";
    // onboardBindicator(hh, "222");

    return parseHolden();
}


