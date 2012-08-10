#!node

(function () {
	console.log([
		"time:" + new Date().toString(),
		"req:GET / HTTP/1.0",
		"addr:127.0.0.1",
		"status:" + Math.floor(Math.random() * 3 + 2) * 100,
		"taken:" + Math.random() * 3,
		"ua:stdin"
	].join("\t"));

	setTimeout(arguments.callee, Math.random() * 3000);
})();

