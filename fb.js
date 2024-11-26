require('./utility');
const admin = require('firebase-admin');

// Initialize Firebase with the service account key
const serviceAccount = require('./config/firebaseServiceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();  // Firestore instance

async function createHousehold(household)
{
    await db.collection('households').doc(household).get()
        .then(async (doc) =>
        {
            if (!doc.exists)
            {
                await doc.set({ bindicators: [] });
            }
        });
}

async function addBindicatorsToHousehold(household, ...photonIds)
{
    return new Promise((resolve, reject) =>
    {
        db.collection('households').doc(household).get()
            .then(async (doc) =>
            {
                let bindicators = doc.data().bindicators;
                bindicators.push(...photonIds);
                bindicators = bindicators.unique();

                console.log(bindicators);

                db.collection('households').doc(household).update({ bindicators })
                    .then(() => resolve());
            }

            );
    });

}

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
        Promise.all([
            createHousehold(household),
            addBindicatorsToHousehold(household, photonId),
            createBindicator(household, photonId)
        ])
            .then(() => resolve());
    });
}

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

module.exports = {

    test: function ()
    {
        const hh = "bakkala_holden";
        createHousehold(hh);
        onboardBindicator(hh, "123456");
    }

    , getButtonState, setButtonState
};
