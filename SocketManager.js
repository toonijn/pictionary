class SocketManager {
	constructor() {
		this.sockets = [];
		this.events = {};
	}

	join(socket) {
		this.sockets.push(socket);
		let f = 
		Object.keys(this.events).forEach((k) => {
			socket.on(k, this.events[k].onSocket);
		});
	}

	remove(event, func) {
		this.sockets.forEach((socket) => {
			socket.removeListener(event, func.onSocket);
		});
	}

	on(event, func) {
		this.events[event] = func;
		func.onSocket = function(...args) {
			func(this, ...args);
		};
		this.sockets.forEach((socket) => {
			socket.on(event, func.onSocket);
		});
	}

	emit(event, data) {
		this.sockets.forEach((socket) => {
			socket.emit(event, data);
		});
	}

	once(event, func) {
		let f = (...args) => {
			this.remove(event, f);
			func(...args);
		};
		this.on(event, f);
	}
}

module.exports = SocketManager;