#!/usr/bin/env node
/* Scriptable Markdown Editor
 * Copyright 2013 Jaakko-Heikki Heusala <jheusala@iki.fi>
 */

var path = require('path');
var fs = require('nor-fs');
var argv = require('optimist').argv;
var marked = require('marked');

var marked_options = {
	"tables":true,
	"gfm":true
};

/* Convert as HTML */
if(argv['to-html']) {
	var text = fs.sync.readFile(argv.i, {'encoding': 'utf8'});
	var tokens = marked.lexer(text, marked_options);
	console.log(marked.parser(tokens));
}

/* Convert as JSON */
if(argv['to-lexer-tokens'] || argv['to-lexer-rules']) {
	var text = fs.sync.readFile(argv.i, {'encoding': 'utf8'});
	var lexer = new marked.Lexer(marked_options);
	var tokens = lexer.lex(text);

	if(argv['to-lexer-tokens']) {
		console.log(JSON.stringify(tokens, null, 2));
	}

	if(argv['to-lexer-rules']) {
		console.log(JSON.stringify(lexer.rules, null, 2));
	}
}

/* Fetch all headers that match depth */
if(argv.heading) {
	var text = fs.sync.readFile(argv.i, {'encoding': 'utf8'});
	var lexer = new marked.Lexer(marked_options);
	var tokens = lexer.lex(text);
	var search = parseInt(argv.heading, 10);
	console.log( tokens.filter(function(x) { return x.type === 'heading' && x.depth === search }).map(function(x) { return x.text; }).join('\n') );
}

/* Fetch all tables that match regexp, as JSON */
if(argv.table) {
	var text = fs.sync.readFile(argv.i, {'encoding': 'utf8'});
	var lexer = new marked.Lexer(marked_options);
	var tokens = lexer.lex(text);
	var search = argv.table;
	var re = new RegExp(search, "i");
	console.log(JSON.stringify(tokens.filter(function(x) { return x.type === 'table' && re.test(x.header.join('|')) }), null, 2));
}


/* Merge all tables (from multiple files) that match a regexp of heading as one table, based on file's 1st heading name */
if(argv['merge-tables']) {

	var output_title = argv['title'] || 'Result of merged tables';
	var table_file_title = argv['table-file-title'] || 'File';

	var files = (argv._ && (typeof argv._ === 'object') && (argv._ instanceof Array) ) ? argv._ : [argv._];

	var res = [];

	files.map(function(filename) {
		var text = fs.sync.readFile(filename, {'encoding': 'utf8'});
		var lexer = new marked.Lexer(marked_options);
		var tokens = lexer.lex(text);

		var title = tokens.filter(function(x) { return x.type === 'heading' && x.depth === 1 }).map(function(x) { return x.text; }).join('\n');

		var search = argv['merge-tables'];
		var re = new RegExp(search, "i");
		return tokens.filter(function(x) { return x.type === 'table' && re.test(x.header.join('|')); }).map(function(x){ x.file = { 'title': title, 'name': path.basename(filename)}; return x; });
	}).forEach(function(tables){
		tables.forEach(function(table) {
			var line = {};
			line[table_file_title] = '['+table.file.title+']('+table.file.name+')';
			table.cells.forEach(function(row){
				var key = row.shift();
				var value = row.shift();
				line[key] = value;
			});
			res.push(line);
		});
	});

	res = res.sort(function(a, b) {
		if(a[table_file_title] === b[table_file_title]) { return 0; }
		return a[table_file_title] < b[table_file_title] ? -1 : 1;
	});

	if(argv['to-json']) {
		console.log(JSON.stringify(res, null, 2));
	} else {
		console.log(output_title);
		console.log('====\n');
		var keys = Array.prototype.concat.apply([], res.map(function(x) { return Object.keys(x); })).reverse().filter(function(e, i, arr) {return arr.indexOf(e, i+1) === -1;}).reverse();
		var values = res.map(function(x){
			return keys.map(function(key) { return x[key]; });
		});
		console.log( '| ' + keys.join(' | ') + ' |');
		console.log( '| ' + keys.map(function(k) { return '---'; }).join(' | ') + ' |');
		values.forEach(function(value) {
			console.log( '| ' + value.join(' | ') + ' |');
		})
	}
}


/* EOF */
