var addEventListenerTo = function(element, object) {
	for(var name in object) {
		var func = object[name];
		name.split(" ").forEach(function(name) {
			element.addEventListener(name, func);
		});
	}
};

var Drawing = function(socket) {
	var self = this;

	this.drawable = true;
	this.socket = socket;
	this.drawing = [];
	this.canvas = canvas;
	this.functions = {};

	this.wrapper = document.getElementById("pictionary");
	this.canvas = document.getElementById("canvas");
	this.canvasWrapper = document.getElementById("canvasWrapper");
	this.context = canvas.getContext("2d");
	this.overlayToolbar = document.getElementById("overlayToolbar");
	this.colors = ["#000000", "#CC0000","#009900","#0000CC"];

	window.addEventListener("resize", this.functions.resize = function() {
		self.onResize();
	});

	var touchEventToPoint = function(event) {
		if(event.changedTouches.length == 0)
			return null;
		var ct = event.changedTouches;
		var current = null;
		for(var i = 0; i < ct.length; i++) {
			if(ct[i].isPencil) {
				current = ct[i];
				break;
			}
		}
		if(current == null) {
			current = event.changedTouches[0];
			current.isPencil = true;
		}

		var x = .5+current.pageX,
		y = .5+current.pageY;
		var canvas = self.canvas;
		do {
			x -= canvas.offsetLeft - canvas.scrollLeft;
			y -= canvas.offsetTop - canvas.scrollTop;
		} while(canvas = canvas.offsetParent);

		var s = self.scale();
		return {
			x: x/s,
			y: y/s
		};
	};

	addEventListenerTo(canvas, {
		"mousedown mouseenter": function(event){
			event.preventDefault();
			if(!self.drawable) return;
			if(event.buttons == 0) return;
			canvas.classList.add("drawing");
			var s = self.scale();
			self.sendPoint({
				x: (.5+event.offsetX)/s,
				y: (.5+event.offsetY)/s,
				start: true,
				color: self.getColor()
			});
		},
		"mousemove": function(event){
			event.preventDefault();
			if(!self.drawable) return;
			if(event.buttons == 0) {
				canvas.classList.remove("drawing");
			} else {
				var s = self.scale();
				self.sendPoint({
					x: (.5+event.offsetX)/s,
					y: (.5+event.offsetY)/s
				});
			}
		},
		"mouseout": function(event) {
			event.preventDefault();
			if(!self.drawable) return;
			canvas.classList.remove("drawing");
		},
		"touchstart": function(event) {
			event.preventDefault();
			if(!self.drawable) return;
			var point = touchEventToPoint(event);
			point.start = true;
			point.color = self.getColor();
			self.sendPoint(point);
		},
		"touchmove": function(event) {
			event.preventDefault();
			if(!self.drawable) return;
			self.sendPoint(touchEventToPoint(event));
		},
	});

	this.socket.on("drawing",  this.functions.drawing = function(drawing) {
		self.onDrawing(drawing);
	});
	this.socket.on("draw", this.functions.draw = function(point) {
		self.addPoint(point);
	});
	this.onResize();
};

Drawing.prototype.scale = function() {
	return Math.min(this.canvas.width, this.canvas.height);
};

Drawing.prototype.onResize = function() {
	var tools = document.getElementById("pictionary_toolbar").offsetHeight;
	var size = Math.min(window.innerWidth-tools*1/3, window.innerHeight-tools*4/3);
	overlayToolbar.firstElementChild.style.width = size+"px";
	this.canvasWrapper.style.width = (canvas.width = size)+"px";
	this.canvasWrapper.height = (canvas.height = size)+"px";
	this.context.lineWidth = 2;
	this.draw();
};

Drawing.prototype.onDrawing = function(drawing) {
	this.drawing = drawing;
	this.draw();
};

Drawing.prototype.sendPoint = function(point) {
	this.socket.emit("draw", point);
};

Drawing.prototype.addPoint = function(point) {
	this.drawing.push(point);
	this.draw();
};

Drawing.prototype.draw = function() {
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

Drawing.prototype.load = function() {
	if(!this.drawable) return;
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
			}
			text.value = "";
		}
	});
	loadPopup.show();
};

Drawing.prototype.save = function() {
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

Drawing.prototype.finish = function() {
	this.socket.emit("gameEndWord");
};

Drawing.prototype.clear = function() {
	this.socket.emit("clear");
}

Drawing.prototype.undo = function() {
	this.socket.emit("undo");
}

Drawing.prototype.getColor = function() {
	var boxes = document.getElementsByName("colorPicker");
	for(var i = 0; i < boxes.length; i++) {
		if(boxes[i].checked)
			return parseInt(boxes[i].value);
	}
	return false;
};

Drawing.prototype.destroy = function() {
	this.socket.off("drawing", this.functions.drawing);
	this.socket.off("draw", this.functions.draw);
	window.removeEventListener("resize", this.functions.resize);
};

Drawing.prototype.disable = function() {
	this.wrapper.classList.add("disabled");
	this.drawable = false;
}

Drawing.prototype.enable = function() {
	this.wrapper.classList.remove("disabled");
	this.drawable = true;
}