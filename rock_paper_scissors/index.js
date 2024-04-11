const e = require('express');
const express = require('express');
const app = express();
const http = require('http');
const path = require('path');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

const rooms = {};

app.use(express.static(path.join(__dirname, 'client')));

app.get('/healthcheck', (req, res) => {
    res.send('<h1>RPS App running...</h1>');
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/client/index.html');
});

io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });

    socket.on('createGame', () => {
        const roomUniqueId = makeid(6);
        rooms[roomUniqueId] = {scores:{player1:0,player2:0}};
        socket.join(roomUniqueId);
        socket.emit("newGame", {roomUniqueId: roomUniqueId})
    });
    socket.on('player1Scores', (data) => {
        if (rooms[data.roomUniqueId]) {
            rooms[data.roomUniqueId].scores.player1++;
            io.to(data.roomUniqueId).emit('updateScores', rooms[data.roomUniqueId].scores);
        }
    });
    
    socket.on('player2Scores', (data) => {
        if (rooms[data.roomUniqueId]) {
            rooms[data.roomUniqueId].scores.player2++;
            io.to(data.roomUniqueId).emit('updateScores', rooms[data.roomUniqueId].scores);
        }
    });
    socket.on('joinGame', (data) => {
        if(rooms[data.roomUniqueId] != null) {
            socket.join(data.roomUniqueId);
            socket.to(data.roomUniqueId).emit("playersConnected", {});
            socket.emit("playersConnected");
        }
    })

    socket.on("p1Choice",(data)=>{
        let rpsValue = data.rpsValue;
        rooms[data.roomUniqueId].p1Choice = rpsValue;
        socket.to(data.roomUniqueId).emit("p1Choice",{rpsValue : data.rpsValue});
        if(rooms[data.roomUniqueId].p2Choice != null) {
            declareWinner(data.roomUniqueId);
        }
    });

    socket.on("p2Choice",(data)=>{
        let rpsValue = data.rpsValue;
        rooms[data.roomUniqueId].p2Choice = rpsValue;
        socket.to(data.roomUniqueId).emit("p2Choice",{rpsValue : data.rpsValue});
        if(rooms[data.roomUniqueId].p1Choice != null) {
            declareWinner(data.roomUniqueId);
        }
    });
});

function declareWinner(roomUniqueId) {
    let p1Choice = rooms[roomUniqueId].p1Choice;
    let p2Choice = rooms[roomUniqueId].p2Choice;
    let winner = null;
    if (p1Choice === p2Choice) {
        winner = "d";
    } else if (p1Choice == "Paper") {
        if (p2Choice == "Scissor") {
            winner = "p2";
        } else {
            winner = "p1";
        }
    } else if (p1Choice == "Rock") {
        if (p2Choice == "Paper") {
            winner = "p2";
        } else {
            winner = "p1";
        }
    } else if (p1Choice == "Scissor") {
        if (p2Choice == "Rock") {
            winner = "p2";
        } else {
            winner = "p1";
        }
    }
    io.sockets.to(roomUniqueId).emit("result", {
        winner: winner
    });
    rooms[roomUniqueId].p1Choice = null;
    rooms[roomUniqueId].p2Choice = null;
    if(winner ==="p1"){
        rooms[roomUniqueId].scores.player1++;
    }else if(winner === "p2"){
        rooms[roomUniqueId].scores.player2++;
    }
    io.to(roomUniqueId).emit('updateScores', rooms[roomUniqueId].scores);
    if(winner){
        setTimeout(()=>{
            rooms[roomUniqueId].p1Choice = null;
            rooms[roomUniqueId].p2Choice = null;
            io.to(roomUniqueId).emit('newGame2');
            
        }, 1000);
    }
}

server.listen(3000, () => {
    console.log('listening on *:3000');
});

function makeid(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}