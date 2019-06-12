#!/usr/bin/env node
'use strict';
const meow = require('meow');
const arrify = require('arrify');
const replaceInFiles = require('./api');

const cli = meow(`
	Usage
	  $ replace-in-files <files…>

	Options
	  --regex           Regex pattern to find  (Can be set multiple times)
	  --string          String to find  (Can be set multiple times)
	  --replacement     Replacement string  (Required)
	  --ignore-case     Search case-insensitively

	Examples
	  $ replace-in-files --string='horse' --regex='unicorn|rainbow' --replacement='🦄' foo.md
	  $ replace-in-files --regex='v\\d+\\.\\d+\\.\\d+' --replacement=v$npm_package_version foo.css

	You can use the same replacement patterns as with \`String#replace()\`, like \`$&\`.
`, {
	flags: {
		regex: {
			type: 'string'
		},
		string: {
			type: 'string'
		},
		replacement: {
			type: 'string'
		},
		ignoreCase: {
			type: 'boolean',
			default: false
		}
	}
});

if (cli.input.length === 0) {
	console.error('Specify one or more file paths');
	process.exit(1);
}

if (!cli.flags.regex && !cli.flags.string) {
	console.error('Specify at least `--regex` or `--string`');
	process.exit(1);
}

// TODO: Use the required functionality in `meow` when v6 is out
if (cli.flags.replacement === undefined) {
	console.error('The `--replacement` flag is required');
	process.exit(1);
}

(async () => {
	await replaceInFiles(cli.input, {
		find: [
			...arrify(cli.flags.string),
			...arrify(cli.flags.regex).map(regexString => new RegExp(regexString, 'g'))
		],
		replacement: cli.flags.replacement,
		ignoreCase: cli.flags.ignoreCase
	});
})();
