#!/usr/bin/env node

var http    = require('http');
var path    = require('path');
var router  = new require('routes').Router();
var st      = require('st');
var url     = require('url');
var root    = path.join(__filename, '..');

var wscreen = require('./lib/watch_screen');

var server = http.createServer(function (req, res) {
	try {
		var pathname = url.parse(req.url).pathname;
		var route = router.match(pathname);
		if (!route) throw { code : 404 };
		route.fn(req, res);
	} catch (e) {
		var code = e.code || 500;
		res.writeHead(code);
		res.end(code + "\n" + String(e), 'utf-8');
	}
});

var io     = require('socket.io').listen(server);

router.addRoute(new RegExp('/(js|css|images|bootstrap)'), serve('/', path.join(root, 'static')));
router.addRoute('/', serve('/', path.join(root, 'views')));

router.addRoute('/in', function (req, res) {
	var query  = url.parse(req.url, true).query;
	var target = query.name;
	req.setEncoding('utf-8');
	req.on('data', function (data) {
		io.sockets.emit('log', { target : target, line : data });
	});
});

io.sockets.on('connection', function (socket) {
	var watching = {};
	socket.on('watch', function (data) {
		try {
			if (!watching[data.window]) watching[data.window] = wscreen.watchScreenWindow(data.window, function (line) {
				socket.emit('log', { target: data.window, line : line });
			});
		} catch (e) {
			console.log(e);
		}
	});
	socket.on('unwatch', function (data) {
		if (watching[data.window]) {
			watching[data.window].unwatch();
			delete watching[data.window];
		}
	});

	socket.on('disconnect', function () {
		for (var key in watching) if (watching.hasOwnProperty(key)) {
			watching[key].unwatch();
		}
	});
});

server.listen(3000);

process.on('SIGINT', function () {
	for (var key in io.sockets.sockets) if (io.sockets.sockets.hasOwnProperty(key)) {
		io.sockets.sockets[key].disconnect();
	}
	process.exit();
});

process.on('SIGTERM', function () {
	for (var key in io.sockets.sockets) if (io.sockets.sockets.hasOwnProperty(key)) {
		io.sockets.sockets[key].disconnect();
	}
	process.exit();
});

function serve (url, path) {
	var mount = st({ path : path, url : url, index: 'index.html' });
	return function (req, res) {
		if (!mount(req, res)) throw { code : 404 };
	};
}
