ImHacker
========

https://github.com/cho45/imhacker

ImHacker is a real-time access log analyzer.


Usage
=====

You must use GNU screen because ImHacker uses the feature of screen log.
You just run tail -f command on any window, and tell the window number to ImHacker.

	$ npm install # install dependencies
	$ node app.js # http://localhost:2012/

Run tail -f command on any other GNU screen window, and click on the button on ImHacker.

## Setting

On first access, ImHacker open the setting window to set a format of log.
In most every case, you just copy and paste LogFormat line from your apache.conf to the textarea.

Demo
====

http://localhost:2012/#demo (GNU screen is not required)

Scripting
=========

bin/imhacker-in: read stdin and send it to ImHacker server (& client)


LICENSE
=======

MIT: http://cho45.github.com/mit-license
