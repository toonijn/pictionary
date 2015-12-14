(function(){
	if(!screenfull.enabled)
		document.documentElement.classList.add("noFullscreen")
	else
		document.addEventListener(screenfull.raw.fullscreenchange, function () {
			document.documentElement.classList[screenfull.isFullscreen?"add":"remove"]("fullscreen");
		});
})();

var highlightTextInput = function(input) {
	var t = 0;
	var interval = setInterval(function() {
		input.style.borderBottomColor = ["black",""][Math.floor(t*12)%2];
		t += 1/20;
		if(t > 1)
			clearInterval(interval);
	}, 75);
}

var addEventListenerTo = function(element, object) {
	for(var name in object) {
		var func = object[name];
		name.split(" ").forEach(function(name) {
			element.addEventListener(name, func);
		});
	}
};

var Clock = (function() {
	var Clock = function(svgWrapper) {
		var box = svgWrapper.getBoundingClientRect();
		this.width = box.width;
		this.height = box.height;
		this.chrono = document.createElementNS('http://www.w3.org/2000/svg',"path");
		this.chrono.classList.add("chrono");
		this.cx = this.width/2;
		this.cy = this.height/2;
		this.rx = this.width*.4;
		this.ry = this.height*.4;
		this.time = 0;
		this.maxTime = 30000;
		this.interval = -1;
		
		svgWrapper.insertBefore(this.chrono, svgWrapper.children[1]);
	};
	
	Clock.prototype.startInterval = function(noNew) {
		if(!noNew || this.interval > -1) {
			var self = this;
			clearInterval(this.interval);
			this.updateChrono();
			var last = new Date().getTime();
			this.interval = setInterval(function() {
				var current = new Date().getTime();
				self.time += current-last;
				last = current;
				self.updateChrono();
			}, 50);
		}
	};
	
	Clock.prototype.setTime = function(time) {
		this.time = time;
		this.startInterval(true);
	};
	
	Clock.prototype.updateChrono = function() {
		var angle = Math.PI*2*((1+(this.time/this.maxTime)%1)%1);
		var cx = this.cx,
			cy = this.cy,
			rx = this.rx,
			ry = this.ry;
		this.chrono.setAttribute("d",
			"M "+cx+" "+(cy-ry)+" "+
			"A "+rx+" "+ry+" 0 "+(angle < Math.PI?1:0)+" 0 "+ (cx+Math.sin(angle)*rx) +" "+ (cy-Math.cos(angle)*ry) +" "+
			"L "+cx+" "+cy+" z"
		);
	};
	
	Clock.prototype.start = function() {
		this.startInterval();
	};
	
	Clock.prototype.stop = function() {
		if(this.interval > -1)
			clearInterval(this.interval);
	};
	
	return Clock;
})();

