// const socket = new WebSocket('wss://stream.binance.com/stream');

// socket.addEventListener('open', function (event) {
//     console.log('Kết nối WSS đã được mở.');

//     socket.send(JSON.stringify({ id: 1,
//         method: "SUBSCRIBE",
//         params: ["!miniTicker@arr@3000ms"],
//      }));
// });

// socket.addEventListener('message', function (event) {
//     console.log(JSON.parse(event.data));
// });

const Firestore = require('@google-cloud/firestore');

const db = new Firestore({
    projectId: 'alittledaisy',
    keyFilename: './key.json',
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