#!node

Array.apply(null, new Array(30)).forEach(function (_, i) {
	(function () {
		console.log([
			"time:" + new Date().toString(),
			"req:GET / HTTP/1.0",
			"addr:127.0.0." + i,
			"status:" + Math.floor(Math.random() * 3 + 2) * 100,
			"taken:" + Math.random() * 3,
			"ua:stdin"
		].join("\t"));

		setTimeout(arguments.callee, Math.random() < 0.9 ? Math.random() * 5000 : 650000);
	})();
});
