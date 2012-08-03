#!node
var os = require('os');
var fs = require('fs');
var child_process = require('child_process');

var watching = {};

function watchScreenWindow (target, callback) {
	if (!watching[target]) {
		watching[target] = { callbacks : [ callback ] };

		var logfile = os.tmpDir() + 'imhacker' + Math.random().toString(32);
		child_process.spawn('screen', ["-X", "eval", "select " + target, "log off", "logfile " + logfile, "logfile flush 1", "log on", "select " + process.env['WINDOW']]).on('exit', function () {
			var fd, buffers = [];
			while (1) try {
				watching[target].watcher = fs.watch(logfile, function (e) {
					if (!fd) {
						fs.open(logfile, 'r', function (err, d) {
							if (err) throw err;
							console.log('file opned: ' + d);
							fd = d;
							read();
						});
					} else {
						read();
					}

					function read () {
						var buffer = new Buffer(1024);
						fs.read(fd, buffer, 0, 1024, null, function (err, bytesRead, buffer) {
							if (err) throw err; if (!bytesRead) return;
							for (var i = 0, len = bytesRead; i < len; i++) {
								if (buffer[i] == 10) { // \n
									buffers.push(buffer.slice(0, buffer[i - 1] == 13 ? i - 1 : i));
									var line = Buffer.concat(buffers).toString();
									buffers = [];
									buffer  = buffer.slice(i);
									len = bytesRead = bytesRead - i;
									i = 0;

									for (var j = 0, it; (it = watching[target].callbacks[j]); j++) it(line);
								}
							}
							buffers.push(buffer.slice(0, bytesRead));
							if (bytesRead) read();
						});
					}
				});
				break;
			} catch (e) {
				console.log(e);
			}
		});
	} else {
		watching[target].callbacks.push(callback);
	}

	console.log('watch[%s]: %d', target, watching[target].callbacks.length);
	return {
		target : target,
		unwatch : function () {
			_unwatchScreenWindow(target, callback);
		}
	};
}

function _unwatchScreenWindow (target, callback) {
	if (!watching[target]) return;

	for (var i = 0, it; (it = watching[target].callbacks[i]); i++) {
		if (it == callback) {
			watching[target].callbacks.splice(i, 1);
		}
	}
	console.log('unwatch[%s]: %d', target, watching[target].callbacks.length);

	if (!watching[target].callbacks.length) {
		console.log('empty callbacks...');
		watching[target].watcher.close();
		child_process.spawn('screen', ["-X", "eval", "select " + target, "log off", "select " + process.env['WINDOW']]).on('exit', function () { });
		delete watching[target];
	}
}

watchScreenWindow(0, function (line) {
	console.log(line);
});

this.watchScreenWindow = watchScreenWindow;
