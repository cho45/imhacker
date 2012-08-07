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
				// 手元の時計のタイムゾーンの影響がないように計算する
				local = Date.UTC(+RegExp.$3, moy[RegExp.$2], +RegExp.$1, +RegExp.$4, +RegExp.$5, +RegExp.$6).valueOf() / 1000;
				tz    = (+RegExp.$7 * (60 * 60)) + (+RegExp.$8 * 60);
				return new Date((local - tz) * 1000);
			} else
			if (/(\d\d\d\d)-(\d\d)-(\d\d)[ T]?(\d\d):(\d\d):(\d\d)(?:([\-\+]\d\d):(\d\d)|Z)/.test(string)) {
				local = Date.UTC(+RegExp.$1, +RegExp.$2 - 1, +RegExp.$3, +RegExp.$4, +RegExp.$5, +RegExp.$6).valueOf() / 1000;
				tz    = RegExp.$7 ? (+RegExp.$7 * (60 * 60)) + (+RegExp.$8 * 60) : 0;
				return new Date((local - tz) * 1000);
			}
		};
	} (),

	timeSlice : 1,

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

		self.initStats();

		self.bindEvents();
		self.loadSettings();
		self.prepareSocket();
		self.updateGraphs();

		// $('#windows').find('.btn[data-num=0]').click();
	},

	initStats : function () {
		var self = this;
		self.timeStats = { total: 0, fastest: 1/0, slowest : 0 };
		for (var range = 0; range <= 10000; range += 100) self.timeStats[range] = 0;

		self.codeStats = { 200 : 0, 300: 0, 400: 0, 500: 0, total: 0 };
		self.methodStats = { GET : 0, POST : 0, HEAD: 0, OTHERS : 0 };
		self.requestHistory = [];
		self.requestHistoryMap = {};
	},

	loadSettings : function () {
		var self = this;
		self.settings.logFormat.val(localStorage.logFormat ||
			('LogFormat "%h %l %u %t \"%r\" %>s %b \"%{Referer}i\" \"%{User-Agent}i\"" combined') + "\n" +
			('LogFormat "%h %l %u %t \"%r\" %>s %b" common') + "\n" +
			('LogFormat "%{Referer}i -> %U" referer') + "\n" +
			('LogFormat "%{User-agent}i" agent')
		).change();

		self.settings.formatName.val(localStorage.formatName || 'combined');
		self.updateSettings();
	},

	updateSettings : function () {
		var self = this;
		localStorage.logFormat  = self.settings.logFormat.val();
		localStorage.formatName = self.settings.formatName.val();
		$('#format-name').text(localStorage.formatName);
	},

	prepareSocket : function () {
		var self = this;
		socket.on('log', function (data) {
			try {
			var line = data.line;
			if (!/GET|POST|HEAD|PUT/.test(line)) return;

			self.updateLog(data);

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
				row['protocol'] = r[1];
				if (row.status && !row.code) row['code'] = +row.status;
				row['millisec'] = +row['taken'];
				row['datetime'] = ImHacker.parseDateTime(row['time']);
			} else {
				row = ImHacker.AccessLogParser.parse(localStorage.formatName, line);
				if (!row) return;
			}

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
			if (timeStats.fastest > millisec) timeStats.fastest = millisec;
			if (timeStats.slowest < millisec) timeStats.slowest = millisec;
		}

		if (row.code) {
			self.codeStats[Math.floor(row.code / 100) * 100]++;
			self.codeStats.total++;
		}

		if (row.method) {
			self.methodStats[row.method]++;
		}

		if (row.datetime) {
			var timeSlice = Math.floor(row.datetime.getTime() / 1000 / self.timeSlice) * self.timeSlice; // per 3sec
			if (!self.requestHistoryMap[timeSlice]) {
				self.requestHistoryMap[timeSlice] = { time : timeSlice, count: 1 };
				self.requestHistory.push(self.requestHistoryMap[timeSlice]);
				while (self.requestHistory.length > 1000) {
					var tooOld = self.requestHistory.shift();
					delete self.requestHistoryMap[tooOld.time];
				}
			} else {
				self.requestHistoryMap[timeSlice].count++;
			}
		}

		self.redraw = true;
	},

	updateGraphs : function () {
		var self = this;

		requestAnimationFrame(function () {
			if (self.redraw) {
				updateTimeStats();
				updateCodeStats();
				updateMethodStats();
				self.redraw = false;
			}
			updateRequestHistory();
			requestAnimationFrame(arguments.callee);
		});

		function updateTimeStats () {
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
					ctx.fillStyle = "#CCCCCC";
					ctx.fillRect(w / 10 * i, 0, 1, h);
					ctx.fillRect(0, h / 10 * i, w, 1);
				}

				ctx.fillStyle = "#999999";
				ctx.fillText(i + "sec", w / 10 * i + 3, h - 2);
				ctx.fillText((100 - i * 10) + "%", 2, h / 10 * i + 10);
			}

			ctx.lineWidth = 3;
			ctx.strokeStyle = "#990000";

			ctx.beginPath();
			ctx.moveTo(0, h);
			for (var range = 0, count = 0; range <= 10000; range += 100) {
				count += timeStats[range];
				var rate = count / timeStats.total;
				ctx.lineTo(w / 10000 * range, h * (1 - rate));
			}
			ctx.stroke();

			self.time.fastest.text(self.timeStats.fastest.toFixed(2));
			self.time.slowest.text(self.timeStats.slowest.toFixed(2));
		}

		function updateCodeStats () {
			var codeStats = self.codeStats;
			for (var key in codeStats) if (codeStats.hasOwnProperty(key)) {
				if (!self.code[key]) continue;
				self.code[key].text(codeStats[key]);
			}
		}

		function updateMethodStats () {
			var methodStats = self.methodStats;
			for (var key in methodStats) if (methodStats.hasOwnProperty(key)) {
				if (!self.method[key]) continue;
				self.method[key].text(methodStats[key]);
			}
		}

		function updateRequestHistory () {
			var requestHistoryMap = self.requestHistoryMap;
			var requestHistory = self.requestHistory;
			var canvas = document.getElementById('history-graph');
			var ctx    = canvas.getContext('2d');
			var w      = +canvas.width;
			var h      = +canvas.height;

			var barw   = 5;

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
			ctx.fillStyle   = "#CCCCCC";
			ctx.fillRect(0, h / 2, w, 1);

			var now = Math.floor(new Date().getTime() / 1000 / self.timeSlice) * self.timeSlice;
			for (var i = 0, len = w / 5; i < len; i++) {
				ctx.fillStyle = (now % 2 === 0) ? "#999999" : "#cccccc";
				if (requestHistoryMap[now]) {
					var rh = requestHistoryMap[now].count / scale * h;
					var x  = w - (i * 5);
					var y  = h - rh;
					ctx.fillRect(x, y, 5, rh);
				}
				now = now - self.timeSlice;
			}
		}

		function requestAnimationFrame (callback) {
			// (window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.msRequestAnimationFrame || setTimeout)(callback, 16);
			setTimeout(callback, 1000);
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
			ret['protocol'] = r[1];
		}
		ret['code'] = +ret['s'];
		ret['millisec'] =
			ret['D'] ? +ret['D'] / 1000:
			ret['d'] ? +ret['d'] * 1000:
			NaN;
		ret['datetime'] = ImHacker.parseDateTime(ret['t']);
		return ret;
	}
};

$(function () {
	ImHacker.init();
});
