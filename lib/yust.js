var jsep = require('jsep');
var jseb = require('jseb');

jseb.registerPreprocessor(jseb.IDENTIFIER, function (token, parent, options) {
	options = options || {};
	options.locals = options.locals || {};
	if (!parent || parent.type != jseb.MEMBER_EXP || parent.property != token) {
		var name = token.name;
		if (!~name.indexOf('this.') && !(name in options.locals)) {
			token.name = 'this.' + name;
		}
	}
	return token;
});

var Util = require('./Util');
var Engine = require('./Engine');
var Command = require('./AbstractCommand');

// Void container only for engine name definition
var VOID = {};
var ENGINE_NAME = 'yust';

// Default global singlton
VOID[ENGINE_NAME] = new Engine();
VOID[ENGINE_NAME].Engine = Engine;
VOID[ENGINE_NAME].Command = Command;

// Output variable (output)
VOID[ENGINE_NAME].registerCommand(Util.Class({
	type: '{',

	matcher: '\\s*([^\\|\\}]+)\\s*((?:\\|[^\\|\\}]+)*?)\\}',
	// matcher: /\{\{\s*([^\|]+)\s*((?:\|[^\|]+)*)\}\}/i,

	constructor: function (options) {
		Command.call(this, options);
	},

	build: function (matcher, expression, filterStr) {
		var filters = filterStr.split(/\s*\|\s*/);
		filters.shift();
		this.token.filters = filters;
		this.token.expression = jsep(expression);
	},

	compile: function (options) {
		var expression = jseb(this.token.expression, null, options);
		this.token.filters.forEach(function (filter) {
			var args = filter.split(':');
			var fn = args.shift();
			expression = ENGINE_NAME + '.filters.' + fn.trim() + '(' + expression + (args.length ? ',' + args.join(',') : '') + ')';
		}, this);
		return options.variable + '+=' + expression + ';';
	}
}, Command));

// Assignment command (var)
VOID[ENGINE_NAME].registerCommand(Util.Class({
	type: '$',

	matcher: '\\s*([\\$_a-z][\\$_a-z0-9]*)\\s*=\\s*((?:[^\\/][^\\}])+)\\s*\\/',
	// matcher: /\{\$\s*([\$_a-z][\$_a-z0-9]*)\s*=\s*((?:[^\/][^\}])+)\s*\/\}/i,

	constructor: function (options) {
		Command.call(this, options);
	},

	build: function (matcher, name, value) {
		this.token.name = name;
		this.token.value = jsep(value);
	},

	compile: function (options) {
		return 'this.' + this.token.name + '=' + jseb(this.token.value, null, options) + ';';
	}
}, Command));

// Iteration command (for)
VOID[ENGINE_NAME].registerCommand(Util.Class({
	type: '#',

	matcher: '\\s*([\\$_a-zA-Z][\\$_a-zA-Z0-9]*(?:\\.[\\$_a-zA-Z][\\$_a-zA-Z0-9]*|\\[(?:\'[^\']*\'|"[^"]*"|[\\$_a-zA-Z][\\$_a-zA-Z0-9]*)\\])*)\\s*\\:\\s*([\\$_a-zA-Z][\\$_a-zA-Z0-9]*)\\s*(?:@\\s*([\\$_a-zA-Z][\\$_a-zA-Z0-9]*))?\\s*',
	// matcher: /\{#\s*([\$_a-z][\$_a-z0-9]*(?:\.[\$_a-z][\$_a-z0-9]*|\[(?:'[^']*'|"[^"]*"|[\$_a-z][\$_a-z0-9]*)\])*)\s*\:\s*([\$_a-z][\$_a-z0-9]*)\s*(?:@([\$_a-z][\$_a-z0-9]*))?\s*\}/i,

	stackable: true,

	constructor: function (options) {
		Command.call(this, options);
	},

	build: function (matcher, listExp, itemName, indexName) {
		Util.extend(this.token, {
			list: jsep(listExp),
			indexName: indexName,
			valueName: itemName
		});
	},

	compile: function (options) {
		var token = this.token;
		var list = jseb(token.list);

		options = options || {};
		options.locals = options.locals || {};
		options.locals[token.indexName] = 1;
		options.locals[token.valueName] = 1;

		var stackContent = Command.prototype.compile.call(this, options);

		return 'if (' + list + ' &&' +
			'(' + list + ' instanceof Array && ' + list + '.length ||' +
			'Object.prototype.toString.call(' + list + ') == "[object Object]" && Object.keys(' + list + ').length)' +
			') {' +
				'if (' + list + ' instanceof Array) {' +
					list + '.forEach(function (' + token.valueName + ', ' + token.indexName + ') {' +
					stackContent + '});' +
				'} else {' +
					'Object.keys(' + list + ').forEach(function (' + token.indexName + ') {' +
						'var ' + token.valueName + '=' + list + '[' + token.indexName + '];' +
						stackContent +
					'}, this);' +
				'}' +
			'}';
	}
}, Command));

