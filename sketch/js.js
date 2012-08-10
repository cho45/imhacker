
var data = {};
var now = new Date().getTime() / 1000;

data['xxx'] = {
	x : 10,
	id: 'xxx',
	color: '#990000',
	log : [
		{
			method : 'GET',
			path   : '/3',
			time   : now - 3
		},
		{
			method : 'GET',
			path   : '/2',
			time   : now - 5
		},
		{
			method : 'GET',
			path   : '/1',
			time   : now - 10
		},
		{
			method : 'GET',
			path   : '/',
			time   : now - 12
		}
	]
};

data['yyy'] = {
	x : 40,
	id: 'yyy',
	color: '#999900',
	log : [
		{
			method : 'GET',
			path   : '/1',
			time   : now - 10
		},
		{
			method : 'GET',
			path   : '/',
			time   : now - 15
		}
	]
};

window.onload = function () {
	var canvas = document.getElementById('tracking');
	var ctx = canvas.getContext('2d');
	var w   = +canvas.width;
	var h   = +canvas.height;

	var ph  = 10; // pixel/sec

	setTimeout(function () {
		var now = new Date().getTime() / 1000;

		ctx.clearRect(0, 0, w, h);
		ctx.font = "10px Arial";

		ctx.save();
		for (var id in data) if (data.hasOwnProperty(id)) {
			var d = data[id];
			ctx.fillStyle = d.color;
			ctx.strokeStyle = d.color;

			ctx.beginPath();
			ctx.moveTo(d.x, (now - d.log[0].time) * ph);
			ctx.lineTo(d.x, (now - d.log[d.log.length - 1].time) * ph);
			ctx.stroke();
			ctx.fillText(id, d.x - 5, (now - d.log[0].time) * ph - 10);

			ctx.beginPath();
			for (var i = 0, it; (it = d.log[i]); i++) {
				var y = (now - it.time) * ph;
				ctx.fillText(it.method + ' ' + it.path, d.x + 7, y + 3);
				ctx.arc(d.x, y, 5, 0, (Math.PI / 180) * 360, false);
			}
			ctx.fill();
			ctx.restore();
		}

		setTimeout(arguments.callee, 1000);
	}, 10);
};
