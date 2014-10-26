var jsep = require('jsep');
var jseb = require('jseb');

jseb.registerPreprocessor(jseb.ACCESSOR, function (token, options) {
	options = options || {};
	options.locals = options.locals || {};
	if (!~token.name.indexOf('this.') && !(token.name in options.locals)) {
		token.name = 'this.' + token.name;
	}
	return token;
});

var Util = require('./Util');
var Engine = require('./Engine');
var Command = require('./AbstractCommand');

// Default global singlton
var yust = new Engine('yust');
yust.Engine = Engine;
yust.Command = Command;

// Output variable (output)
yust.registerCommand(Util.Class({
	type: '{',

	matcher: '\\{\\s*([^\\|\\}]+)\\s*((?:\\|[^\\|\\}]+)*?)\\}',
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
		var expression = jseb(this.token.expression, options);
		this.token.filters.forEach(function (filter) {
			var args = filter.split(':');
			var fn = args.shift();
			expression = this.engine.name + '.filters.' + fn.trim() + '(' + expression + (args.length ? ',' + args.join(',') : '') + ')';
		}, this);
		return options.variable + '+=' + expression + ';';
	}
}, Command));

// Assignment command (var)
yust.registerCommand(Util.Class({
	type: '$',

	matcher: '\\$\\s*([\\$_a-z][\\$_a-z0-9]*)\\s*=\\s*((?:[^\\/][^\\}])+)\\s*\\/',
	// matcher: /\{\$\s*([\$_a-z][\$_a-z0-9]*)\s*=\s*((?:[^\/][^\}])+)\s*\/\}/i,

	constructor: function (options) {
		Command.call(this, options);
	},

	build: function (matcher, name, value) {
		this.token.name = name;
		this.token.value = jsep(value);
	},

	compile: function (options) {
		return 'this.' + this.token.name + '=' + jseb(this.token.value, options) + ';';
	}
}, Command));

// Iteration command (for)
yust.registerCommand(Util.Class({
	type: '#',

	matcher: '#\\s*([\\$_a-zA-Z][\\$_a-zA-Z0-9]*(?:\\.[\\$_a-zA-Z][\\$_a-zA-Z0-9]*|\\[(?:\'[^\']*\'|"[^"]*"|[\\$_a-zA-Z][\\$_a-zA-Z0-9]*)\\])*)\\s*\\:\\s*([\\$_a-zA-Z][\\$_a-zA-Z0-9]*)\\s*(?:@\\s*([\\$_a-zA-Z][\\$_a-zA-Z0-9]*))?\\s*',
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
yust.registerCommand(Util.Class({
	type: '?',

	matcher: '\\?([^\\}]+)',
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
		return 'if (' + jseb(token.condition, options) + ') {' +
			Command.prototype.compile.call(this) + '}';
	}
}, Command));

// Condition command (else/else if)
yust.registerCommand(Util.Class({
	type: '^',

	matcher: '\\^([^\\}]*)',
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
		return 'else' + (token.condition ? ' if (' + jseb(token.condition, options) + ')' : '') + '{' +
			Command.prototype.compile.call(this) + '}';
	}
}, Command));

// Condition command (else/else if)
yust.registerCommand(Util.Class({
	type: '/',

	matcher: '\\/',
	// matcher: /\{\/\}/,

	ending: true,

	constructor: function (options) {
		Command.call(this, options);
	}
}, Command));

module.exports = yust;
