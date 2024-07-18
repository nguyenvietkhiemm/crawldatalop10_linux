const Firestore = require('@google-cloud/firestore');

const db = new Firestore({
    projectId: 'alittledaisydiemthivao10',
// keyFilename: './key.json',
});

async function writeData() {
    const docRef = db.collection('Student').doc('SBD');
    try{
        await docRef.set({
            first: 'Ada',
            last: 'Lovelace',
            born: 1815
        });
    }
    catch(error){
        console.error('Error writing document: ', error);
    }
}

writeData();