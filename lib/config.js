
var fs = require('fs');

var config = {
	port : 2012
};

try {
	var user = JSON.parse(require('fs').readFileSync(require('path').join(process.env['HOME'], '.imhacker'), 'utf-8'));
	for (var key in user) if (user.hasOwnProperty(key))
		config[key] = user[key];
} catch (e) {
	if (!/ENOENT/.test(e.toString())) {
		console.log(e);
	}
}


module.exports = config;