var Popup = (function(){
	var popupWrapper = function() {
		return document.getElementById("popupWrapper");
	};

	var Popup = function(_settings) {
		var settings = {
			title: "Title",
			type: "confirm", // or "select" or "alert"
			description: "The content of the popup.",
			finish: function() {},
			placeholder: "",
			cancel: "cancel",
			confirm: "confirm",
			cancelable: true,
			options: [{value: "value", name: "name"}],
			hideErrorTimeout: 5000
		};
		for(var name in _settings) {
			settings[name] = _settings[name];
		}
		this.settings = settings;
		this.content = document.createElement("div");
		this.content.classList.add("content");
		var self = this;
		
		var title = document.createElement("h3");
		if(settings.cancelable) {
			var back = document.createElement("a");
			back.classList.add("icon");
			back.href = "#";
			back.classList.add("back");
			back.innerHTML = "arrow_back";
			back.addEventListener("click", function(event) {
				event.preventDefault();
				self.close(false);
			});
			title.appendChild(back);
		}
		title.appendChild(document.createTextNode(settings.title));
				
		var error = this.error = document.createElement("p");
		error.style.display = "none";
				
		var description = document.createElement("p");
		description.innerHTML = settings.description;
		
		this.content.appendChild(title);
		this.content.appendChild(error);
		this.content.appendChild(description);
		
		var getButtons = function() {
			var buttons = document.createElement("p");
			buttons.style.textAlign = "center";
			
			if(settings.cancelable) {
				var cancel = document.createElement("button");
				cancel.innerHTML = settings.cancel;
				cancel.addEventListener("click", function() {
					self.close(false);
				});
				buttons.appendChild(cancel);
				
				buttons.appendChild(document.createTextNode(" \u00A0 \u00A0 "));
			}
			
			var confirm = document.createElement("button");
			confirm.innerHTML = settings.confirm;
			confirm.addEventListener("click", function() {
				self.close(true);
			});
			buttons.appendChild(confirm);
			
			return buttons;
		}
		
		if(settings.type == "confirm") {
			(function(){
				var buttons = getButtons();
				
				var first = buttons.firstChild;
				
				var input = this.input = document.createElement("input");
				input.setAttribute("type","text");
				input.setAttribute("placeholder",settings.placeholder);
				input.addEventListener("keyup", function(event) {
					if(event.keyCode === 13)
						self.close(true);
				});
				buttons.insertBefore(input, first);
				
				buttons.insertBefore(document.createElement("br"), first);
				buttons.insertBefore(document.createElement("br"), first);
				
				this.content.appendChild(buttons);
			}).call(this);
		} else if(settings.type == "select") {
			(function(){
				var options = this.settings.options;
				var ul = document.createElement("ul");
				ul.classList.add("selector");
				var li, radio, label, j = 0;
				var getRadio = function(value) {
					var box = document.createElement("input");
					if(j == 0)
						box.checked = true;
					box.type = "radio";
					box.name = "popupSelect";
					box.id = "popupSelect" + j++;
					box.value = value;
					return box;
				}
				this.radios = [];
				for(var i = 0; i < options.length; i++) {
					li = document.createElement("li");
					label = document.createElement("label");
					label.setAttribute("for", "popupSelect" + i);
					var name = options[i], value = options[i];
					if("object" === typeof options[i]) {
						name = name.name;
						value = value.value;
					}
					label.innerHTML = name;
					radio = getRadio(value);
					this.radios.push(radio);
					li.appendChild(radio);
					li.appendChild(label);
					ul.appendChild(li);
				}
				
				this.content.appendChild(ul);
				
				this.content.appendChild(getButtons());
			}).call(this);
		} else if(settings.type == "alert") {
			(function(){
				var buttons = document.createElement("p");
				buttons.style.textAlign = "center";
				
				var cancel = document.createElement("button");
				cancel.innerHTML = settings.cancel;
				cancel.addEventListener("click", function() {
					self.close(false);
				});
				buttons.appendChild(cancel);
				this.content.appendChild(buttons);
			}).call(this);
		}
	};

	Popup.current = null;
	
	Popup.close = function() {
		if(Popup.current != null)
			return Popup.current.close(false);
		return true;
	};
	
	Popup.prototype.showError = function(message) {
		this.error.innerHTML = message;
		this.error.style.display = "block";
		var self = this;
		setTimeout(function(){
			self.hideError();
		}, this.settings.hideErrorTimeout);
	};
	
	Popup.prototype.hideError = function(message) {
		this.error.style.display = "none";
	};
	
	Popup.prototype.getChecked = function() {
		for(var i = 0; i < this.radios.length; i++)
			if(this.radios[i].checked)
				return this.radios[i].value;
		return null;
	};
	
	Popup.prototype.show = function() {
		if(Popup.close()) {
			Popup.current = this;
			popupWrapper().style.display = "block";
			var content = document.getElementById("popupContent");
			content.innerHTML = "";
			content.appendChild(this.content);
		}
	};
	
	Popup.prototype.close = function() {
		if(this.settings.finish.apply(this, arguments) === false)
			return false;
		Popup.current = null;
		popupWrapper().style.display = "none";
		this.hideError();
		return true;
	};
	
	return Popup;
})();

