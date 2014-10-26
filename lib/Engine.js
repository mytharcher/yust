var Util = require('./Util');

module.exports = Util.Class({
	outputVariable: Math.E.toString(36).slice(2),

	commandOpener: '{',
	commandCloser: '}',
	commandSearcher: null,
	commandMap: {},
	commandSet: [],


	constructor: function (name) {
		this.name = name;
	},

	registerCommand: function (Command) {
		var type = Command.prototype.type;
		if (typeof Command.prototype.matcher == 'string') {
			Command.prototype.matcher = new RegExp(Util.escapeRegExp(this.commandOpener) +
				Command.prototype.matcher +
				Util.escapeRegExp(this.commandCloser));
		}
		this.commandMap[type] = Command;
		this.commandSet.push(type);
		this.commandSearcher = new RegExp(Util.escapeRegExp(this.commandOpener) +
			'(' + this.commandSet.map(Util.escapeRegExp).join('|') + ')');
	},

	parse: function(content) {
		var stream = [];
		var remain = content;
		var stack = [stream];
		var current = stream;
		while(remain) {
			var pos = remain.search(this.commandSearcher);
			if (~pos) {
				var str = remain.slice(0, pos);
				remain = remain.slice(pos);
				if (str) {
					current.push(str);
				}

				var CommandType = this.commandMap[RegExp['\x241']];
				if (!CommandType) {
					continue;
				}
				var command = new CommandType({engine: this});
				var commandRe = command.matcher;
				var matcher = remain.match(commandRe);
				if (matcher) {
					var len = matcher[0].length;
					remain = remain.slice(len);
					if ( command.ending || command.alternative) {
						stack.pop();
						current = stack[stack.length - 1];
					} 
					if (!command.ending) {
						command.build.apply(command, matcher);
						current.push(command);

						if (command.stack) {
							stack.push(current = command.stack);
						}
					}
				} else {
					throw new Error('[yust] Template command syntax error after "' + command.type + '".');
				}
			} else {
				current.push(remain);
				remain = '';
			}
		}

		if (current != stream) {
			throw new Error('[yust] Syntax error of template command.');
		}

		return stream;
	},

	compile: function (stream) {
		var fn = 'if (arguments[0] != null && arguments[0] !== this)' +
			'return arguments.callee.call(arguments[0]);' +
			'var ' + this.outputVariable + '="";' +
			this.compileStream(stream) +
			'return ' + this.outputVariable + ';';
		return new Function(fn);
	},

	compileStream: function (stream, options) {
		options = options || {};
		options = Util.extend({variable: this.outputVariable}, options);
		return (stream || []).map(function (token, index) {
			return (token && typeof token == 'string' ?
				this.outputVariable + "+='" + Util.escapeDoubleQuote(token) + "';" :
				token.compile && token.compile(options));
		}, this).join('');
	}
});
