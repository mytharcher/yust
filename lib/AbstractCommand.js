var Util = require('./Util');

module.exports = Util.Class({
	// type: '',
	// matcher: new RegExp(''),
	stackable: false,

	constructor: function(options) {
		Util.extend(this, options);

		this.token = this.token || {};

		if (this.stackable) {
			this.stack = this.stack || [];
		}
	},

	build: function (command) {},

	compile: function (options) {
		var result = '';
		if (this.stackable) {
			result = (this.stack || []).map(function (token, index) {
				return (token && typeof token == 'string' ?
					options.variable + "+='" + Util.escapeQuote(token) + "';" :
					token.compile && token.compile(options));
			}).join('');
		}
		return result;
	}
});
