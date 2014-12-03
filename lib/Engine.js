var Util = require('./Util');
var AbstractCommand = require('./AbstractCommand');

module.exports = Util.Class({
	base: './',
	ext: '.tpl',

	commandOpener: '{',
	commandCloser: '}',

	// regular expression compiled from `commandSet`
	commandSearcher: null,
	// all command registered by type word
	commandMap: {},
	// ['{', '$', '?', '#', '/'] // etc.
	commandSet: [],

	templates: {
		// name: {
		// 	source: '{{ test }}',
		// 	resolved: '{{ test }}',
		// 	resolvedAst: {
		// 		layout: 'parent',
		// 		blocks: {
		// 			a: [],
		// 			b: []
		// 		}
		// 	},
		// 	ast: [
		// 		{
		// 			type: 'var',
		// 			token: {name: 'test'}
		// 		}
		// 	],
		// 	fn: function () {return this.name;}
		// }
	},

	constructor: function (name) {
		this.name = name;
	},

	registerCommand: function (Command) {
		var type = Command.prototype.type;
		if (typeof Command.prototype.matcher == 'string') {
			Command.prototype.matcher = new RegExp(Util.escapeRegExp(this.commandOpener + type) +
				Command.prototype.matcher +
				Util.escapeRegExp(this.commandCloser));
		}
		this.commandMap[type] = Command;
		this.commandSet.push(type);
		this.commandSearcher = new RegExp(Util.escapeRegExp(this.commandOpener) +
			'(' + this.commandSet.map(Util.escapeRegExp).join('|') + ')');
	},

	load: function (name) {
		var source = '';
		if (typeof module != 'undefined' && typeof exports != 'undefined' && typeof window == 'undefined') {
			var fs = require('fs');
			var path = require('path');

			source = fs.readFileSync(path.join(this.base, name), {encoding: 'utf8'});
		} else {

		}

		return this.read(source, name);
	},

	read: function (source, name) {
		return this.templates[name] = {
			source: source
		};
	},

	get: function (name) {
		var tpl = this.templates[name];
		if (!tpl) {
			tpl = this.load(name);
		}
		return tpl;
	},

	parse: function(name) {
		var tpl = this.get(name);

		if (tpl.ast) {
			return tpl.ast;
		}

		var content = tpl.source;
		var remain = content;
		var stream = new AbstractCommand({
			stackable: true
		});
		tpl.current = stream.stack;
		var stack = [tpl.current];

		tpl.ast = stream;

		while(remain) {
			var pos = remain.search(this.commandSearcher);
			if (~pos) {
				var str = remain.slice(0, pos);
				remain = remain.slice(pos);
				if (str) {
					tpl.current.push(str);
				}

				var CommandClass = this.commandMap[RegExp.$1];
				if (!CommandClass) {
					continue;
				}
				var command = new CommandClass({
					template: name
				});
				var commandRe = command.matcher;
				var matcher = remain.match(commandRe);
				if (matcher) {
					var len = matcher[0].length;
					remain = remain.slice(len);
					if (command.ending || command.alternative) {
						stack.pop();
						tpl.current = stack[stack.length - 1];
					}
					if (!command.ending) {
						command.build.apply(command, matcher);
						
						if (!command.ignore) {
							tpl.current.push(command);
						}

						if (command.stackable) {
							stack.push(tpl.current = command.stack);
						}
					}
				} else {
					throw new Error('[yust] Match failed. Template command syntax error after "' + command.type + '".');
				}
			} else {
				tpl.current.push(remain);
				remain = '';
			}
		}

		if (tpl.current != stream.stack) {
			throw new Error('[yust] Template command unclosed.');
		}

		return tpl.ast;
	},

	compile: function (name) {
		var tpl = this.get(name);
		if (tpl.fn) {
			return tpl.fn;
		}
		var ast = this.parse(name);
		var fn = 'if (arguments[0] != null && arguments[0] !== this)' +
			'return arguments.callee.call(arguments[0]);' +
			'var ' + this.constructor.VARIABLE_NAME + '="";' +
			ast.compile({
				variable: this.constructor.VARIABLE_NAME
			}) +
			'return ' + this.constructor.VARIABLE_NAME + ';';

		return tpl.fn = new Function(fn);
	},

	render: function (name, data) {
		var fn = this.compile(name);
		return fn.call(data);
	}
});

module.exports.VARIABLE_NAME = Math.E.toString(36).slice(2);
