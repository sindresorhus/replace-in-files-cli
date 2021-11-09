import process from 'node:process';
import path from 'node:path';
import {promises as fsPromises} from 'node:fs';
import normalizePath_ from 'normalize-path';
import writeFileAtomic from 'write-file-atomic';
import escapeStringRegexp from 'escape-string-regexp';
import {globby} from 'globby';

const normalizePath = process.platform === 'win32' ? normalizePath_ : x => x;

// TODO(sindresorhus): I will extract this to a separate module at some point when it's more mature.
// `find` is expected to be `Array<string | RegExp>`
// The `ignoreCase` option overrides the `i` flag for regexes in `find`
export default async function replaceInFiler(filePaths, {find, replacement, ignoreCase, glob} = {}) {
	filePaths = [filePaths].flat();

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
		const string = await fsPromises.readFile(filePath, 'utf8');

		let newString = string;
		for (const pattern of find) {
			newString = newString.replace(pattern, replacement);
		}

		if (newString === string) {
			return;
		}

		await writeFileAtomic(filePath, newString);
	}));
}