var Pictionary = (function(){
	var Pictionary = function(socket, _room) {
		this.room = {
			room: "sandbox"
		};
		this.info = {
			drawer: ""
		};
		
		for(var name in _room)
			this.room[name] = _room[name];
		
		socket.emit("join",this.room.room); 
		this.socket = socket;
		this.drawing = [];
		this.stack = [];
		this.wrapper = document.getElementById("pictionary");
		this.canvas = document.getElementById("canvas");
		this.canvasWrapper = document.getElementById("canvasWrapper");
		this.context = canvas.getContext("2d");
		this.overlayToolbar = document.getElementById("overlayToolbar");
		this.colors = ["#000000", "#CC0000","#009900","#0000CC"];
		this.clock = new Clock(document.getElementById("svg"));
		this.clock.maxTime = this.room.time*1000;
		
		this.init();
		
		var self = this;
		if(this.isSandbox()) {
			this.wrapper.classList.add("sandbox");
		} else {
			new Popup({
				type: "select",
				title: "Jouw team",
				description: "Kies in welk team je zal spelen.",
				options: this.room.teams,
				cancelable: false,
				confirm: '<span class="icon">play_arrow</span>Speel!',
				finish: function(success) {
					if(!success) return false;
					socket.emit("joinTeam", self.team = this.getChecked());
					document.getElementById("myTeam").innerHTML = self.team;
					self.startGame();
				}
			}).show();
		}
	};
	
	Pictionary.prototype.isSandbox = function() {
		return this.room.room == "sandbox";
	};
	
	Pictionary.prototype.setInfo = function(info) {
		var self = this;
		if(this.mayDraw())
			Popup.close();
		this.info = info;
		if(this.mayDraw())
			Popup.close();
		
		document.getElementById("gameDrawer").innerHTML = "<i>"+info.drawer+"</i> mag nu tekenen"
		
		if(info.state == "active")
			this.clock.start();
		else
			this.clock.stop();
		
		if(!this.mayDraw()) {
			document.getElementById("drawWord").innerHTML = "";
		} else {
			switch (info.state) {
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
					var winner = self.room.teams.filter(function(a) { return a != self.team; }).concat([{
							value: "",
							name: "Niemand kon het correcte antwoord raden."
						}]);
					new Popup({
						title: "De tijd is op",
						description: "Geef aan welk team het als eerste geraden heeft. Deze zal het volgende woord mogen tekenen. Als je aangeeft dat niemand het correcte antwoord kon raden zal de computer beslissen wie het volgende woord krijgt.",
						type: "select",
						cancelable: false,
						options: winner,
						confirm: "Ga verder",
						finish: function(success) {
							self.socket.emit("finishGame", this.getChecked());
						}
					}).show();
					break;
			}
		}
	};
	
	Pictionary.prototype.init = function() {
		var self = this;
		this.functions = {};
		this.socket.on("drawing",  this.functions.drawing = function(drawing) {
			self.onDrawing(drawing);
		});
		this.socket.on("draw", this.functions.draw = function(point) {
			self.addPoint(point, true);
		});
		
		if(!this.isSandbox()) {
			
			this.socket.on("gameInfo", this.functions.gameInfo = function(info) {
				self.setInfo(info);
			});
			
			this.socket.on("gameWord", this.functions.gameWord = function(word) {
				document.getElementById("drawWord").innerHTML = word;
			});
			
			this.socket.on("gameTimer", this.functions.gameTimer = function(time) {
				self.clock.setTime(self.clock.maxTime - time);
			});
		}
		
		this.socket.on("draw", this.functions.draw = function(point) {
			self.addPoint(point, true);
		});
		window.addEventListener("resize", this.functions.resize = function() {
			self.onResize();
		});
		this.onResize();
		
		var canvas = this.canvas;
		var self = this;
		
		var touchEventToPoint = function(event) {
			if(event.changedTouches.length == 0)
				return null;
			var ct = event.changedTouches;
			var current = null;
			for(var i = 0; i < ct.length; i++)
				if(ct[i].isPencil) {
					current = ct[i];
					break;
				}
			if(current == null) {
				current = event.changedTouches[0];
				current.isPencil = true;
			}
			var s = self.scale();
			return {
				x: (.5+current.pageX - event.target.offsetLeft)/s,
				y: (.5+current.pageY - event.target.offsetTop)/s
			};
		};
		
		addEventListenerTo(canvas, {
			"mousedown mouseenter": function(event){
				event.preventDefault();
				if(!self.mayDraw()) return;
				if(event.buttons == 0) return;
				canvas.classList.add("drawing");
				var s = self.scale();
				self.addPoint({
					x: (.5+event.offsetX)/s,
					y: (.5+event.offsetY)/s,
					start: true,
					color: self.getColor()
				});
			},
			"mousemove": function(event){
				event.preventDefault();
				if(!self.mayDraw()) return;
				if(event.buttons == 0) {
					canvas.classList.remove("drawing");
				} else {
					var s = self.scale();
					self.addPoint({
						x: (.5+event.offsetX)/s,
						y: (.5+event.offsetY)/s
					});
				}
			},
			"mouseout": function(event) {
				event.preventDefault();
				if(!self.mayDraw()) return;
				canvas.classList.remove("drawing");
			},
			"touchstart": function(event) {
				event.preventDefault();
				if(!self.mayDraw()) return;
				var point = touchEventToPoint(event);
				point.start = true;
				point.color = self.getColor();
				self.addPoint(point);
			},
			"touchmove": function(event) {
				event.preventDefault();
				if(!self.mayDraw()) return;
				self.addPoint(touchEventToPoint(event));
			},
		});
		
		socket.emit("drawingRequest");
	};
	
	Pictionary.prototype.startGame = function() {
		var self = this;
		socket.on("gameInfo", this.functions.gameInfo = function(info) {
			self.info = info;
			if(self.mayDraw()) {
				self.wrapper.classList.remove("disabled");
			} else {
				self.wrapper.classList.add("disabled");
			}
		});
		socket.emit("gameInfoRequest");
	};
	
	Pictionary.prototype.mayDraw = function() {
		return this.room.room == "sandbox" || this.team == this.info.drawer;
	};
	
	Pictionary.prototype.destroy = function() {
		this.socket.off("drawing", this.functions.drawing);
		this.socket.off("draw", this.functions.draw);
		this.socket.off("gameInfo", this.functions.gameInfo);
		this.socket.off("gameWord", this.functions.gameWord);
		this.socket.off("gameTimer", this.functions.gameTimer);
		window.removeEventListener("resize", this.functions.resize);
	};
		
	
	Pictionary.prototype.getColor = function() {
		var boxes = document.getElementsByName("colorPicker");
		for(var i = 0; i < boxes.length; i++)
			if(boxes[i].checked)
				return parseInt(boxes[i].value);
		return false;
	};
	
	Pictionary.prototype.onResize = function() {
		var tools = document.getElementById("pictionary_toolbar").offsetHeight;
		var size = Math.min(window.innerWidth-tools*1/3, window.innerHeight-tools*4/3);
		overlayToolbar.firstElementChild.style.width = size+"px";
		this.canvasWrapper.style.width = (canvas.width = size)+"px";
		this.canvasWrapper.height = (canvas.height = size)+"px";
		this.context.lineWidth = 2;
		this.draw();
	};
	
	Pictionary.prototype.onDrawing = function(drawing) {
		this.drawing = drawing;
		this.draw();
	};
	
	Pictionary.prototype.addPoint = function(point, silent) {
		if(!point.start)
			this.stack = [];
		if(!silent)
			this.socket.emit("draw", point);
		this.drawing.push(point);
		this.draw();
	};
	
	Pictionary.prototype.draw = function() {
		var context = this.context;
		var colors = this.colors;
		this.context.clearRect(0,0,this.canvas.width, this.canvas.height);
		var s = this.scale();
		var prev = null;
		var checkPrev = function() {
			if(prev != null && prev.start) {
				context.beginPath();
				context.strokeStyle = colors[prev.color || 0];
				context.arc(prev.x*s, prev.y*s, 1, 0, 2 * Math.PI, false);
				context.strokeStyle = colors[prev.color || 0];
				context.stroke();
			}
		};
		context.beginPath();
		this.drawing.forEach(function(point) {
			if(point.start){
				context.stroke();
				checkPrev();
				context.moveTo(point.x*s, point.y*s);
				context.beginPath();
				context.strokeStyle = colors[point.color || 0];
			} else
				context.lineTo(point.x*s, point.y*s);
			prev = point;
		});
		context.stroke();
		checkPrev();
	};
	
	Pictionary.prototype.scale = function() {
		return Math.min(this.canvas.width, this.canvas.height);
	};
	
	Pictionary.prototype.load = function() {
		if(!self.mayDraw()) return;
		var socket = this.socket;
		var loadPopup = new Popup({
			title: "Laad een afbeelding",
			description: "Geef de naam van de te laden afbeelding:",
			cancel: '<span class="icon">cancel</span>Annuleren',
			confirm: '<span class="icon">add</span>Inladen',
			finish: function(success, ignore) {
				var text = this.input;
				var value = text.value.trim();
				if(success) {
					if(!text.value.match(/^[a-zA-Z0-9_\-\.]+$/g))
						return !!highlightTextInput(text) && false;
					socket.emit("load", value);
					socket.once("loadingStatus", function(success, message) {
						if(success)
							loadPopup.close(false);
						else 
							loadPopup.showError(message);
					});
					return false;
				}
				text.value = "";
			}
		});
		loadPopup.show();
	};
	
	Pictionary.prototype.save = function() {
		var socket = this.socket;
		new Popup({
			title: "Sla deze afbeelding op",
			description: "Kies een naam van de afbeelding:",
			cancel: '<span class="icon">cancel</span>Annuleren',
			confirm: '<span class="icon">save</span>Opslaan',
			finish: function(success) {
				var text = this.input;
				var value = text.value.trim();
				if(success) {
					if(!text.value.match(/^[a-zA-Z0-9_\-\.]+$/g))
						return !!highlightTextInput(text) && false;
					socket.emit("save", value);
				}
				text.value = "";
			}
		}).show();
	};
		
	Pictionary.prototype.clear = function() {
		socket.emit("clear");
	}
	
	Pictionary.prototype.undo = function() {
		socket.emit("undo");
	}
	
	Pictionary.prototype.fullscreen = function() {
		screenfull.request();
	}
	
	Pictionary.prototype.fullscreenExit = function() {
		screenfull.exit();
	}
	
	return Pictionary;
})();

