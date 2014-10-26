var Util = require('./Util');

module.exports = Util.Class({
	// type: '',
	// matcher: new RegExp(''),
	stackable: false,

	constructor: function(options) {
		Util.extend(this, options);

		this.token = {};

		if (this.stackable) {
			this.stack = [];
		}
	},

	build: function (command) {},

	compile: function (options) {
		return this.stackable ? this.engine.compileStream(this.stack, options) : '';
	}
});
