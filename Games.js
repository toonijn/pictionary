const SocketManager = require("./SocketManager.js");
const Drawing = require("./Drawing.js");
const words = require("./words.js");

class Team extends SocketManager {
	constructor(game, name) {
		super();
		this.game = game;
		this.name = name;
		this.drawing = true;

		let draw = (f) => {
			return (socket, ...args) => {
				if(this.drawing) {
					let drawing = this.game.drawing;
					return drawing[f].apply(drawing, args);
				}
			}
		}

		["draw", "clear", "load", "save", "undo"].forEach((e) => {
			this.on(e, draw(e));
		});
	}
}

class Game extends SocketManager {
	constructor(name, teamnames) {
		super();
		this.type = this.constructor.name;
		this.name = name;
		let teams = this.teams = {};
		teamnames.forEach((n) => 
			teams[n] = new Team(this, n));
	}

	emit(event, data) {
		super.emit(event, data);
		Object.values(this.teams).forEach((team) => {
			team.emit(event, data);
		});
	}

	join(teamname, socket) {
		if(!teamname)
			super.join(socket);
		else {
			let team = this.teams[teamname];
			if(team == null)
				return console.log(teamname + " does not exist.");
			team.join(socket);
		}

		socket.emit("gameSettings", this.gameSettings());
		this.emitProgress(socket);
		if(this.drawing != null)
			socket.emit("drawing", this.drawing.drawing);
	}

	addDrawing() {
		let drawing = this.drawing = new Drawing();
		drawing.on("changed", (d) => this.emit("drawing", d));
		drawing.on("point", (p) => this.emit("draw", p));
		drawing.on("exception", (...args) => this.emit("exception", ...args));
	}

	gameSettings() {
		return {
			type: this.constructor.name,
			teams: Object.keys(this.teams)
		};
	}

	gameProgress() {
		return {};
	}

	emitProgress(socket = this) {
		socket.emit("gameProgress", this.gameProgress());
	}
}

class Sandbox extends Game {
	constructor() {
		super("sandbox", ["all"]);

		this.addDrawing();
	}

	join(teamname, socket) {
		super.join("all", socket);
	}
}

class OneVsOne extends Game {
	constructor(settings) {
		super(settings.name, settings.teams);

		this.addDrawing();
		this.maxTime = 1000*settings.maxTime;
		this.waiting();

		Object.keys(this.teams).forEach((n) => 
			this.teams[n].score = 0);
	}

	waiting() {
		this.status = "waiting";
		this.drawing.clear();
		let teamnames = Object.keys(this.teams);
		let dIndex;
		do {
			dIndex = Math.floor(Math.random()*teamnames.length);
		} while(this.drawer != null && teamnames[dIndex] == this.drawer.name);
		let gIndex = Math.floor(Math.random()*(teamnames.length-1));
		if(gIndex >= dIndex)
			gIndex++;
		this.drawer = this.teams[teamnames[dIndex]];
		this.guesser = this.teams[teamnames[gIndex]];

		this.drawer.once("startGame", () => {
			this.startDrawing();
		});
		this.emitProgress();
	}

	startDrawing() {
		this.status = "drawing";
		this.word = words.random();
		this.emitProgress();
		this.drawer.emit("word", this.word);
		let time = 0;
		
		this.endWordCallback = () => this.finishGame();
		this.drawer.on("endWord", this.endWordCallback);

		let interval = this.interval = setInterval(() => {
			time += 100;
			if(time%1000 == 0)
				this.emit("time", time);
			if(time >= this.maxTime) {
				clearInterval(interval);
				this.finishGame();
			}
		}, 100);
		this.emitProgress();
	}

	finishGame() {
		this.status = "finished";
		this.drawer.remove("endWord", this.endWordCallback);
		clearInterval(this.interval);
		this.drawer.once("endGame", (socket, found) => {
			if(found  == "found") {
				this.drawer.score++;
				this.guesser.score++;
			}
			this.waiting();
		});

		this.emitProgress();
	}

	gameSettings() {
		let settings = super.gameSettings();
		settings.maxTime = this.maxTime;
		return settings;
	}

	gameProgress() {
		let progress = super.gameProgress();
		progress.drawer = this.drawer.name;
		progress.guesser = this.guesser.name;
		progress.status = this.status;
		progress.scores = Object.keys(this.teams).map(
			(n)=>[n, this.teams[n].score]);
		return progress;
	}
}

Game.Sandbox = Sandbox;
Game.OneVsOne = OneVsOne;

module.exports = Game;

/*
class OneVsAll extends Game {
	constructor() {
		super();
		this.word = "";
		this.words = {};
		this.state = "idle"; // active / wait / finished
		this.drawer = null;
	}

	setState(state) {
		this.state = state;
		this.sendInfo();
	}
	
	start() {
		this.initNext();
	}
	
	sendToDrawer() {
		for (var socketId in io.sockets.adapter.rooms[this.room.room]) {
			var socket = io.sockets.connected[socketId];
			if(socket.team == this.drawer) {
				socket.emit.apply(socket, arguments);
			}
		}
	}
	
	getInfo() {
		return {
			drawer: this.drawer,
			state: this.state,
			scores: this.scores
		};
	}
	
	sendInfo() {
		this.send("gameInfo", this.getInfo());
	}
	
	currentDifficulty() {
		return this.room.difficulty;
	}
	
	initNext(newDrawer) {
		if(newDrawer == null) {
			var min = Infinity;
			for(var team in this.scores)
				min = Math.min(min, this.scores[team]);
			var minTeams = [];
			for(var team in this.scores) {
				if(this.scores[team] == min)
					minTeams.push(team);
				newDrawer = minTeams[Math.floor(Math.random()*minTeams.length)];
			}
		}
		this.drawer = newDrawer;
		this.setState("waiting");
		return true;
	}

	next(newDrawer) {
		this.setState("active");
		var i = 100;
		do {
			this.word = this.nextWord();
		} while(this.words[this.word] && --i >= 0)
		this.words[this.word] = true;

		this.timerEnd = new Date().getTime() + 1000*this.room.time;
		this.sendInfo();
		this.sendToDrawer("gameWord", this.word);

		var self = this;
		var checkTimer = function() {
			var left = self.timeLeft();
			if(left <= 200)
				self.endWord();
			else
				self.send("gameTimer", left);
		};
		checkTimer();
		this.timeInterval = setInterval(checkTimer, 2500);
	}

	endWord() {
		this.setState("finished");
		clearInterval(this.timeInterval);
	}

	finish(winner) {
		if(winner != null) {
			this.scores[winner]++;
			this.scores[this.drawer]++;
		}
		this.initNext(winner);
	}

	timeLeft() {
		return this.timerEnd - new Date().getTime();
	}

	meanScore() {
		var mean = 0;
		var count = 0;
		for(var team in this.scores) {
			mean += this.scores[team];
			count++;
		}
		return mean / count;
	}

	nextWord() {
		var d = this.room.difficulty;
		if(d == "easy" || d == "medium" || d == "hard")
			return words.random(d);
		else if(d == "random")
			return words.random();
		else if(d == "fair") {
			var x = this.scores[this.drawer] - this.meanScore();
			var a = 1, c = 2/3;
			var e = c*(.5-Math.atan(a*x)/Math.PI)
			var m = 1-c;
			var r = Math.random();
			if(r <= e)
				return words.randomEasy();
			else if(r <= e+m)
				return words.randomMedium();
			else
				return words.randomHard();
		}
	}
}

Game.OneVsAll = OneVsAll;
*/