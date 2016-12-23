var Clock = (function() {
	var Clock = function(svgWrapper) {
		this.wrapper = svgWrapper;
		this.width = svgWrapper.clientWidth;
		this.height = svgWrapper.clientHeight;
		this.chrono = document.createElementNS('http://www.w3.org/2000/svg',"path");
		this.chrono.classList.add("chrono");
		this.cx = this.width/2;
		this.cy = this.height/2;
		this.rx = this.width;
		this.ry = this.height;
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
		this.setTime(0);
		this.wrapper.style.display = "block";
		this.startInterval();
	};
	
	Clock.prototype.stop = function() {
		this.wrapper.style.display = "none";
		if(this.interval > -1)
			clearInterval(this.interval);
	};
	
	return Clock;
})();