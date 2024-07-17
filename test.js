const socket = new WebSocket('wss://stream.binance.com/stream');

socket.addEventListener('open', function (event) {
    console.log('Kết nối WSS đã được mở.');

    socket.send(JSON.stringify({ id: 1,
        method: "SUBSCRIBE",
        params: ["!miniTicker@arr@3000ms"],
     }));
});

socket.addEventListener('message', function (event) {
    console.log(JSON.parse(event.data));
});