ImHacker
========

ImHacker is a real-time access log analyzer.


Usage
=====

You must use GNU screen because ImHacker uses the feature of screen log.
You just run tail -f command on any window, and tell the window number to ImHacker.

	$ npm install # install dependencies
	$ node app.js

Demo
====

http://localhost:3000/#demo

Scripting
=========

bin/imhacker-in: read stdin and send it to ImHacker server (& client)

