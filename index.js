const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require("socket.io")(http);

const SocketManager = require("./SocketManager.js")
const Game = require("./Games.js");

class Lobby extends SocketManager {
	constructor() {
		super();
		let games = this.games = [];
		let sandbox = this.sandbox = new Game.Sandbox();

		this.on("newGame", (socket, settings) => this.newGame(settings));
	}

	newGame(settings) {
		let game = new Game[settings.type](settings);
		this.games.push(game);
		this.emitGames();
	}

	getGame(name) {
		return this.games.concat([this.sandbox]).find(
			(game) => game.name == name);
	}

	emitGames(socket = this) {
		socket.emit("games",
			this.games.map((game) => ({
				name: game.name,
				teams: Object.keys(game.teams),
				type: game.type
			})));
	}

	join(socket) {
		super.join(socket);
		this.emitGames(socket);
		this.emit("connectionCount", io.engine.clientsCount);
	}
}


lobby = new Lobby();
/*
lobby.newGame({
	name: "TestGame",
	difficulty: "random",
	type: "OneVsOne",
	teams: ["Klavertjes", "Hartjes", "Schoppen", "Koeken"],
	maxTime: 60
});*/

io.on('connection', function (socket) {
	socket.on("joinLobby", () => {
		lobby.join(socket);
	});

	socket.on("joinGame", (name, teamname) => {
		let game = lobby.getGame(name);
		if(game == null)
			return socket.emit("exception",
				"Spel '"+name+"' kon niet gevonden worden.");
		game.join(teamname, socket);
	});
});

app.use(express.static('static'));

var ipaddress = process.env.OPENSHIFT_NODEJS_IP || "0.0.0.0";
var port = process.env.OPENSHIFT_NODEJS_PORT || +process.argv[2] || 80;

http.listen(port, ipaddress, function () {
	console.log('listening on *:' + port);
});