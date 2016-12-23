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
		for(var i = 0; i < this.radios.length; i++) {
			if(this.radios[i].checked)
				return this.radios[i].value;
		}
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

var GameBuilder = (function() {
	var GameBuilder = function(socket) {
		var self = this;
		this.socket = socket;
		this.form = document.getElementById("game-builder");
		this.form.addEventListener("submit", function(event) {
			event.preventDefault();
			self.build();
		});
		this.form.type.addEventListener("change", function() {
			self.form.className = this.value;
		})
	};

	GameBuilder.prototype.build = function() {
		var form = this.form;

		var teams = [];
		var i = 0;
		while(form["team"+i] != null)
			teams.push(form["team" + i++].value);
		var settings = {
			name: form.gamename.value,
			difficulty: form.difficulty.value,
			type: form.type.value,
			teams: teams,
			maxTime: form.maxTime.value
		};
		var self = this;
		this.socket.once("games", function(){
			loadScreen("Menu", Menu, function(){
				this.socket.once("games", function(){
					active.play();
				});
			}, self.socket);
		});
		this.socket.emit("newGame", settings);
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




































