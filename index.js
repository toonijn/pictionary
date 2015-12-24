var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require("socket.io")(http);
var fs = require('fs');

var rooms = {
    sandbox: {
		sandbox: true,
		room: "sandbox",
        drawing: []
    },
};

var words = (function() {
	var Words = function(file) {
		var words = this.words = {easy: [], medium: [], hard: []};
		
		fs.readFile(file, "utf8", function (err, data) {
            if (err)
				console.log(err);
			else
				data.split("\n").forEach(function(line) {
					if(line.trim() == "") return;
					line = line.split("\t");
					words[line[0].toLowerCase()].push(line[1]);
				});
        });
	};
	
	var random = function(words) {
		return words[Math.floor(Math.random()*words.length)];
	};
	
	Words.prototype.length = function() {
		var length = 0;
		for(var cat in this.words)
			length += this.words[cat].length;
		return length;
	};
	
	Words.prototype.get = function(i) {
		for(var cat in this.words)
			if((i -= this.words[cat].length) < 0)
				return this.words[cat][i+this.words[cat].length];
	};
	
	Words.prototype.random = function(cat) {
		if(cat == null)
			return this.get(Math.floor(Math.random()*this.length()));
		else
			return random(this.words[cat]);
	};
	
	Words.prototype.randomEasy = function() {
		return random(this.words.easy);
	};
	
	Words.prototype.randomMedium = function() {
		return random(this.words.medium);
	};
	
	Words.prototype.randomHard = function() {
		return random(this.words.hard);
	};
	
	return new Words("./words.txt");
})();

var Game = (function() {
	var Game = function(room) {
		this.room = room;
		room.game = this;
		var scores = this.scores = {};
		this.room.teams.forEach(function(team) {
			scores[team] = 0;
		});
		this.word = "";
		this.words = {};
		this.state = "idle"; // active / wait / finished
	};
	
	Game.prototype.setState = function(state) {
		this.state = state;
		this.sendInfo();
	};
	
	Game.prototype.start = function() {
		this.initNext();
	};
	
	Game.prototype.sendToDrawer = function() {
		for (var socketId in io.sockets.adapter.rooms[this.room.room]) {
			var socket = io.sockets.connected[socketId];
			if(socket.team == this.drawer) {
				socket.emit.apply(socket, arguments);
			}
		}
	};
	
	Game.prototype.send = function() {
		var socket = io.to(this.room.room);
		socket.emit.apply(socket, arguments);
	};
	
	Game.prototype.getInfo = function() {
		return {
			drawer: this.drawer,
			state: this.state,
			scores: this.scores
		};
	};
	
	Game.prototype.sendInfo = function() {
		this.send("gameInfo", this.getInfo());
	};
	
	Game.prototype.currentDifficulty = function() {
		return this.room.difficulty;
	};
	
	Game.prototype.initNext = function(newDrawer) {
		if(newDrawer == null) {
			var min = Infinity;
			for(var team in this.scores)
				min = Math.min(min, this.scores[team]);
			var minTeams = [];
			for(var team in this.scores)
				if(this.scores[team] == min)
					minTeams.push(team);
			newDrawer = minTeams[Math.floor(Math.random()*minTeams.length)];
		}
		this.drawer = newDrawer;
		this.setState("waiting");
		return true;
	};
	
	Game.prototype.next = function(newDrawer) {
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
	};
	
	Game.prototype.endWord = function() {
		this.setState("finished");
		clearInterval(this.timeInterval);
	};
	
	Game.prototype.finish = function(winner) {
		if(winner != null) {
			this.scores[winner]++;
			this.scores[this.drawer]++;
		}
		this.initNext(winner);
	};
	
	Game.prototype.timeLeft = function() {
		return this.timerEnd - new Date().getTime();
	};
	
	Game.prototype.meanScore = function() {
		var mean = 0;
		var count = 0;
		for(var team in this.scores) {
			mean += this.scores[team];
			count++;
		}
		return mean / count;
	};
	
	Game.prototype.nextWord = function() {
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
	};
	
	return Game;
})();

