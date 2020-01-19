'use strict';
const {promisify} = require('util');
const path = require('path');
const fs = require('fs');
const normalizePath = process.platform === 'win32' ? require('normalize-path') : x => x;
const writeFileAtomic = require('write-file-atomic');
const escapeStringRegexp = require('escape-string-regexp');
const arrify = require('arrify');
const globby = require('globby');

const readFile = promisify(fs.readFile);

// TODO(sindresorhus): I will extract this to a separate module at some point when it's more mature.
// `find` is expected to be `Array<string | RegExp>`
// The `ignoreCase` option overrides the `i` flag for regexes in `find`
module.exports = async (filePaths, {find, replacement, ignoreCase, glob} = {}) => {
	filePaths = arrify(filePaths);

	if (filePaths.length === 0) {
		return;
	}

	if (find.length === 0) {
		throw new Error('Expected at least one `find` pattern');
	}

	if (replacement === undefined) {
		throw new Error('The `replacement` option is required');
	}

	// Replace the replacement string with the string unescaped (only one backslash) if it's escaped
	replacement = replacement
		.replace(/\\n/g, '\n')
		.replace(/\\r/g, '\r')
		.replace(/\\t/g, '\t');

	// TODO: Drop the `normalizePath` call when https://github.com/mrmlnc/fast-glob/issues/240 is fixed.
	filePaths = glob ? await globby(filePaths.map(filePath => normalizePath(filePath))) : [...new Set(filePaths.map(filePath => normalizePath(path.resolve(filePath))))];

	find = find.map(element => {
		const iFlag = ignoreCase ? 'i' : '';

		if (typeof element === 'string') {
			return new RegExp(escapeStringRegexp(element), `g${iFlag}`);
		}

		return new RegExp(element.source, `${element.flags.replace('i', '')}${iFlag}`);
	});

	await Promise.all(filePaths.map(async filePath => {
		const string = await readFile(filePath, 'utf8');

		let newString = string;
		for (const pattern of find) {
			newString = newString.replace(pattern, replacement);
		}

		if (newString === string) {
			return;
		}

		await writeFileAtomic(filePath, newString);
	}));
};
