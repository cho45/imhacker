var socket = io.connect(location.protocol + '//' + location.host);

ImHacker = {
	parseDateTime : function () {
		var moy = {
			"Jan": 0,
			"Feb": 1,
			"Mar": 2,
			"Apr": 3,
			"May": 4,
			"Jun": 5,
			"Jul": 6,
			"Aug": 7,
			"Sep": 8,
			"Oct": 9,
			"Nov": 10,
			"Dec": 11
		};
		return function (string) {
			var local, tz;
			if (/(\d\d)\/([^\/]+)\/(\d{4}):(\d\d):(\d\d):(\d\d) ([\-\+]\d\d)(\d\d)/.test(string)) {
				// 06/Aug/2012:19:10:14 +0900
				// 手元の時計のタイムゾーンの影響がないように計算する
				local = Date.UTC(+RegExp.$3, moy[RegExp.$2], +RegExp.$1, +RegExp.$4, +RegExp.$5, +RegExp.$6).valueOf() / 1000;
				tz    = (+RegExp.$7 * (60 * 60)) + (+RegExp.$8 * 60);
				return new Date((local - tz) * 1000);
			} else
			if (/(\d\d\d\d)-(\d\d)-(\d\d)[ T]?(\d\d):(\d\d):(\d\d)(?:([\-\+]\d\d):(\d\d)|Z)/.test(string)) {
				// 2012-01-01T00:00:00+09:00
				local = Date.UTC(+RegExp.$1, +RegExp.$2 - 1, +RegExp.$3, +RegExp.$4, +RegExp.$5, +RegExp.$6).valueOf() / 1000;
				tz    = RegExp.$7 ? (+RegExp.$7 * (60 * 60)) + (+RegExp.$8 * 60) : 0;
				return new Date((local - tz) * 1000);
			} else 
			if (/... (...) (\d\d) (\d{4}) (\d\d):(\d\d):(\d\d) GMT([\-\+]\d\d)(\d\d)/.test(string)) {
				// Fri Aug 10 2012 22:12:14 GMT+0900 (JST)
				local = Date.UTC(+RegExp.$3, moy[RegExp.$1], +RegExp.$2, +RegExp.$4, +RegExp.$5, +RegExp.$6).valueOf() / 1000;
				tz    = (+RegExp.$7 * (60 * 60)) + (+RegExp.$8 * 60);
				return new Date((local - tz) * 1000);
			}
		};
	} (),

	timeSlice : 1,
	timeThreshold: 1,
	ignorePath: null,

	init : function () {
		var self = this;
		self.log = $('#log');
		self.code = {
			200 : $('#code-20x'),
			300 : $('#code-30x'),
			400 : $('#code-40x'),
			500 : $('#code-50x')
		};
		self.method = {
			GET    : $('#method-GET'),
			POST   : $('#method-POST'),
			HEAD   : $('#method-HEAD'),
			OTHERS : $('#method-OTHERS')
		};
		self.time = {
			fastest : $('#time-fastest'),
			slowest : $('#time-slowest')
		};
		self.redraw = true;

		self.settings = $('#settings');
		self.settings.form = $('#form-settings');
		self.settings.logFormat = self.settings.form.find('[name="log-format"]');
		self.settings.formatName = self.settings.form.find('[name="format-name"]');
		self.settings.ignorePath = self.settings.form.find('[name="ignore-path"]');
		self.settings.timeThreshold = self.settings.form.find('[name="time-threshold"]');

		self.initStats();

		self.bindEvents();
		self.loadSettings();
		self.prepareSocket();
		self.drawGraphs();

		// $('#windows').find('.btn[data-num=0]').click();

		if (location.hash == '#demo') {
			self.startDemo();
		}
	},

	initStats : function () {
		var self = this;
		self.timeStats = { total: 0, fastest: 1/0, slowest : 0, GET : { total: 0 }, POST : { total: 0 } };
		for (var range = 0; range <= 10000; range += 100) {
			self.timeStats[range] = 0;
			self.timeStats.GET[range] = 0;
			self.timeStats.POST[range] = 0;
		}

		self.codeStats = { 200 : 0, 300: 0, 400: 0, 500: 0, total: 0 };
		self.methodStats = { GET : 0, POST : 0, HEAD: 0, OTHERS : 0 };

		self.requestHistory = [];
		self.requestHistoryMap = {};

		self.errorStats = {};

		self.trackingStats = {};
	},

	loadSettings : function () {
		var self = this;
		if (!localStorage.logFormat) {
			$('#settings').modal();
		}

		self.settings.logFormat.val(localStorage.logFormat ||
			('LogFormat "%h %l %u %t \"%r\" %>s %b \"%{Referer}i\" \"%{User-Agent}i\"" combined') + "\n" +
			('LogFormat "%h %l %u %t \"%r\" %>s %b" common') + "\n" +
			('LogFormat "%{Referer}i -> %U" referer') + "\n" +
			('LogFormat "%{User-agent}i" agent')
		).change();

		self.settings.formatName.val(localStorage.formatName || 'combined');
		self.settings.timeThreshold.val(localStorage.timeThreshold || 1);
		self.settings.ignorePath.val(localStorage.ignorePath || '^/(images|img|css|js|static)/');
		self.updateSettings();
	},

	updateSettings : function () {
		var self = this;
		localStorage.logFormat  = self.settings.logFormat.val();
		localStorage.formatName = self.settings.formatName.val();
		localStorage.timeThreshold = self.settings.timeThreshold.val();
		localStorage.ignorePath = self.settings.ignorePath.val();
		$('#format-name').text(localStorage.formatName);

		self.timeThreshold = +localStorage.timeThreshold;
		self.ignorePath    = new RegExp(localStorage.ignorePath);
	},

	startDemo : function () {
		var self = this;

		var paths = [
			'/',
			'/api/',
			'/api/get',
			'/api/post',
			'/api/user',
			'/log',
			'/2012/',
			'/user/',
			'/entry/',
			'/entry/foobar',
			'/entry/barbaz'
		];

		function ndrand (u, s) {
			return Math.sqrt(-2 * Math.log(Math.random())) * Math.cos(2 * Math.PI * Math.random()) * s + u;
		}

		function lndrand (u, s) {
			return Math.exp(ndrand(Math.log(u * u) - Math.log(u * u + s * s) / 2.0, Math.sqrt(Math.log(1 + s / u * s / u))));
		}

		Array.apply(null, new Array(40)).forEach(function (_, i) {
			(function () {
				var method = (Math.random() < 0.1 ? 'POST' : 'GET');
				var taken = method == 'GET' ? lndrand(200, 700) : lndrand(500, 3000);

				var path  = Math.floor(ndrand(0, 3));
				if (path < 0) path = 0;
				if (path > (paths.length - 1)) path = 0;

				self.updateResponseStats({
					datetime : new Date(),
					method   : method,
					path     : paths[path],
					addr     : "127.0.0." + i,
					code     : (Math.random() < 0.05 ? 500 : Math.random() < 0.15 ? 302 : 200),
					millisec : taken,
					ua       : 'demo'
				});

				var wait = lndrand(5000, 5000);

				if (Math.random() < 0.50) {
					i = Math.floor(Math.random() * 255);
				}

				setTimeout(arguments.callee, wait);
			})();
		});
	},

	prepareSocket : function () {
		var self = this;
		socket.on('log', function (data) {
			try {
			var line = data.line;
			if (!/GET|POST|HEAD|PUT/.test(line)) return;

			// self.updateLog(data);

			var row = {};
			if (localStorage.formatName == 'tsv') {
				var part = line.replace(/^\s+/, '').split(/\t/);
				for (var i = 0, len = part.length; i < len; i++) {
					var kv = part[i].split(/:/);
					row[ kv.shift() ] = kv.join(':');
				}
				var r = row.req.split(/ /);

				row['method']   = r[0];
				row['path']     = r[1];
				row['protocol'] = r[2];
				if (row.status && !row.code) row['code'] = +row.status;
				row['millisec'] = +row['taken'];
				row['datetime'] = ImHacker.parseDateTime(row['time']);
			} else {
				row = ImHacker.AccessLogParser.parse(localStorage.formatName, line);
				if (!row) return;
			}

			if (self.ignorePath.test(row.path)) return;
			self.updateResponseStats(row);
			} catch (e) { alert(e) }
		});
	},

	bindEvents : function () {
		var self = this;
		$('#windows').find('.btn').click(function () {
			var btn = $(this);
			var num = +btn.text();
			if (btn.hasClass('active')) {
				btn.removeClass('active');
				socket.emit('unwatch', { window: num });
			} else {
				btn.addClass('active');
				socket.emit('watch', { window: num });
			}
		});

		var settings = $('#settings');
		settings.find('.btn-primary').click(function () {
			self.updateSettings();
			settings.modal('hide');
		});
		settings.on('hidden', function () {
			self.loadSettings();
		});

		var formSettings = $('#form-settings');
		var formFormatName = formSettings.find('select[name="format-name"]');
		var formLogFormat = formSettings.find('[name="log-format"]');
		formLogFormat.change(function () {
			ImHacker.AccessLogParser.init();
			var lines = this.value.split(/\n/);
			for (var i = 0, len = lines.length; i < len; i++) {
				try {
					ImHacker.AccessLogParser.define(lines[i]);
				} catch (e) {
					alert(e + ' on line ' + (i + 1));
				}
			}

			formFormatName.empty();
			for (var i = 0, it; (it = ImHacker.AccessLogParser.formats[i]); i++) {
				var option = $('<option/>').attr('value', it).text(it).appendTo(formFormatName);
				if (i === 0) option.attr('selected', 'selected');
			}
			$('<option/>').attr('value', 'tsv').text('tsv').appendTo(formFormatName);
		});
	},

	updateLog : function (data) {
		var log = this.log;
		var line = $('<div/>').text('[' + data.target + '] ' + data.line).prependTo(log);
		log.find('div:gt(5)').remove();

		setTimeout(function () {
			line.fadeOut('fast', function () {
				line.remove();
			});
		}, 5000);
	},

	updateResponseStats : function (row) {
		var self = this;
		var timeStats = self.timeStats;

		if (typeof row.millisec == 'number' && !isNaN(row.millisec)) {
			var millisec = row.millisec;
			var range    = Math.ceil(millisec / 100) * 100;
			if (range > 10000) range = 10000; // over 10 sec
			timeStats[range]++;
			timeStats.total++;

			if (timeStats[row.method]) {
				timeStats[row.method][range]++;
				timeStats[row.method].total++;
			}

			if (timeStats.fastest > millisec) timeStats.fastest = millisec;
			if (timeStats.slowest < millisec) timeStats.slowest = millisec;

			if (millisec > self.timeThreshold * 1000) {
				appendError('slow (' + (millisec / 1000).toFixed(2) + ' sec)', row.path.replace(/\?.+$/, ''));
			}
		}

		if (row.code) {
			var x = Math.floor(row.code / 100) * 100;
			self.codeStats[x]++;
			self.codeStats.total++;

			if (x == 500) {
				appendError(row.code, row.path);
			}
		}

		if (row.method) {
			self.methodStats[row.method]++;
		}

		if (row.datetime) {
			var timeSlice = Math.floor(row.datetime.getTime() / 1000 / self.timeSlice) * self.timeSlice; // per 3sec
			if (!self.requestHistoryMap[timeSlice]) {
				self.requestHistoryMap[timeSlice] = { time : timeSlice, count: 1 };
				self.requestHistory.push(self.requestHistoryMap[timeSlice]);
			} else {
				self.requestHistoryMap[timeSlice].count++;
			}
		}

		if (row.addr) {
			var id = row.addr;
			if (!self.trackingStats[id]) {
				self.trackingStats[id] = {
					x : Math.random(),
					id : id,
					color: '#' + Math.random().toString(16).slice(2, 8),
					log : []
				};
			}

			self.trackingStats[id].log.unshift({
				method : row.method,
				path : row.path,
				time : row.datetime / 1000
			});
		}

		self.redraw = true;

		function appendError (error, path) {
			if (!self.errorStats[path]) {
				self.errorStats[path] = {
					error: error,
					path: path,
					time: new Date().getTime(),
					count: 1
				};
			} else {
				self.errorStats[path].count++;
				self.errorStats[path].error = error;
				self.errorStats[path].time = new Date().getTime();
			}
		}
	},

	drawGraphs : function () {
		var self = this;

		requestAnimationFrame(function () {
			if (self.redraw) {
				drawTimeStats();
				drawCodeStats();
				drawMethodStats();
				drawErrorStats();
				self.redraw = false;
			}
			drawRequestHistory();
			drawTrackingStats();
			requestAnimationFrame(arguments.callee);
		});

		function drawErrorStats () {
			var errorStats = self.errorStats;
			var container  = $('#error-stats');

			var errors = [];
			for (var key in errorStats) if (errorStats.hasOwnProperty(key))
				errors.push(errorStats[key]);

			errors.sort(function (a, b) {
				return b.time - a.time;
			});

			while (errors.length > 7) {
				delete errorStats[errors.pop().path];
			}

			container.empty();
			for (var i = 0, it; (it = errors[i]); i++) {
				var row = $('<tr></tr>').appendTo(container);
				$('<th><span class="label label-important"></span></th>').find('span').text(it.error).end().appendTo(row);
				$('<th></th>').text(it.path).appendTo(row);
				$('<td></td>').text(it.count).appendTo(row);
			}
		}

		function drawTimeStats () {
			var timeStats = self.timeStats;
			var canvas = document.getElementById('time-graph');
			var ctx    = canvas.getContext('2d');
			var w      = +canvas.width;
			var h      = +canvas.height;

			// x = millisec
			// y = %
			ctx.clearRect(0, 0, w, h);

			ctx.lineWidth = 1;
			ctx.font = "10px Arial";

			for (var i = 0; i < 10; i++) {
				if (i > 0) {
					ctx.fillStyle = "#333333";
					ctx.fillRect(w / 10 * i, 0, 1, h);
					ctx.fillRect(0, h / 10 * i, w, 1);
				}

				ctx.fillStyle = "#999999";
				ctx.fillText(i + "sec", w / 10 * i + 3, h - 2);
				ctx.fillText((100 - i * 10) + "%", 2, h / 10 * i + 10);
			}

			ctx.lineWidth = 5;
			(function () {
				ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
				ctx.beginPath();
				ctx.moveTo(0, h);
				for (var range = 0, count = 0; range <= 10000; range += 100) {
					count += timeStats[range];
					var rate = count / timeStats.total;
					ctx.lineTo(w / 10000 * range, h * (1 - rate));
				}
				ctx.stroke();
			})();

			ctx.lineWidth = 3;

			(function () {
				ctx.strokeStyle = "#F89406";
				ctx.beginPath();
				ctx.moveTo(0, h);
				for (var range = 0, count = 0; range <= 10000; range += 100) {
					count += timeStats.POST[range];
					var rate = count / timeStats.POST.total;
					ctx.lineTo(w / 10000 * range, h * (1 - rate));
				}
				ctx.stroke();
			})();

			(function () {
				ctx.strokeStyle = "#468847";
				ctx.beginPath();
				ctx.moveTo(0, h);
				for (var range = 0, count = 0; range <= 10000; range += 100) {
					count += timeStats.GET[range];
					var rate = count / timeStats.GET.total;
					ctx.lineTo(w / 10000 * range, h * (1 - rate));
				}
				ctx.stroke();
			})();

			self.time.fastest.text(Math.floor(self.timeStats.fastest) + ' msec');
			self.time.slowest.text(Math.floor(self.timeStats.slowest) + ' msec');
		}

		function drawCodeStats () {
			var codeStats = self.codeStats;
			for (var key in codeStats) if (codeStats.hasOwnProperty(key)) {
				if (!self.code[key]) continue;
				var percent = Math.round(codeStats[key] / codeStats.total * 100);
				self.code[key].text(codeStats[key] + ' (' + percent + '%)');
			}
		}

		function drawMethodStats () {
			var methodStats = self.methodStats;
			for (var key in methodStats) if (methodStats.hasOwnProperty(key)) {
				if (!self.method[key]) continue;
				self.method[key].text(methodStats[key]);
			}
		}

		function drawRequestHistory () {
			var requestHistoryMap = self.requestHistoryMap;
			var requestHistory = self.requestHistory;
			var canvas = document.getElementById('history-graph');
			var ctx    = canvas.getContext('2d');
			var w      = +canvas.width;
			var h      = +canvas.height;

			var barw   = 5;
			var len    = w / barw;

			while (self.requestHistory.length > len) {
				var tooOld = self.requestHistory.shift();
				delete self.requestHistoryMap[tooOld.time];
			}

			var max = 0;
			for (var i = 0, it; (it = requestHistory[i]); i++) if (it.count > max) max = it.count;

			var scale = Math.max(Math.ceil(max / 10) * 10, 10);

			// x = millisec
			// y = %
			ctx.clearRect(0, 0, w, h);

			ctx.lineWidth = 1;
			ctx.fillStyle   = "#999999";
			ctx.font = "10px Arial";
			ctx.fillText(scale / 2 + ' req/sec', 2, h / 2 - 2); // '
			ctx.fillStyle   = "#333333";
			ctx.fillRect(0, h / 2, w, 1);

			var now = Math.floor(new Date().getTime() / 1000 / self.timeSlice) * self.timeSlice;
			for (var i = 0; i <= len; i++) {
				ctx.fillStyle = (now % 2 === 0) ? "#999999" : "#666666";
				if (requestHistoryMap[now]) {
					var rh = requestHistoryMap[now].count / scale * h;
					var x  = w - (i * 5);
					var y  = h - rh;
					ctx.fillRect(x, y, 5, rh);
				}
				now = now - self.timeSlice;
			}
		}

		function drawTrackingStats () {
			var canvas = document.getElementById('tracking-graph');
			var ctx = canvas.getContext('2d');
			var w   = +canvas.width;
			var h   = +canvas.height;

			var ph  = 10; // pixel/sec

			var data = self.trackingStats;

			var now = new Date().getTime() / 1000;

			ctx.clearRect(0, 0, w, h);
			ctx.font = "10px Arial";

			ctx.save();
			for (var id in data) if (data.hasOwnProperty(id)) {
				var d = data[id];
				if (d.log[0].time < now - 60) {
					delete data[id];
					continue;
				}
				if (d.log.length < 2) continue;

				ctx.fillStyle = d.color;
				ctx.strokeStyle = d.color;

				var x = d.x * w;

				ctx.beginPath();
				ctx.moveTo(x, (now - d.log[0].time) * ph);
				ctx.lineTo(x, (now - d.log[d.log.length - 1].time) * ph);
				ctx.stroke();
				ctx.fillText(id, x - 5, (now - d.log[0].time) * ph - 10);

				ctx.beginPath();
				for (var i = 0, it; (it = d.log[i]); i++) {
					var y = (now - it.time) * ph;
					ctx.fillText(it.method + ' ' + it.path, x + 7, y + 3);
					ctx.arc(x, y, 5, 0, (Math.PI / 180) * 360, false);
				}
				ctx.fill();
				ctx.restore();
			}
		}

		function requestAnimationFrame (callback) {
			// (window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.msRequestAnimationFrame || setTimeout)(callback, 16);
			setTimeout(callback, 200);
		}
	}
};

