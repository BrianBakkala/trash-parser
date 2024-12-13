import admin from 'firebase-admin';
import * as calendar from './calendar.mjs';
import * as hometown from './hometown.mjs';
import * as util from './utility.mjs';
import * as papi from './particle_api.mjs';
import * as crypto from 'crypto';

import { createRequire } from 'module';
import { DocumentReference } from 'firebase-admin/firestore';
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
export async function getBindicatorDocument(obj, forceNewDoc = false)
{
    const collection = db.collection('bindicators');

    const key = IDENTIFICATION_KEYS.find(k => obj.hasOwnProperty(k));
    if (!key)
    {
        throw new Error('No valid identification key found in the object.');
    }

    const snapshot = await collection.where(key, '==', obj[key]).get();

    if (snapshot.docs.length === 1)
    {
        return snapshot.docs[0].ref; // Return the DocumentReference directly
    }

    if (forceNewDoc)
    {
        return db.collection('bindicators').doc();
    }

    throw new Error('No matching document found or multiple matches.');
}

export async function getHouseholdDocument(householdId, forceNewDoc = false)
{
    const collection = db.collection('households');

    const snapshot = await collection.where('household_id', '==', householdId).get();

    if (snapshot.docs.length === 1)
    {
        return snapshot.docs[0].ref; // Return the DocumentReference directly
    }

    if (forceNewDoc)
    {
        return db.collection('households').doc();
    }

    throw new Error('No matching document found or multiple matches.');
}


export async function addProvisioningBindicator(verification_key, household_id)
{
    return new Promise(async (resolve, reject) =>
    {
        try
        {
            // const { ssid, setup_code } = parseVerificationKey(verification_key);
            const monitoring_uuid = uuid();

            const bDocRef = await getBindicatorDocument({ verification_key }, true);

            bDocRef.set({
                household_id,
                monitoring_uuid,
                verification_key,
                provisioning_status: true
            });

            const hDocRef = await getHouseholdDocument(household_id, true);

            hDocRef.set({


                household_id,
                household_name: "",


                holidays: {},

                recycle_schedule: "W",
                trash_schedule: "W",

                trash_scheme: "weekly",
                recycle_scheme: "biweekly first"


            }, { merge: true }).then(() => generateTrashRecycleDays(hDocRef));

            resolve({ monitoring_uuid });
            return { monitoring_uuid };  // Returning a uuid to monitor for an updated photonID

        } catch (error)
        {
            console.error("Error adding document:", error);
            reject();
        }
    });
}
/**
 * Sets up a provisioning Bindicator with the correct new properties.
 *
 * @export
 * @param {DocumentReference} docReference
 * @param {String} photon_id
 */
export async function createBindicator(docReference, photon_id)
{
    try
    {
        await docReference.update(
            {
                provisioning_status: false,

                bindicator_name: "My BBBBB",

                photon_id,

                trash_on: false,
                recycle_on: false,

            }
        );

        console.log("#", "Bindicator created.");


    } catch (error)
    {
        console.error('Error transferring document data:', error);
    }

}