var Menu = (function() {
	var Menu = function(socket) {
		this.socket = socket;
		
		this.functions = {};
		
		var self = this;
		socket.on("connectionCount", this.functions.connectionCount = function(count) {
			self.updateConnectionCount(count);
		});
		socket.emit("connectionCountRequest");
	};
	
	Menu.prototype.destroy = function() {
		this.socket.off("connectionCount", this.functions.connectionCount);
	};
	
	Menu.prototype.play = function() {
		var self = this;
		this.socket.once("rooms", function(rooms) {
			if(rooms.length == 1) {
				new Popup({
					type: "alert",
					title: "Er zijn nog geen spellen.",
					description: "Ga terug naar het menu om een nieuw spel te beginnen.",
					cancel: '<span class="icon">arrow_back</span>Terug'
				}).show();
			} else {
				var options = [];
				for(var i = 0; i < rooms.length; i++)
					if(rooms[i].room != "sandbox")
						options.push({
							value: i,
							name: rooms[i].room
						});
			
				new Popup({
					title: "Meespelen?",
					type: "select",
					description: "Bij welke groep wil je aansluiten?",
					finish: function(success) {
						if(!success) return;
						loadScreen("Pictionary", self.socket, rooms[this.getChecked()]);
					},
					cancel: '<span class="icon">cancel</span>Annuleren',
					confirm: '<span class="icon">play_arrow</span>Meespelen',
					options: options,
					hideErrorTimeout: 5000
				}).show();
			}
		});
		this.socket.emit("roomsRequest");
	};
	
	Menu.prototype.updateConnectionCount = function(count) {
		var cu = document.getElementById("connectedUsers");
		if(count == 0)
			cu.innerHTML = "Zelf jij bent niet verbonden.";
		else if(count == 1)
			cu.innerHTML = "Enkel jij bent verbonden.";
		else if(count == 2)
			cu.innerHTML = "Eén iemand anders is verbonden.";
		else
			cu.innerHTML = count-1 +" andere gebruikers zijn verbonden.";
	};
	
	return Menu;
})();

