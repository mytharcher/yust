Yust
==========

_ON DESIGNING, DO NOT USE IN PRODUCTION._

A node.js template engine inspired by [dust](http://linkedin.github.io/dustjs/) but much simpler redesigned.

Usage
----------

### Node.js ###

	$ npm install --save yust

### Browser ###

	<script scr="dist/yust.js"></script>

Syntax
----------

### Principle ###

* **Directive** of template start with a signle bracket `{` and should be end with `}`.
* **Directive** has 2 types: **Variable** and **Command**.
* **Command** could contains multiple directives and text blocks.
* **Command** should be ended with close directive `{/}` or self-ending `{.../}`. Except negation command `{^}`.
* **Negation** command `{^}` should be used inside of other commands, could not be singly used.

### Variable ###

`{{expression | filter:arguments}}`

Use double brackets to output variables. In brackets it could be most JavaScript valid expression (except `|` operator as a pipe). After an common expression, you could use pipe sign `|` to do more process with filter functions.

Example:

	{{ variable }}
	{{ nested.element }}
	{{ array[index] }}
	{{ object[key] }}

	{{ ok ? 1 : 0 }}
	{{ ok || 'none' }}
	{{ index * (x + 3) }}

	{{ variable | escapeHTML }}
	{{ today | date:'Y-m-d' }}
	{{ group | max }}

#### HTML Encoding ####

By default, yust will not encode HTML special characters, unless using triple brackets.

Example:

	{{{content}}}

### Condition ###

`{?expression}condition 1{^expression2}condition2{^}else{/}`

Use question sign `?` to indicate that it is a condition command.

Negation command `{^}` could be used in condition command.

Example:

	{? a > b }
	true
	{^}
	false
	{/}

### Loop ###

`{#list:item@index}{{index}}:{{item}}{^}none{/}`

Use hash sign `#` to indicate that it is a loop command.

`list` is the list variable could be an array or an object.

`item` is the item entity while `index` (optional) is the index key of item in list.

Negation command `{^}` could be used in loop command when no item.

Example:

	{#list:item}
	<ul>
		<li>{{item}}</li>
	</ul>
	{^}
	<p>no item in list</p>
	{/}

	{#list:item@index}
		{?isFirst(index)}
		<h1>{{index}}: {{item}}</h1>
		{^}
		<p>{{index}}: {{item}}</p>
		{/}
	{/}

### Include ###

`{>another.tpl}`

Use greater sign `>` to include another template content by **name**. The association of name to content will be handle by specific engine. Such as in node.js, it could be dealing as file name (with path). And in browser environment, the same full path file name could be used as template name by preprocessed.

(Same name strategy below)

Example:

target.tpl:

	{#list:item}
	{{item}}
	{/}

layout.tpl:
	
	<h1>title</h1>
	{>target.tpl}
	<p>other line</p>

then got as signle target.tpl:

	<h1>title</h1>
	{#list:item}
	{{item}}
	{/}
	<p>other line</p>

### Layout extend ###

#### Layout declaration ####

`{@layout.tpl}`

Use at sign `@` to indicate current template will extend another template content by name.

This command mean to make template could be extended with fixed structure.

If using this command, put it as the first line in the template content.

#### Block syntax ####

`{+block}anything{/}`

Use plus sign `+` to define a block in extended template. To extend template should declare the parent layout like before. Or it will output just as plain text. The blocks with same name in parent layout would be replace by extended template.

Use colon in one side of block name could reuse parent block content in before(left) or after(right).

Example:

in layout `parent.tpl`:

	<head>
	{+head}
	<title>{{title}}</title>
	{/}
	</head>
	<body>
	{+body}body{/}
	</body>

in template:

	{@parent.tpl}
	{+:head}
	<meta charset="utf-8" />
	{/}
	{+body}
	<h1>Hello world</h1>
	{/}

then got:

	<head>
	<title>{{title}}</title>
	<meta charset="utf-8" />
	</head>
	<body>
	<h1>Hello world</h1>
	</body>

Development
----------

### Build ###

To make a distribution for browser usage:

	$ npm run build

then 2 files `yust.js` & `yust.min.js` will be present in `dist/` folder.
