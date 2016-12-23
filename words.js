const FileSystem = require('fs');

var Words = function(file) {
	var words = this.words = {easy: [], medium: [], hard: []};

	FileSystem.readFile(file, "utf8", function (err, data) {
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
	for(var cat in this.words) {
		if((i -= this.words[cat].length) < 0)
			return this.words[cat][i+this.words[cat].length];
	}
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

module.exports =  new Words("./words.txt");