export async function onboardBindicator(bindicatorDoc, householdDoc, householdId, photonId)
{
    console.log("#", "Onboarding Bindicator...");

    return new Promise((resolve, reject) =>
    {
        createBindicator(bindicatorDoc, photonId)

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

export async function getGlobalSettings(householdId)
{
    const householdDoc = await getHouseholdDocument(householdId).get();

    return await new Promise(async (resolve, reject) =>
    {
        const data = householdDoc.data();
        let result;
        if (!data)
        {
            result = { error: "Bindicator not found." };
        }
        else
        {
            result = data;
        }

        resolve(result);
        return result;

    });
}

export async function saveSettings(settingsData, numResults = 5)
{
    function getBiweeklyScheme(weekInput)
    {

        function getWeekNumber(date)
        {
            const startOfYear = new Date(date.getFullYear(), 0, 1);
            const daysSinceStartOfYear = Math.floor((date - startOfYear) / (1000 * 60 * 60 * 24));
            const weekNumber = Math.ceil((daysSinceStartOfYear + startOfYear.getDay() + 1) / 7);
            return weekNumber;
        }

        // get current and next week numbers
        const currentWeek = getWeekNumber(new Date());
        const nextWeek = currentWeek + 1;

        if (
            (weekInput === 'this' && currentWeek % 2 == 0) ||
            (weekInput === 'next' && nextWeek % 2 == 0)
        )
        {
            return 'first';
        }

        return 'second';
    }

    return await new Promise(async (resolve, reject) =>
    {
        let result;
        const householdId = settingsData.device_uuid;

        const holidays = await getHolidaysSimple(householdId);

        const getFormattedDays = (daysArray, numResults) =>
        {
            return daysArray.slice(0, numResults)
                .map(x => calendar.naturalDate(x, true));
        };

        const adjustBiweeklyScheme = (scheme, startOption) =>
        {
            if (scheme.startsWith("biweekly"))
            {
                const schemeWeek = getBiweeklyScheme(startOption);
                return 'biweekly ' + schemeWeek;
            }
            return scheme;
        };

        let trash_scheme = adjustBiweeklyScheme(settingsData.trash_scheme, settingsData.trash_start_option);
        let recycle_scheme = adjustBiweeklyScheme(settingsData.recycle_scheme, settingsData.trash_start_option);

        const trashDaysRaw = calendar.getDays(settingsData.trash_day, trash_scheme, holidays).days;
        const recycleDaysRaw = calendar.getDays(settingsData.recycle_day, recycle_scheme, holidays).days;

        //save settings

        const docGroup = await db.getHouseholdDocument(householdId).get();
        docGroup.update(doc.ref, {

            trash_schedule: settingsData.trash_day,
            recycle_schedule: settingsData.recycle_day,

            trash_scheme,
            recycle_scheme,

            recycle_days: recycleDaysRaw,
            trash_days: trashDaysRaw

        }).then(() => checkSchedule(householdId, true));


        console.log("#", "Settings saved.");

        //return preview days for app
        const trash_days = getFormattedDays(trashDaysRaw, numResults);
        const recycle_days = getFormattedDays(recycleDaysRaw, numResults);

        result = { trash_days, recycle_days };

        resolve(result);
        return result;
    });
}


export async function getHolidayData(householdId)
{
    return new Promise(async (resolve, reject) =>
    {
        let result;
        let currentHolidays = [];

        try
        {
            const householdDoc = await db.getHouseholdDocument(householdId).get();
            const hhData = householdDoc.data();

            if (!hhData.holidays)
            {
                currentHolidays = [];
            }
            else
            {
                currentHolidays = hhData.holidays;
            }

        } catch (error)
        {

            reject({ success: false, error: "Error getting document." });
            return { success: false, error: "Error getting document." };
        }

        result = calendar.getHolidaysDatabase();

        if (currentHolidays.length > 0)
        {
            for (let holidayName of Object.keys(result))
            {
                const entry = result[holidayName];
                if (haveCommonElement(entry.datestamps, currentHolidays))
                {
                    result[holidayName].is_selected = true;
                }
            }

        }

        resolve({ holidays: [...Object.values(result)] });
        return result;
    });
}

async function getHolidaysSimple(householdId)
{
    const data = await getHolidayData(householdId);

    return Object.values(data.holidays)
        .filter(x => x.is_selected)
        .map(x => x.datestamps)
        .flat(1);
}

export async function saveHolidayData(householdId, holidayNames)
{
    const newDatestamps = Object.values(calendar.getHolidaysDatabase())
        .filter(x => holidayNames.includes(x.name))
        .map(x => x.datestamps)
        .flat(1);

    const householdDoc = await db.getHouseholdDocument(householdId).get();
    householdDoc.update(doc.ref, { holidays: newDatestamps });

    console.log("#", "Holidays saved.");
}





///BUTTON STATES
export async function getBindicatorData(identificationKeyObj)
{
    const docRef = await getBindicatorDocument(identificationKeyObj);

    return await new Promise(async (resolve, reject) =>
    {
        return await docRef.get()
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


export async function getButtonState(identificationKeyObj, category)
{
    const docRef = await getBindicatorDocument(identificationKeyObj);

    return await new Promise(async (resolve, reject) =>
    {
        return await docRef.get()
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

export async function setButtonState(identificationKeyObj, category, value = null)
{
    const docRef = await getBindicatorDocument(identificationKeyObj);

    return new Promise((resolve, reject) =>
    {
        this.getButtonState(identificationKeyObj, category).then((state) =>
        {
            if (value == null)
            {
                value = !state.state;
            }

            docRef.update({ [category + '_on']: value })
                .then(() =>
                {
                    papi.publishParticleEvent("button_state_changed", { ...identificationKeyObj, category, value });
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
export async function generateTrashRecycleDays(householdDoc) 
{
    let docGroup;

    if (!householdDoc)
    {
        docGroup = await db.collection('households').get();
    }
    else
    {
        docGroup = await householdDoc.get();
    }

    const hometownDB = await hometown.display();

    return new Promise(async (resolve, reject) =>
    {
        if (!docGroup.empty)
        {
            // Start a batch  
            const batch = db.batch();

            docGroup.forEach((doc) =>
            {
                const data = doc.data();
                if (data.household_id == "bakkala_hometown")
                {
                    batch.update(doc.ref, { trash_days: hometownDB.trash_days, recycle_days: hometownDB.recycling_days });
                }
                else
                {
                    const trashDays = calendar.getDays(data.trash_schedule, data.trash_scheme, data.holidays);
                    const recycleDays = calendar.getDays(data.recycle_schedule, data.recycle_scheme, data.holidays);

                    batch.update(doc.ref, { holidays: getHolidaysSimple(data.household_id) });
                    batch.update(doc.ref, { trash_days: trashDays.days, recycle_days: recycleDays.days });
                }
            });

            // Commit the batch  
            console.log("#", "Trash and recycle days generated.");
            await batch.commit().then(() => { resolve(); });
        }

    });
}

/**
 * Optimally cronjobbed to run at noon every day
 *
 * @export
 * @param {*} bindicatorPhotonId
 * @return {*} 
 */
export async function checkSchedule(householdId, resetButtonStates = false)
{
    let result = [];
    const d = new Date();
    const tomorrow = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);

    const todayDateString = d.toLocaleDateString('en-CA');
    const tomorrowDateString = tomorrow.toLocaleDateString('en-CA');

    let docGroup;

    if (!householdId)
    {
        docGroup = await db.collection('bindicators').get();
    }
    else
    {
        docGroup = await db.collection('bindicators').where('household_id', '==', householdId).get();
    }

    return await new Promise(async (resolve, reject) =>
    {
        const batch = db.batch();

        docGroup.forEach((doc) =>
        {
            const data = doc.data();

            if (lightShouldTurnOn(data.trash_days, todayDateString, tomorrowDateString))
            {
                result.push({ householdId, trash_on: true });
                batch.update(doc.ref, { trash_on: true });
            }
            if (lightShouldTurnOn(data.recycle_days, todayDateString, tomorrowDateString))
            {
                result.push({ householdId, recycle_on: true });
                batch.update(doc.ref, { recycle_on: true });
            }

            if (resetButtonStates || lightShouldTurnOff(data.trash_days, todayDateString, tomorrowDateString))
            {
                result.push({ householdId, trash_on: false });
                batch.update(doc.ref, { trash_on: false });
            }
            if (resetButtonStates || lightShouldTurnOff(data.recycle_days, todayDateString, tomorrowDateString))
            {
                result.push({ householdId, recycle_on: false });
                batch.update(doc.ref, { recycle_on: false });
            }

        });

        await batch.commit();

        console.log("#", "Schedule checked.");
        return { result };
    });
}



function lightShouldTurnOn(daysArray, todayDate, tomorrowDate)
{
    if (isBefore("11:59"))
    {
        return daysArray?.includes(todayDate) || false;
    }
    else if (isAfter("16:00"))
    {
        return daysArray?.includes(tomorrowDate) || false;
    }

    return false;
}

function lightShouldTurnOff(daysArray, todayDate, tomorrowDate)
{
    if (isAfter("11:59"))
    {
        return daysArray?.includes(todayDate) || false;
    }

    return false;
}




///AUTH

export async function whoAmI(photonData) 
{
    //get data from photon
    const verification_key = photonData.data;
    const photon_id = photonData.coreid;

    try
    {
        const fbData = await getBindicatorData({ photon_id });
        return fbData;

    } catch (error)
    {
        //proper photon with photon_id is not in DB, find provisioning photon instead
    }

    const bindicatorDoc = await getBindicatorDocument({ verification_key });
    const doc = await bindicatorDoc.get();
    const data = doc.data();


    const householdDoc = await getHouseholdDocument(data.household_id);

    onboardBindicator(bindicatorDoc, householdDoc, data.household_id, photon_id);
    return { photon_id };


}

export async function getAPIAuth()
{
    const doc = await db.collection('api_auth').doc('auth').get();
    return doc.data();
}


///UTIL

function uuid()
{
    return crypto.randomUUID();
}

function createVerificationKey(ssid, setupCode)
{
    return btoa(btoa(setupCode.toLowerCase()) + VERIFICATION_KEY_DELIMITER + btoa(ssid));
}

function parseVerificationKey(verificationKey)
{
    const [ssid, setup_code] = atob(verificationKey).split(VERIFICATION_KEY_DELIMITER)
        .map(x => atob(x));

    return { ssid, setup_code };
}

function haveCommonElement(array1, array2)
{
    const set1 = new Set(array1);
    return array2.some(element => set1.has(element));
}


export function test()
{
    // const hh = "bakkala_northborough";
    // onboardBindicator(hh, "222");

    return parsehometown();
}


function isBefore(time)
{
    // Get the current time
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();

    // Parse the input time
    const [inputHours, inputMinutes] = time.split(":").map(Number);

    // Compare current time with the input time
    if (currentHours < inputHours || (currentHours === inputHours && currentMinutes < inputMinutes))
    {
        return true;
    }
    return false;
}

function isAfter(time)
{
    // Get the current time
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();

    // Parse the input time
    const [inputHours, inputMinutes] = time.split(":").map(Number);

    // Compare current time with the input time
    if (currentHours > inputHours || (currentHours === inputHours && currentMinutes > inputMinutes))
    {
        return true;
    }
    return false;
}