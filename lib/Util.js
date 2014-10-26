var Util = {
	extend: function (a, b) {
		for (var i in b) {
			if (b.hasOwnProperty(i)) {
				a[i] = b[i];
			}
		}
		return a;
	},

	Class: function (proto, Super) {
		var newClass = proto.hasOwnProperty('constructor') ? proto.constructor : function(){};
		
		if (Super) {
			var SuperHelper = function(){};
			
			SuperHelper.prototype = Super.prototype;
			
			newClass.prototype = new SuperHelper();
			
			newClass.prototype.constructor = newClass;
		}

		Util.extend(newClass.prototype, proto);

		return newClass;
	},

	escapeRegExp: function (source) {
		return String(source)
			.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\\x241');
	},

	escapeDoubleQuote: function (str) {
		return str.replace(/'/g, "\\'");
	}
};

module.exports = Util;
