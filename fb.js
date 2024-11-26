require('./utility');
const admin = require('firebase-admin');
const papi = require('./particle_api');
const calendar = require('./calendar');
const holden = require('./holden.mjs');


// Initialize Firebase with the service account key
const serviceAccount = require('./config/firebaseServiceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();  // Firestore instance

///ONBOARDING HOOKS

async function createBindicator(household, photonId)
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

async function onboardBindicator(household, photonId)
{
    return new Promise((resolve, reject) =>
    {
        createBindicator(household, photonId).then(() => resolve());
    });
}




///BUTTON STATES
async function getButtonState(photonId, category)
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

async function setButtonState(photonId, category, value = null)
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

async function setButtonStatesForDocumentGroup(docGroup, category, value = null) 
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

            await db.collection('bindicators').where('household_name', '==', household).get(),

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

async function parseHolden()
{
    const holdenDB = await holden.display();

    console.log(holdenDB);

    return { resylt: holdenDB };
}

async function generateTrashRecycleDays(category, value = null) 
{
    const docGroup = await db.collection('bindicators').get();


    return new Promise(async (resolve, reject) =>
    {
        if (!docGroup.empty)
        {
            // Start a batch  
            const batch = db.batch();

            docGroup.forEach((doc) =>
            {
                const data = doc.data();
                if (household == "holden_bakkala")
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







module.exports = {

    test: function ()
    {
        // const hh = "bakkala_northborough";
        // onboardBindicator(hh, "222");

        parseHolden();
    },


    getButtonState,
    setButtonState,
    setButtonStatesForAllBindicators,
    setHouseholdButtonStates,
    generateTrashRecycleDays,
};
