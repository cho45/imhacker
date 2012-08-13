ImHacker
========

ImHacker is a real-time access log analyzer.


Usage
=====

You must use GNU screen because ImHacker uses the feature of screen log.
You just run tail -f command on any window, and tell the window number to ImHacker.

	$ npm install # install dependencies
	$ node app.js # http://localhost:3000/

Run tail -f command on any other GNU screen window, and click on the button on ImHacker.

Demo
====

http://localhost:3000/#demo (GNU screen is not required)

Scripting
=========

bin/imhacker-in: read stdin and send it to ImHacker server (& client)

