#!/usr/bin/env node
import process from 'node:process';
import meow from 'meow';
import replaceInFiles from './api.js';

const cli = meow(`
	Usage
	  $ replace-in-files <files…>

	Options
	  --regex           Regex pattern to find  (Can be set multiple times)
	  --string          String to find  (Can be set multiple times)
	  --replacement     Replacement string  (Required)
	  --ignore-case     Search case-insensitively
	  --no-glob         Disable globbing

	Examples
	  $ replace-in-files --string='horse' --regex='unicorn|rainbow' --replacement='🦄' foo.md
	  $ replace-in-files --regex='v\\d+\\.\\d+\\.\\d+' --replacement=v$npm_package_version foo.css
	  $ replace-in-files --string='blob' --replacement='blog' 'some/**/[gb]lob/*' '!some/glob/foo'

	You can use the same replacement patterns as with \`String#replace()\`, like \`$&\`.
`, {
	importMeta: import.meta,
	flags: {
		regex: {
			type: 'string',
			isMultiple: true,
		},
		string: {
			type: 'string',
			isMultiple: true,
		},
		replacement: {
			type: 'string',
			isRequired: true,
		},
		ignoreCase: {
			type: 'boolean',
			default: false,
		},
		glob: {
			type: 'boolean',
			default: true,
		},
	},
});

if (cli.input.length === 0) {
	console.error('Specify one or more file paths');
	process.exit(1);
}

if (!cli.flags.regex && !cli.flags.string) {
	console.error('Specify at least `--regex` or `--string`');
	process.exit(1);
}

(async () => {
	await replaceInFiles(cli.input, {
		find: [
			...cli.flags.string,
			...cli.flags.regex.map(regexString => new RegExp(regexString, 'g')),
		],
		replacement: cli.flags.replacement,
		ignoreCase: cli.flags.ignoreCase,
		glob: cli.flags.glob,
	});
})();
