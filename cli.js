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
	  --replacement     Replacement string  (Required)
	  --ignore-case     Search case-insensitively
	  --no-glob         Disable globbing
	  --dry-run         Show what would be replaced without making changes

	Examples
	  $ replace-in-files --string='horse' --regex='unicorn|rainbow' --replacement='🦄' foo.md
	  $ replace-in-files --regex='v\\d+\\.\\d+\\.\\d+' --replacement=v$npm_package_version foo.css
	  $ replace-in-files --string='blob' --replacement='blog' 'some/**/[gb]lob/*' '!some/glob/foo'
	  $ replace-in-files --dry-run --string='old' --replacement='new' file.txt

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

if (!cli.flags.regex && !cli.flags.string) {
	console.error('Specify at least `--regex` or `--string`');
	process.exit(1);
}

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

const result = await replaceInFiles(cli.input, {
	find: [
		...cli.flags.string,
		...cli.flags.regex.map(regexString => new RegExp(regexString, 'g')),
	],
	replacement: cli.flags.replacement,
	ignoreCase: cli.flags.ignoreCase,
	glob: cli.flags.glob,
	dryRun: cli.flags.dryRun,
});

if (cli.flags.dryRun) {
	displayDryRunResults(result);
}
