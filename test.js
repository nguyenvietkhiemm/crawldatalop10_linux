const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue, Filter } = require('firebase-admin/firestore');

initializeApp();

const db = getFirestore();

async function writeData() {
    const docRef = db.collection('Student').doc('SBD');
    try {
        await docRef.set({
            first: 'Ada',
            last: 'Lovelace',
            born: 1815
        });
        console.log('Document successfully written!');
    } catch (error) {
        console.error('Error writing document: ', error);
    }
}

writeData();