var GameBuilder = (function() {
	var GameBuilder = function(socket) {
		var self = this;
		this.socket = socket;
		this.form = document.getElementById("game-builder");
		this.form.addEventListener("submit", function(event) {
			event.preventDefault();
			self.build();
		});
	};
	
	GameBuilder.prototype.build = function() {
		var form = this.form;
		
		var teams = [];
		var i = 0;
		while(form["team"+i] != null)
			teams.push(form["team" + i++].value);
		var settings = {
			room: form.room.value,
			difficulty: form.difficulty.value,
			countWords: form.countWords.value,
			teams: teams
		};
		this.socket.emit("newGame", settings);
		
		loadScreen("Pictionary", this.socket, settings);
	};
	
	GameBuilder.prototype.destroy = function() {
	};
	
	GameBuilder.prototype.addTeam = function() {
		var li = document.getElementById("newTeamLI");
		var index = parseInt(li.previousElementSibling
						.firstElementChild.innerHTML.substr(5));
		
		var newLi = document.createElement("li");
		newLi.classList.add("newTeam");
		
		var label = document.createElement("label");
		label.innerHTML = "Team "+(index+1);
		label.setAttribute("for", "team"+index);
		newLi.appendChild(label);
		
		newLi.appendChild(document.createTextNode(" "));
		
		var input = document.createElement("input");
		input.setAttribute("type", "text");
		input.setAttribute("name", "team"+index);
		input.setAttribute("id", "team"+index);
		input.setAttribute("placeholder", "teamnaam");
		newLi.appendChild(input);
		
		newLi.appendChild(document.createTextNode(" "));
		
		var del = document.createElement("a");
		del.href = "#";
		del.classList.add("icon");
		del.innerHTML = "cancel";
		del.addEventListener("click", function(event) {
			event.preventDefault();
			var above = newLi, prev = newLi;
			while((above = above.nextElementSibling) != li)
				prev.childNodes[1].value = (prev = above).childNodes[1].value;
			
			newLi.parentNode.removeChild(li.previousElementSibling);
		});
		newLi.appendChild(del);
		
		li.parentNode.insertBefore(newLi, li);
	};
	
	return GameBuilder;
})()




