io.on('connection', function (socket) {
    var room = "sandbox";
	socket.team = "";
	
    socket.join(room);

	var sandbox = function() {
		return room == "sandbox";
	};
	
    var broadcastDrawing = function () {
        io.to(room).emit("drawing", getDrawing());
    };

    var getDrawing = function () {
        return rooms[room].drawing;
    };

    var setDrawing = function (drawing) {
        rooms[room].drawing = drawing;
        broadcastDrawing();
    };

    var leaveRoom = function () {
        socket.leave(room);
      /*  if (room != "sandbox" && (io.sockets.adapter.rooms[room] == null || io.sockets.adapter.rooms[room].length == 0))
            delete rooms[room];
    */};
	
	var sendableRoom = function(roomName) {
		var room = rooms[roomName];
		var small = {};
		for(var key in room)
			if(key != "drawing" && key != "game")
				small[key] = room[key];
		return small;
	}

    var joinRoom = function (newRoom) {
        if (room == newRoom)
            return;
		if(rooms[newRoom] == null)
			return;
        leaveRoom();
        socket.join(room = newRoom);
        socket.emit("roomInfo", sendableRoom(newRoom));
        socket.emit("drawing", getDrawing());
    };
	
    io.emit("connectionCount", io.engine.clientsCount);

    socket.on("draw", function (point) {
        getDrawing().push(point);
        socket.broadcast.to(room).emit("draw", point);
    });

    socket.on("clear", function () {
        setDrawing([]);
    });

    socket.on("undo", function () {
        var drawing = getDrawing();
        if (drawing.length == 0) return;

        var point;
        do {
            point = drawing.pop();
        } while (!point.start);

        broadcastDrawing();
    });

    socket.on("save", function (name) {
        if (!name.match(/^[a-zA-Z0-9_\-\.]+$/g)) return;
        fs.writeFile("./drawings/" + name + ".json", JSON.stringify(drawing), function (err) {
            if (err) {
                console.log(err);
            }
        });
    });

    socket.on("load", function (name) {
        if (!name.match(/^[a-zA-Z0-9_\-\.]+$/g)) return;
        fs.readFile("./drawings/" + name + ".json", function (err, data) {
            if (err) {
                socket.emit("loadingStatus", false, "Het opgegeven bestand kon niet geladen worden.");
            } else {
                setDrawing(JSON.parse(data));
                socket.emit("loadingStatus", true);
                broadcastDrawing();
            }
        });
    });

    socket.on("join", joinRoom);

    socket.on("drawingRequest", function () {
        socket.emit("drawing", getDrawing());
    });

    socket.on("connectionCountRequest", function () {
        socket.emit("connectionCount", io.engine.clientsCount);
    });

    socket.on("disconnect", function () {
        leaveRoom();
        io.emit("connectionCount", io.engine.clientsCount);
    });
	
    socket.on("roomsRequest", function () {
		var smallRooms = [];
		
		for(var roomName in rooms) {
			smallRooms.push(sendableRoom(roomName));
		}
		
        socket.emit("rooms", smallRooms);
    });
	
    socket.on("gameEndWord", function () {
		if(sandbox()) return;
		var game = rooms[room].game;
		if(game.drawer == socket.team && game.state == "active")
			game.endWord();
    });
	
    socket.on("gameInfoRequest", function () {
		if(sandbox()) return;
        socket.emit("gameInfo", rooms[room].game.getInfo());
    });

    socket.on("teamsRequest", function () {
		if(sandbox()) return;
        socket.emit("teams", rooms[room].teams);
    });

    socket.on("joinTeam", function (team) {
		if(sandbox()) return;
		socket.team = team;
		if(team == rooms[room].game.drawer && rooms[room].game.state == "active")
			socket.emit("gameWord", rooms[room].game.word);
    });

    socket.on("startGame", function () {
		if(sandbox()) return;
		var game = rooms[room].game;
		if(game.drawer == socket.team && game.state == "waiting")
			game.next();
    });
	
	socket.on("finishGame", function(winner) {
		if(sandbox()) return;
		var game = rooms[room].game;
		if(game.drawer == socket.team && game.state == "finished") {
			game.finish(winner.trim() == "" ? null : winner);
			setDrawing([]);
			broadcastDrawing();
		}
	});

    socket.on("newGame", function (settings) {
        var game = new Game(rooms[settings.room] = {
			drawing: [],
			room: settings.room,
            difficulty: settings.difficulty,
            teams: settings.teams,
			time: 30
        });
        joinRoom(settings.room);
		game.start();
    });
});

app.use(express.static('static'));

var ipaddress = process.env.OPENSHIFT_NODEJS_IP || "0.0.0.0";
var port = process.env.OPENSHIFT_NODEJS_PORT || 80;

http.listen(port, ipaddress, function () {
    console.log('listening on *:' + port);
});