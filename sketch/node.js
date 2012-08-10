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

function nrand (u, s) {
	return Math.sqrt(-2 * Math.log(Math.random())) * Math.cos(2 * Math.PI * Math.random()) * s + u;
}

Array.apply(null, new Array(40)).forEach(function (_, i) {
	(function () {
		var method = (Math.random() < 0.1 ? 'POST' : 'GET');
		var taken = method == 'GET' ? nrand(200, 700) : nrand(500, 3000);
		if (taken < 0) taken = 0;

		var path  = Math.floor(nrand(0, 1));
		if (path < 0) path = 0;
		if (path > (paths.length - 1)) path = 0;

		console.log([
			"time:" + new Date().toString(),
			"req:" + method + " " + paths[path] + " HTTP/1.0",
			"addr:127.0.0." + i,
			"status:" + (Math.random() < 0.05 ? 500 : (Math.floor(Math.random() * 2 + 2) * 100)),
			"taken:" + taken,
			"ua:stdin"
		].join("\t"));

		var wait = nrand(5000, 5000);
		if (wait < 0) wait = 0;
		setTimeout(arguments.callee, wait);
	})();
});
