var socket = io.connect(location.protocol + '//' + location.host);

ImHacker = {
	init : function () {
		var self = this;
		self.log = $('#log');
		self.stats = { total: 0 };
		for (var range = 0; range <= 10000; range += 100) self.stats[range] = 0;

		self.prepareSocket();
		self.bindEvents();
		self.updateGraphs();

		$('#windows').find('.btn[data-num=0]').click();
	},

	prepareSocket : function () {
		var self = this;
		socket.on('log', function (data) {
			try {
			var line = data.line;
			if (!/GET|POST|HEAD|PUT/.test(line)) return;

			self.updateLog(line);

			var row = {};
			var part = line.split(/\t/);
			for (var i = 0, len = part.length; i < len; i++) {
				var kv = part[i].split(/:/);
				row[ kv[0] ] = kv[1];
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
	},

	updateLog : function (line) {
		var log = this.log;
		$('<div/>').text(line).prependTo(log);
		log.find('div:gt(20)').remove();
	},

	updateResponseStats : function (row) {
		var self = this;
		var stats = self.stats;
		var millisec = +row.taken * 10000;
		var range    = Math.ceil(millisec / 100) * 100;
		if (range > 10000) range = 10000; // over 10 sec
		stats[range]++;
		stats.total++;
	},

	updateGraphs : function () {
		var self = this;
		var stats = self.stats;

		var canvas = document.getElementById('time-graph');
		var ctx    = canvas.getContext('2d');
		var w      = +canvas.width;
		var h      = +canvas.height;

		requestAnimationFrame(function () {
			// x = millisec
			// y = %
			ctx.clearRect(0, 0, w, h);

			ctx.lineWidth = 1;
			ctx.strokeStyle = "#999999";

			ctx.beginPath();
			for (var i = 0; i < 10; i++) {
				ctx.moveTo(w / 10 * i, 0);
				ctx.lineTo(w / 10 * i, h);

				ctx.moveTo(0, h / 10 * i);
				ctx.lineTo(w, h / 10 * i);
			}
			ctx.stroke();

			ctx.lineWidth = 3;
			ctx.strokeStyle = "#990000";

			ctx.beginPath();
			ctx.moveTo(0, h);
			for (var range = 0, count = 0; range <= 10000; range += 100) {
				count += stats[range];
				var rate = count / stats.total;
				ctx.lineTo(w / 10000 * range, h * (1 - rate));
			}
			ctx.stroke();

			requestAnimationFrame(arguments.callee);
		});

		function requestAnimationFrame (callback) {
			(window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.msRequestAnimationFrame || setTimeout)(callback, 16);
		}
	}
};

$(function () {
	ImHacker.init();
});