// Condition command (if)
VOID[ENGINE_NAME].registerCommand(Util.Class({
	type: '?',

	matcher: '([^\\}]+)',
	// matcher: /\{\?([^\}]+)\}/,

	stackable: true,

	constructor: function (options) {
		Command.call(this, options);
	},

	build: function (matcher, conditionExp) {
		this.token.condition = jsep(conditionExp);
	},

	compile: function (options) {
		var token = this.token;
		return 'if (' + jseb(token.condition, null, options) + ') {' +
			Command.prototype.compile.call(this, options) + '}';
	}
}, Command));

// Condition command (else/else if)
VOID[ENGINE_NAME].registerCommand(Util.Class({
	type: '^',

	matcher: '([^\\}]*)',
	// matcher: /\{\^([^\}]*)\}/,

	alternative: true,

	stackable: true,

	constructor: function (options) {
		Command.call(this, options);
	},

	build: function (matcher, conditionExp) {
		this.token.condition = conditionExp && jsep(conditionExp);
	},

	compile: function (options) {
		var token = this.token;
		return 'else' + (token.condition ? ' if (' + jseb(token.condition, null, options) + ')' : '') + '{' +
			Command.prototype.compile.call(this, options) + '}';
	}
}, Command));

// Ending command (end)
VOID[ENGINE_NAME].registerCommand(Util.Class({
	type: '/',

	matcher: '',
	// matcher: /\{\/\}/,

	ending: true,

	constructor: function (options) {
		Command.call(this, options);
	}
}, Command));

// Layout command (extend)
VOID[ENGINE_NAME].registerCommand(Util.Class({
	type: '@',

	matcher: '([^\\}]+)\\/',

	ignore: true,

	constructor: function (options) {
		Command.call(this, options);
	},

	build: function (matcher, name) {
		name = name.trim();

		var tpl = VOID[ENGINE_NAME].get(this.template);
		var parent = VOID[ENGINE_NAME].parse(name);
		tpl.ast.stack.unshift.apply(tpl.ast.stack, parent.stack);
		tpl.blocks = tpl.blocks || {};
		Util.extend(tpl.blocks, VOID[ENGINE_NAME].get(name).blocks);
	}
}, Command));

// Block command (extend)
VOID[ENGINE_NAME].registerCommand(Util.Class({
	type: '+',

	matcher: '([^\\}]+?)',

	stackable: true,

	constructor: function (options) {
		Command.call(this, options);
	},

	build: function (matcher, name) {
		name = name.trim();
		var pos = parseInt(Number(name.indexOf(':') === 0) + '' + Number(name.lastIndexOf(':') == name.length - 1), 2);
		// 3(error),-1(left),1(right),0(none)
		if (pos == 3) {
			throw new Error('[yust] Equal placeholder could not used in both side of "' + name + '"');
		} else if (pos == 2) {
			pos = -1;
		}

		this.token.pos = pos;

		this.token.name = name = name.replace(/^\:\s*|\s*\:$/g, '');

		var tpl = VOID[ENGINE_NAME].get(this.template);

		tpl.blocks = tpl.blocks || {};
		if (tpl.blocks[name]) {
			// reference to parent block
			this.token.parent = tpl.blocks[name];

			var index = tpl.ast.stack.indexOf(this.token.parent);
			tpl.ast.stack.splice(index, 1, this);

			this.ignore = true;
		}

		tpl.blocks[name] = this;
	},

	compile: function (options) {
		var compile = Command.prototype.compile;
		var tpl = VOID[ENGINE_NAME].get(this.template);
		var name = this.token.name;
		var command = tpl.blocks[name];
		var output = compile.call(command, options);
		var parent = '';
		if (command.token.parent) {
			parent = compile.call(command.token.parent, options);
		}
		if (command.token.pos) {
			output = command.token.pos > 0 ? output + parent : parent + output;
		}
		return output;
	}
}, Command));

// Import command (include)
VOID[ENGINE_NAME].registerCommand(Util.Class({
	type: '>',

	matcher: '([^\\}]+)\\/',

	constructor: function (options) {
		Command.call(this, options);
	},

	build: function (matcher, name) {
		var tpl = VOID[ENGINE_NAME].get(this.template);
		var block = VOID[ENGINE_NAME].parse(name.trim());

		tpl.current.push(block);
	}
}, Command));

module.exports = VOID[ENGINE_NAME];

