#!/usr/bin/env node
import process from 'node:process';
import {styleText} from 'node:util';
import meow from 'meow';
import replaceInFiles from './api.js';

const cli = meow(`
	Usage
	  $ replace-in-files <files…>

	Options
	  --regex           Regex pattern to find  (Can be set multiple times)
	  --string          String to find  (Can be set multiple times)
	  --replacement     Replacement string  (Required when using --regex/--string)
	  --ignore-case     Search case-insensitively
	  --no-glob         Disable globbing
	  --dry-run         Show what would be replaced without making changes

	Examples
	  $ replace-in-files --string='horse' --regex='unicorn|rainbow' --replacement='🦄' foo.md
	  $ replace-in-files --regex='v\\d+\\.\\d+\\.\\d+' --replacement=v$npm_package_version foo.css
	  $ replace-in-files --string='blob' --replacement='blog' 'some/**/[gb]lob/*' '!some/glob/foo'
	  $ replace-in-files --dry-run --string='old' --replacement='new' file.txt

	You can use the same replacement patterns as with \`String#replace()\`, like \`$&\`.

	When working with quotes in shell commands, escape them with backslashes:
	  $ replace-in-files --string='\\"use strict\\";' --replacement='\\"use strict\\";\\nrequire(\\"module\\");' file.js
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
		},
		ignoreCase: {
			type: 'boolean',
			default: false,
		},
		glob: {
			type: 'boolean',
			default: true,
		},
		dryRun: {
			type: 'boolean',
			default: false,
		},
	},
});

if (cli.input.length === 0) {
	console.error('Specify one or more file paths');
	process.exit(1);
}

const toArray = v => v === undefined ? [] : (Array.isArray(v) ? v : [v]);

const findPatterns = [
	...toArray(cli.flags.string),
	...toArray(cli.flags.regex).map(rx => new RegExp(rx, 'g')),
];

if (findPatterns.length === 0) {
	console.error('Specify at least `--regex` or `--string`');
	process.exit(1);
}

if (findPatterns.length > 0 && typeof cli.flags.replacement !== 'string') {
	console.error('The `--replacement` option is required when using `--string` or `--regex`');
	process.exit(1);
}

const result = await replaceInFiles(cli.input, {
	find: findPatterns,
	replacement: cli.flags.replacement,
	ignoreCase: cli.flags.ignoreCase,
	glob: cli.flags.glob,
	dryRun: cli.flags.dryRun,
});

function displayDryRunResults(changes) {
	if (changes.length === 0) {
		console.log('No matches found.');
		return;
	}

	for (const change of changes) {
		console.log(`\n${styleText('magenta', change.filePath)}`);

		const lines = change.originalContent.split('\n');
		const newLines = change.newContent.split('\n');

		for (const [index, line] of lines.entries()) {
			if (line !== newLines[index]) {
				const lineNumber = index + 1;
				const linePrefix = styleText('cyan', `${lineNumber}:`);

				console.log(`${linePrefix}${highlightDifferences(line, newLines[index], 'red')}`);
				console.log(`${linePrefix}${highlightDifferences(newLines[index], line, 'green')}`);
			}
		}
	}
}

function highlightDifferences(text, otherText, color) {
	let start = 0;
	let end = text.length;
	let otherEnd = otherText.length;

	// Find common prefix
	while (start < Math.min(text.length, otherText.length) && text[start] === otherText[start]) {
		start++;
	}

	// Find common suffix
	while (end > start && otherEnd > start && text[end - 1] === otherText[otherEnd - 1]) {
		end--;
		otherEnd--;
	}

	if (start >= end) {
		return text;
	}

	return text.slice(0, start) + styleText(color, text.slice(start, end)) + text.slice(end);
}

if (cli.flags.dryRun) {
	displayDryRunResults(result);
}
