var socket = io.connect(location.protocol + '//' + location.host);

$(function () {
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

	var log = $('#log');

	socket.on('log', function (data) {
		var line = data.line;
		if (!/GET|POST|HEAD|PUT/.test(line)) return;

		$('<div/>').text(line).prependTo(log);
		log.find('div:gt(20)').remove();

		var row = {};
		var part = line.split(/\t/);
		for (var i = 0, len = part.length; i < len; i++) {
			var kv = part[i].split(/:/);
			row[ kv[0] ] = kv[1];
		}
		console.log(row);
	});
});
