#!/usr/bin/env node

var http    = require('http');
var express = require('express');
var path = require('path');

var wscreen  = require('./watch_screen');


var app    = express();
var server = http.createServer(app);
var io     = require('socket.io').listen(server);

app.configure(function(){
	app.set('views', __dirname + '/views');
	app.set('view engine', 'ejs');
	app.use(express.favicon());
	app.use(express.logger('dev'));
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(app.router);
	app.use(express.static(path.join(__dirname, 'static'))); // no warnings
});

app.configure('development', function(){
	app.use(express.errorHandler());
});

app.get('/', function (req, res) {
	res.render('index', {});
});

io.sockets.on('connection', function (socket) {
	var watching = {};
	socket.on('watch', function (data) {
		if (!watching[data.window]) watching[data.window] = wscreen.watchScreenWindow(data.window, function (line) {
			socket.emit('log', { target: data.window, line : line });
		});
	});
	socket.on('unwatch', function (data) {
		if (watching[data.window]) {
			watching[data.window].unwatch();
			delete watching[data.window];
		}
	});

	socket.on('disconnect', function () {
		io.sockets.emit('user disconnected');
	});
});


server.listen(3000);
