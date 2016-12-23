const EventEmitter = require("events");
const FileSystem = require("fs");
const words = require("./words");

class Drawing extends EventEmitter {
	constructor() {
		super();
		this.drawing = [];
	}

	changed() {
		this.emit("changed", this.drawing);
	}

	setDrawing(drawing) {
		this.drawing = drawing;
		this.changed();
	}

	draw(point) {
		this.drawing.push(point);
		this.emit("point", point);
	}

	undo() {
		if (this.drawing.length == 0) return;

		let point;
		do {
			point = this.drawing.pop();
		} while (!point.start);

		this.changed();
	}

	error(message) {
		this.emit("exception", message);
	}

	save(name) {
		if (!name.match(/^[a-zA-Z0-9_\-\.]+$/g)) return;
		FileSystem.writeFile("./drawings/" + name + ".json", JSON.stringify(this.drawing), (err) => {
			if (err)
				console.log(err);
		});
	}

	load(name) {
		if (!name.match(/^[a-zA-Z0-9_\-\.]+$/g)) return;
		FileSystem.readFile("./drawings/" + name + ".json", (err, data) => {
			if (err) {
				this.error("Het opgegeven bestand kon niet geladen worden.");
			}
			else
				this.setDrawing(JSON.parse(data));
		});
	}

	clear() {
		this.setDrawing([]);
	}
}

module.exports = Drawing;