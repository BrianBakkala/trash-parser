import admin from 'firebase-admin';
import * as calendar from './calendar.mjs';
import * as holden from './holden.mjs';
import * as util from './utility.mjs';
import * as papi from './particle_api.mjs';

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

export async function createBindicator(household, photonId)
{
    await db.collection('bindicators').doc(photonId).set(
        {
            photon_id: photonId,
            household_name: household,
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

export async function onboardBindicator(household, photonId)
{
    return new Promise((resolve, reject) =>
    {
        createBindicator(household, photonId).then(() => resolve());
    });
}




///BUTTON STATES
export async function getButtonState(photonId, category)
{
    return new Promise((resolve, reject) =>
    {
        db.collection('bindicators').doc(photonId).get()
            .then(
                (doc) =>
                {
                    resolve({ state: doc.data()[category + '_on'] });
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
                .then(() => { resolve(); });

        });
    });
}

export async function setButtonStatesForDocumentGroup(docGroup, category, value = null) 
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

export async function setHouseholdButtonStates(household, category, value = null) 
{
    return new Promise(async (resolve, reject) =>
    {
        setButtonStatesForDocumentGroup(

            await db.collection('bindicators').where('household_name', '==', household).get(),

            category,
            value
        ).then(() => resolve());
    });
}

export async function setButtonStatesForAllBindicators(category, value = null) 
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

export async function generateTrashRecycleDays(category, value = null) 
{
    const docGroup = await db.collection('bindicators').get();
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
                if (data.household_name == "bakkala_holden")
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









export function test()
{
    // const hh = "bakkala_northborough";
    // onboardBindicator(hh, "222");

    return parseHolden();
}


