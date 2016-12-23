
var Menu = (function() {
	var Menu = function(socket) {
		this.socket = socket;

		this.functions = {};

		var self = this;
		socket.on("connectionCount", this.functions.connectionCount = function(count) {
			self.updateConnectionCount(count);
		});
		socket.on("games", this.functions.games = function(games) {
			self.games = games;
		});
		socket.emit("joinLobby");
	};

	Menu.prototype.destroy = function() {
		this.socket.off("connectionCount", this.functions.connectionCount);
	};

	Menu.prototype.play = function() {
		var self = this;
		if(this.games.length == 0) {
			new Popup({
				type: "alert",
				title: "Er zijn nog geen spellen.",
				description: "Ga terug naar het menu om een nieuw spel te beginnen.",
				cancel: '<span class="icon">arrow_back</span>Terug'
			}).show();
		} else {
			new Popup({
				title: "Meespelen?",
				type: "select",
				description: "Bij welke spel wil je aansluiten?",
				finish: function(success) {
					if(!success) return;
					var name = this.getChecked();
					var g = {};
					self.games.forEach(function(g){
						if(g.name == name)
							game = g;
					});
					setTimeout(function() {
						new Popup({
							title: "Meespelen?",
							type: "select",
							description: "Bij welk team wil je aansluiten in het spel '"+game.name+"'?",
							finish: function(success) {
								if(!success) return;
								var team = this.getChecked();
								loadScreen("Pictionary", Pictionary[game.type], self.socket, game.name, team);
							},
							cancel: '<span class="icon">cancel</span>Annuleren',
							confirm: '<span class="icon">play_arrow</span>Meespelen',
							options: game.teams,
							hideErrorTimeout: 5000
						}).show();
					}, 0);
				},
				cancel: '<span class="icon">cancel</span>Annuleren',
				confirm: '<span class="icon">play_arrow</span>Kies een team',
				options: this.games.map(function(g) { return g.name; }),
				hideErrorTimeout: 5000
			}).show();
		}
	};

	Menu.prototype.updateConnectionCount = function(count) {
		var cu = document.getElementById("connectedUsers");
		if(count == 0)
			cu.innerHTML = "Zelfs jij bent niet verbonden.";
		else if(count == 1)
			cu.innerHTML = "Enkel jij bent verbonden.";
		else if(count == 2)
			cu.innerHTML = "Eén iemand anders is verbonden.";
		else
			cu.innerHTML = count-1 +" andere gebruikers zijn verbonden.";
	};

	return Menu;
})();
