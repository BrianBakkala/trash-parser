const admin = require('firebase-admin');

// Initialize Firebase with the service account key
const serviceAccount = require('./config/firebaseServiceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();  // Firestore instance

async function createHousehold(household)
{
    await db.collection('households').doc(household).set({ bindicators: [] });
    console.log('Document successfully written!');
}

async function addBindicatorsToHousehold(household, ...photonIds)
{
    const currentBindicators = await db.collection('bindicators').doc(household);
    currentBindicators.forEach(doc =>
    {
        console.log(doc.id, '=>', doc.data());
    });
}

module.exports = {

    test: function ()
    {
        const hh = "bakkala_holden";
        createHousehold(hh);
        addBindicatorsToHousehold(hh, "123", "123");
    }
};
