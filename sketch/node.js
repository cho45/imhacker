#!node

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

		console.log([
			"time:" + new Date().toString(),
			"req:" + method + " " + paths[path] + " HTTP/1.0",
			"addr:127.0.0." + i,
			"status:" + (Math.random() < 0.05 ? 500 : Math.random() < 0.15 ? 302 : 200),
			"taken:" + taken,
			"ua:stdin"
		].join("\t"));

		var wait = lndrand(5000, 5000);

		if (Math.random() < 0.50) {
			i = Math.floor(Math.random() * 255);
		}

		setTimeout(arguments.callee, wait);
	})();
});