ImHacker.AccessLogParser = {
	_formats : {},
	formats : [],
	init : function () { this.formats = []; this._formats = {} },

	define : function (line) {
		var m = line.match(/^\s*LogFormat\s+"((?:\\\\|\"|[^\"])+)"\s+(\S+)\s*$/);
		if (!m) throw "failed to parse LogFormat";
		var fields = [];
		var name = m[2];
		var format = m[1].replace(/\\"/g, '"').replace(/\\t/g, "\t").replace(/%[<>\d,]*(\w|\{[^\}]+\}\w)/g, function (_, type) {
			fields.push(type);
			return { t: '\\[([^\\]]+?)\\]', r : '(.+?)' }[type] || /\{/.test(type) ? '(.+?)' : '(\\S*)';
		}).replace(/%%/g, "%");
		this._formats[name] = {
			fields : fields,
			regexp : new RegExp(format)
		};
		this.formats.push(name);
	},

	parse : function (name, line) {
		var fields = this._formats[name].fields;
		var regexp = this._formats[name].regexp;
		var m = line.match(regexp);
		if (!m) return null;
		var ret = {};
		for (var i = 0, len = fields.length; i < len; i++) {
			ret[fields[i]] = m[i+1];
		}
		if (ret['r']) {
			var r = ret['r'].split(/ /);
			ret['method']   = r[0];
			ret['path']     = r[1];
			ret['protocol'] = r[2];
		}
		ret['code'] = +ret['s'];
		ret['millisec'] =
			ret['D'] ? +ret['D'] / 1000:
			ret['d'] ? +ret['d'] * 1000:
			NaN;
		ret['datetime'] = ImHacker.parseDateTime(ret['t']);
		ret['addr']     = ret['a'] || ret['h'];
		return ret;
	}
};

ImHacker.UserAgent = {
	isBot : function (str) {
		return (/crawler|bot|spider/i).test(str);
	},

	isTouch : function (str) {
		return (/(?:Nintendo (?:3DS|DSi)|iP(?:[ao]d|hone))/).test(str);
	}
};

$(function () {
	ImHacker.init();
});
