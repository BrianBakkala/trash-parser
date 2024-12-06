import admin from 'firebase-admin';
import * as calendar from './calendar.mjs';
import * as holden from './holden.mjs';
import * as util from './utility.mjs';
import * as papi from './particle_api.mjs';
import * as crypto from 'crypto';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const serviceAccount = require('./config/firebaseServiceAccountKey.json');
const VERIFICATION_KEY_DELIMITER = ":: ::";
const IDENTIFICATION_KEYS = ['photon_id', 'monitoring_uuid', 'verification_key']; //sorted by desirability

const db = await intializeFirebase();  // Firestore instance

async function intializeFirebase()
{
    // Initialize Firebase with the service account key
    await admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
    return await admin.firestore();
}
///PROVISIONING/ONBOARDING 

/**
 * Gets the first Firebase document that matches the property in object that matches IDENTIFICATION_KEYS.
 *
 * Example params:
 * {photon_id:"xyz"}
 * {verification_key:"xyz"}
 * {monitoring_uuid:"xyz"}
 * 
 * 
 * @export
 * @param {Object} obj
 * @return {DocumentReference} 
 */
export async function getBindicatorDocument(obj)
{
    const collection = db.collection('bindicators');
    let snapshotStructure;

    for (const key of IDENTIFICATION_KEYS)
    {
        if (obj.hasOwnProperty(key))
        {
            snapshotStructure = collection.where(key, '==', obj[key]);
            break;
        }
    }

    const snapshot = await snapshotStructure.get();

    if (snapshot.docs.length == 1)
    {
        return snapshot.docs[0];
    }

    throw new Error('No matching document found.');
}

export async function addProvisioningBindicator(verificationKey, household_id)
{
    return new Promise(async (resolve, reject) =>
    {
        try
        {
            const { ssid, setup_code } = parseVerificationKey(verificationKey);
            const monitoring_uuid = uuid();

            db.collection('bindicators').doc(verificationKey).set({
                ssid,
                household_id,
                monitoring_uuid,
                setup_code,
                provisioning_status: true
            });

            resolve({ monitoring_uuid });
            return { monitoring_uuid };  // Returning a uuid to monitor for an updated photonID

        } catch (error)
        {
            console.error("Error adding document:", error);
            reject(id);
        }
    });
}

export async function createBindicator(oldDoc, photon_id)
{
    try
    {
        if (!oldDocSnapshot.exists)
        {
            console.log('Old document does not exist!');
            return;
        }

        const oldData = oldDocSnapshot.data();

        // Create a new document with a new ID and copy the data
        const newDocRef = db.collection('bindicators').doc(photon_id);
        await newDocRef.set(
            {
                ...oldData, //copy old data

                photon_id,
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
        console.log('New document created with ID:', photon_id);

        // Delete the old document
        await oldDoc.delete();
        console.log('Old document deleted');

    } catch (error)
    {
        console.error('Error transferring document data:', error);
    }




}

export async function onboardBindicator(docReference, photonId)
{
    return new Promise((resolve, reject) =>
    {
        createBindicator(docReference, photonId)
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



///SCHEDULE
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


///AUTH

export async function whoAmI(data) 
{
    //get data from photon
    console.log(data);
    const verification_key = data.data;
    const photon_id = data.coreid;

    const fbData = await getBindicatorData(photonId);
    if (!fbData.hasOwnProperty("error"))
    {
        //photon is in DB

        return { photon_id };
    }

    //photon is not in DB, find provisioning photon by setupcode and wifi

    const correctDoc = await getBindicatorDocument({ verification_key });
    const data = correctDoc.data();
    onboardBindicator(docReference, photon_id);



    return { dfe: "fef" };
}



///UTIL

function uuid()
{
    return crypto.randomUUID();
}

function createVerificationKey(ssid, setupCode)
{
    return btoa(btoa(ssid) + VERIFICATION_KEY_DELIMITER + btoa(setupCode));
}

function parseVerificationKey(verificationKey)
{
    const [ssid, setup_code] = atob(verificationKey).split(VERIFICATION_KEY_DELIMITER)
        .map(x => atob(x));

    return { ssid, setup_code };
}



export function test()
{
    // const hh = "bakkala_northborough";
    // onboardBindicator(hh, "222");

    return parseHolden();
}


