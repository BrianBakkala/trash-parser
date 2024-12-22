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

const db = await intializeFirebase();  //Firestore instance

async function intializeFirebase()
{
    // Initialize Firebase with the service account key
    await admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });

    const instance = await admin.firestore();
    if (!!instance)
    {
        console.log("#", "Login to Firebase successful.");
        return instance;
    }
    console.error("#", "Login to Firebase failed.");


}

var particleToken = await papi.particleAuth(); //particle connection





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

    throw new Error('No matching document found or multiple matches for key:' + JSON.stringify(obj));
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
        return await db.collection('households').doc();
    }

    throw new Error('No matching document found or multiple matches for key.');
}

async function getAllHouseholdIds()
{
    try
    {
        const uniqueHouseholdIds = new Set();

        const householdsSnapshot = await db.collection('households').get();

        householdsSnapshot.forEach(doc =>
        {
            const householdId = doc.data().household_id;
            if (householdId)
            {
                uniqueHouseholdIds.add(householdId);
            }
        });

        const uniqueHouseholdIdList = Array.from(uniqueHouseholdIds);

        return uniqueHouseholdIdList;
    } catch (error)
    {
        console.error('Error getting unique household IDs:', error);
    }
}


export async function addProvisioningBindicator(verification_key, household_id)
{
    return new Promise(async (resolve, reject) =>
    {
        try
        {
            const { setup_code, ssid } = parseVerificationKey(verification_key);
            const monitoring_uuid = uuid();

            const bDocRef = await getBindicatorDocument({ verification_key }, true);

            bDocRef.set({
                household_id,
                monitoring_uuid,
                verification_key,
                provisioning_status: true,
            }, { merge: true });

            const hDocRef = await getHouseholdDocument(household_id, true);

            const wifeWifi = process.env.WIFE_WIFI;

            hDocRef.set({
                household_id,
                household_name: "",

                wife: (ssid == wifeWifi),

                holidays: [],

                recycle_schedule: "W",
                trash_schedule: "W",

                trash_scheme: "weekly",
                recycle_scheme: "biweekly first"


            }, { merge: true }).then(() => generateTrashRecycleDays(household_id));

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

                bindicator_name: "My Bindicator",

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

export async function onboardBindicator(bindicatorDoc, photonId)
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
    const snap = await getHouseholdDocument(householdId);
    const householdDoc = await snap.get();


    const adjustBiweeklyScheme = (scheme, startOption) =>
    {
        if (scheme.startsWith("biweekly"))
        {
            const schemeWeek = getBiweeklyScheme(startOption);
            return 'biweekly ' + schemeWeek;
        }
        return scheme;
    };

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
        let recycle_scheme = adjustBiweeklyScheme(settingsData.recycle_scheme, settingsData.recycle_start_option);

        const trashDaysRaw = calendar.getDays(settingsData.trash_day, trash_scheme, holidays).days;
        const recycleDaysRaw = calendar.getDays(settingsData.recycle_day, recycle_scheme, holidays).days;

        //save settings

        if (!settingsData.wife)
        {

            getHouseholdDocument(householdId)
                .then((snap) =>
                {
                    return snap.get(); // Get the document snapshot
                })
                .then((doc) =>
                {
                    // Update the document directly using doc.ref
                    return doc.ref.update({
                        trash_schedule: settingsData.trash_day,
                        recycle_schedule: settingsData.recycle_day,
                        trash_scheme,
                        recycle_scheme,
                        recycle_days: recycleDaysRaw,
                        trash_days: trashDaysRaw
                    });
                })
                .then(() => checkSchedule(false, householdId, true))
                .catch((error) =>
                {
                    console.error("Error updating household document:", error);
                });


            console.log("#", "Settings saved.");
        }

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
        let currentHolidays = {};

        try
        {
            currentHolidays = await getHouseholdDocument(householdId).then(async (snap) =>
            {
                const householdDoc = await snap.get();
                const hhData = householdDoc.data();

                return { holidays: (!hhData.holidays ? [] : hhData.holidays), wife: hhData.wife };

            });

        }
        catch (error)
        {

            reject("Error getting document.");
            return { success: false, error: "Error getting document." };
        }

        const refreshed = refreshHolidayArray(currentHolidays.holidays, false);

        resolve({ wife: currentHolidays.wife, holidays: [...Object.values(refreshed)] });
        return result;
    });
}

function getSimplifiedHolidaysArray(holidays)
{
    return Object.values(holidays)
        .filter(x => x.is_selected)
        .map(x => x.datestamps)
        .flat(1);
}

function refreshHolidayArray(currentHolidaysArray, simple = true)
{
    let result = { ...calendar.getHolidaysDatabase() };

    if (currentHolidaysArray.length > 0)
    {
        for (let holidayName of Object.keys(result))
        {
            const entry = result[holidayName];

            if (haveCommonElement(entry.datestamps, currentHolidaysArray))
            {
                result[holidayName].is_selected = true;
            }
        }
    }

    return simple ? getSimplifiedHolidaysArray(result) : result;
}

async function getHolidaysSimple(householdId)
{
    const data = await getHolidayData(householdId);
    return getSimplifiedHolidaysArray(data.holidays);
}

export async function saveHolidayData(householdId, holidayNames)
{
    const newDatestamps = getSimplifiedHolidaysArray(calendar.getHolidaysDatabase());

    const snap = await getHouseholdDocument(householdId);
    await snap.update({ holidays: newDatestamps });

    console.log("#", "Holidays saved.");
}





///BUTTON STATES
export async function getBindicatorData(identificationKeyObj)
{
    try
    {
        const doc = await getBindicatorDocument(identificationKeyObj);

        return await doc.get().then((doc) =>
        {
            const data = doc.data();

            if (!data)
            {
                return { error: "Bindicator not found." };
            }

            return data;

        });

    } catch (error)
    {
        console.error("Error fetching bindicator data:", error);
        throw new Error("Unable to retrieve bindicator data.");
    }
}
export async function updateBindicatorData(dataObj)
{

    const key = IDENTIFICATION_KEYS.find(k => dataObj.hasOwnProperty(k));
    if (!key)
    {
        throw new Error('No valid identification key found in the object.');
    }

    const identificationKeyObj = { [key]: dataObj[key] };

    const buttonStateKeys = ['trash_on', 'recycle_on'];
    const bDocRef = await getBindicatorDocument(identificationKeyObj);

    try
    {
        const batch = db.batch();
        await bDocRef.get()
            .then((doc) =>
            {
                const docData = doc.data();

                for (const [key, value] of Object.entries(dataObj))
                {
                    if (buttonStateKeys.includes(key))
                    {
                        let category = key.split("_on")[0];
                        const household_id = doc.data().household_id;

                        publishButtonPressEvent(household_id, category, value, { ...doc.data(), ...identificationKeyObj });
                    }

                    batch.update(bDocRef, { [key]: value });

                }
            });
        await batch.commit(); //commit all updates at once

    } catch (error)
    {
        console.error("Error fetching bindicator data:", error);
        throw new Error("Unable to update bindicator data.");
    }
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
export async function getButtonStates(identificationKeyObj)
{
    const docRef = await getBindicatorDocument(identificationKeyObj);

    return await new Promise(async (resolve, reject) =>
    {
        return await docRef.get()
            .then(
                (doc) =>
                {
                    const data = doc.data();
                    const result = { trash_on: data.trash_on, recycle_on: data.recycle_on };
                    // console.log(result);
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
        let updateValuePromise;

        if (value == null)
        {
            updateValuePromise = this.getButtonState(identificationKeyObj, category).then((state) =>
            {
                return !state.state;
            });
        } else
        {
            updateValuePromise = Promise.resolve(value); //it's fine, insta-send
        }

        updateValuePromise.then((resolvedValue) =>
        {
            docRef.get()
                .then((doc) =>
                {
                    const household_id = doc.data().household_id;
                    publishButtonPressEvent(household_id, category, value, { ...doc.data(), ...identificationKeyObj });
                });

            docRef.update({ [category + '_on']: resolvedValue })
                .then(() =>
                {
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
                const docData = doc.data();

                if (value == null)
                {
                    value = !docData()[category + '_on'];
                }

                batch.update(doc.ref, { [category + '_on']: value });

                //publish particle event outside scope
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
        ).then(() =>
        {
            publishButtonPressEvent(household, category, value);
            resolve();
        });
    });
}

export async function setButtonStatesForAllBindicators(category, value = null)
{
    const householdIDs = await getAllHouseholdIds();
    const hhPromises = householdIDs.map(hhid =>
        setHouseholdButtonStates(hhid, category, value)
    );

    //wait for all the promises to resolve
    await Promise.all(hhPromises);
}

async function publishButtonPressEvent(household_id, category, value, relevantData = {})
{
    const procedure = (token) =>
    {
        papi.publishParticleEvent(token,

            "button_state_changed/" + household_id,

            {
                ...getMaximumIdentifier({ ...relevantData }),
                household_id, category, value
            }
        );
    };

    try
    {
        procedure(particleToken);
    } catch (error)
    {
        console.log("#", "API request failed:" + error);

        try
        {
            console.log("#", "Refreshing token.");
            const newToken = await papi.particleAuth(true);
            particleToken = newToken;

            procedure(newToken);

        } catch (error)
        {
            console.log("#", "API request double failed:" + error);
        }
    }

}



///SCHEDULE
export async function generateTrashRecycleDays(householdId)
{
    try
    {
        let snap;

        //fetch documents
        if (!householdId)
        {
            snap = db.collection('households');
        } else
        {
            snap = db.collection('households').where('household_id', '==', householdId);
        }

        const docGroup = await snap.get();

        if (docGroup.empty)
        {
            console.log("No documents found.");
            return;
        }

        const hometownDB = await hometown.display();

        // Start a batch
        const batch = db.batch();

        for (let i = 0; i < docGroup.docs.length; i++)
        {
            const doc = docGroup.docs[i]; //   individual doc
            const data = doc.data();
            const holidaysSimple = await getHolidaysSimple(data.household_id);

            if (data.wife)
            {
                //don't add to batch, update directly
                await doc.ref.update({
                    trash_scheme: hometownDB.trash_scheme,
                    recycle_scheme: hometownDB.recycle_scheme,

                    recycle_schedule: hometownDB.day_of_week,
                    trash_schedule: hometownDB.day_of_week,

                    trash_days: hometownDB.trash_days,
                    recycle_days: hometownDB.recycling_days,

                    holidays: hometownDB.holidays
                });

                //refresh holidays across multiple years using data just updated above
                const updatedHolidays = refreshHolidayArray(hometownDB.holidays);

                batch.set(doc.ref, { holidays: updatedHolidays }, { merge: true });


            } else
            {
                const trashDays = calendar.getDays(data.trash_schedule, data.trash_scheme, data.holidays);
                const recycleDays = calendar.getDays(data.recycle_schedule, data.recycle_scheme, data.holidays);


                //refresh holidays
                batch.set(doc.ref, { holidays: holidaysSimple }, { merge: true });
                batch.set(doc.ref, { trash_days: trashDays.days, recycle_days: recycleDays.days }, { merge: true });
            }
        }

        // Commit the batch
        await batch.commit();
        console.log("#", "Trash and recycle days generated.");
    } catch (error)
    {
        console.error("Error generating trash and recycle days:", error);
    }
}


/**
 * Optimally cronjobbed to run at noon every day
 *
 * @export
 * @param {*} bindicatorPhotonId
 * @return {*} 
 */
export async function checkSchedule(simpleResponse, householdId, resetButtonStates = false)
{
    let result = [];
    const d = new Date();
    const tomorrow = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);

    const todayDateString = d.toLocaleDateString('en-CA');
    const tomorrowDateString = tomorrow.toLocaleDateString('en-CA');

    let docGroup;

    if (!householdId)
    {
        docGroup = await db.collection('households').get();
    }
    else
    {
        docGroup = await db.collection('households').where('household_id', '==', householdId).get();
    }

    return await new Promise(async (resolve, reject) =>
    {

        docGroup.forEach((doc) =>
        {
            const data = doc.data();

            //in case no hhid was specified, get hhid from individual doc
            householdId = householdId ? householdId : data.household_id;

            if (lightShouldTurnOn(data.trash_days, todayDateString, tomorrowDateString))
            {
                result.push({ householdId, trash_on: true });
                setHouseholdButtonStates(householdId, "trash", true);
            }
            if (lightShouldTurnOn(data.recycle_days, todayDateString, tomorrowDateString))
            {
                result.push({ householdId, recycle_on: true });
                setHouseholdButtonStates(householdId, "recycle", true);
            }

            if (resetButtonStates || lightShouldTurnOff(data.trash_days, todayDateString, tomorrowDateString))
            {
                result.push({ householdId, trash_on: false });
                setHouseholdButtonStates(householdId, "trash", false);
            }
            if (resetButtonStates || lightShouldTurnOff(data.recycle_days, todayDateString, tomorrowDateString))
            {
                result.push({ householdId, recycle_on: false });
                setHouseholdButtonStates(householdId, "recycle", false);
            }

        });

        console.log("#", "Schedule checked.");
        resolve({ result });
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
        console.log("#", "Photon not found, create new instead. --", photon_id);

    }

    const bindicatorDoc = await getBindicatorDocument({ verification_key });


    const doc = await bindicatorDoc.get();
    const data = doc.data();


    await getHouseholdDocument(data.household_id).then((householdDoc) =>
    {
        onboardBindicator(bindicatorDoc, photon_id);
        console.log("#", "Successfully contacted photon:", photon_id);
        return { photon_id };
    });




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
    const [setup_code, ssid] = atob(verificationKey).split(VERIFICATION_KEY_DELIMITER)
        .map(x => atob(x));

    return { ssid, setup_code };
}

function haveCommonElement(array1, array2)
{
    const set1 = new Set(array1);
    return array2.some(element => set1.has(element));
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

function getWeekNumber(date)
{
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const daysSinceStartOfYear = Math.floor((date - startOfYear) / (1000 * 60 * 60 * 24));
    const weekNumber = Math.ceil((daysSinceStartOfYear + startOfYear.getDay() + 1) / 7);
    return weekNumber;
}

function getBiweeklyScheme(thisNextInput)
{
    const currentWeek = getWeekNumber(new Date());
    const nextWeek = currentWeek + 1;

    if (
        (thisNextInput === "this" && currentWeek % 2 == 0) ||
        (thisNextInput === "next" && nextWeek % 2 == 0)
    )
    {
        return "first";
    }

    return "second";
}

function getMaximumIdentifier(jsonObject)
{
    return Object.keys(jsonObject)
        .filter(key => IDENTIFICATION_KEYS.includes(key))
        .reduce((filteredObj, key) =>
        {
            filteredObj[key] = jsonObject[key];
            return filteredObj;
        }, {});

}