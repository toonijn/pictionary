var Pictionary = function(socket, game, teamname) {
	var self = this;

	this.functions = {};
	this.socket = socket;
	this.drawing = new Drawing(socket);

	socket.on("gameSettings", this.functions.gameSettings = function(settings) {
		(self.settings = settings).teamname = teamname;
		self.onSettings(settings);
	});
	socket.on("gameProgress", this.functions.gameProgress = function(progress) {
		self.progress = progress;
		self.onProgress(progress);
	});
	socket.emit("joinGame", game, teamname);
}

Pictionary.prototype.fullscreen = function() {
	screenfull.request();
}

Pictionary.prototype.fullscreenExit = function() {
	screenfull.exit();
}

Pictionary.prototype.onGameSettings = function() {};
Pictionary.prototype.onProgress = function() {};

Pictionary.prototype.destroy = function() {
	socket.off("gameSettings", this.functions.gameSettings);
	socket.off("gameProgress", this.functions.gameProgress);
};


/* SANDBOX */

var Sandbox = Pictionary.Sandbox = function(socket) {
	Pictionary.call(this, socket, "sandbox");
	
	this.drawing.wrapper.classList.add("sandbox");
};

Sandbox.prototype = Object.create(Pictionary.prototype);

var Scores = function(wrapper, game) {
	this.game = game;
	this.list = {};
	this.wrapper = wrapper;
	this.drawer = null;
	this.guesser = null;
	this.ul = document.createElement("ul");
	wrapper.appendChild(this.ul);

	var self = this;
	game.settings.teams.forEach(function(team) {
		self.getNode(team);
	});
}

Scores.prototype.getNode = function(team) {
	if(this.list[team] != null)
		return this.list[team];
	var span = document.createElement("span");
	span.classList.add("team");
	var icon = document.createElement("span");
	icon.classList.add("icon");
	span.appendChild(icon);
	span.appendChild(document.createTextNode(team));
	var li = document.createElement("li");
	if(team == this.game.settings.teamname)
		li.classList.add("me");

	li.appendChild(span)
	var score = document.createTextNode("0");
	li.appendChild(score);
	li.setScore = function(s) {
		score.textContent = s;
	};
	li.setDrawer = function() {
		if(self.drawer != null) {
			self.drawer = null;
			li.classList.remove("drawer");
			icon.innerHTML = "";
		}
		self.drawer = li;
		li.classList.add("drawer");
		icon.innerHTML = "create";
	};
	li.setGuesser = function() {
		if(self.guesser != null) {
			self.guesser = null;
			li.classList.remove("guesser");
			icon.innerHTML = "";
		}
		self.guesser = li;
		li.classList.add("guesser");
		icon.innerHTML = "help";
	};
	this.ul.appendChild(li);
	return this.list[team] = li;
}

/* ONE VS ONE */

var OneVsOne = Pictionary.OneVsOne = function(socket, game, team) {
	Pictionary.call(this, socket, game, team);
	
	this.drawing.wrapper.classList.add("one_vs_one");

	var self = this;
	socket.on("word", function(word) {
		self.setWord(word);
	});
	socket.on("time", function(time) {
		self.clock.setTime(time);
	});
};

OneVsOne.prototype = Object.create(Pictionary.prototype);

OneVsOne.prototype.onSettings = function(settings) {
	var svg = document.getElementById("clock");
	svg.style.display = "block";
	this.clock = new Clock(svg);
	this.clock.maxTime = settings.maxTime;
	this.scores = new Scores(
		document.getElementById("info"), this);
}

OneVsOne.prototype.setWord = function(word) {
	document.getElementById("drawWord").innerHTML = word;
}

OneVsOne.prototype.isDrawing = function() {
	return this.progress.drawer == this.settings.teamname;
}

OneVsOne.prototype.onProgress = function(progress) {
	var self = this;
	progress.scores.forEach(function(c){
		self.scores.getNode(c[0]).setScore(c[1]);
	});

	if(this.isDrawing())
		this.drawing.enable();
	else
		this.drawing.disable();

	this.scores.getNode(progress.drawer).setDrawer();
	this.scores.getNode(progress.guesser).setGuesser();

	if(progress.status == "waiting")
		this.setWord("");

	if(progress.status == "drawing")
		this.clock.start();
	else
		this.clock.stop();

	if(this.isDrawing())
		this.progressAsDrawer(progress);
	else
		this.setWord(progress.drawer + " &#8594; " + progress.guesser);
};

OneVsOne.prototype.finish = function() {
	this.socket.emit("endWord");
}

OneVsOne.prototype.progressAsDrawer = function(progress) {
	var self = this;
	switch (progress.status) {
		case "waiting":
		new Popup({
			title: "Klaar...",
			description: "Wanneer je op start drukt krijg je het woord dat je moet tekenen en begint de tijd te lopen.",
			cancel: '<span class="icon">play_arrow</span>Start!',
			type: "alert",
			cancelable: false,
			finish: function(success) {
				self.socket.emit("startGame");
			}
		}).show();
		break;
		case "finished":
		new Popup({
			title: "De tijd is op",
			description: "Heeft "+progress.guesser+" het woord geraden?",
			type: "select",
			cancelable: false,
			options: [{
				value: "found",
				name: "Ja! :D"
			}, {
				value: "fail",
				name: "Helaas niet :("
			}],
			confirm: "Ga verder",
			finish: function(success) {
				self.socket.emit("endGame", this.getChecked());
			}
		}).show();
		break;
	}
}
