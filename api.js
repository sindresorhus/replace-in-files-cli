import process from 'node:process';
import path from 'node:path';
import {promises as fs} from 'node:fs';
import normalizePath_ from 'normalize-path';
import writeFileAtomic from 'write-file-atomic';
import escapeStringRegexp from 'escape-string-regexp';
import {globby} from 'globby';

const normalizePath = process.platform === 'win32' ? normalizePath_ : x => x;

const toArray = value => {
	if (value === undefined) {
		return [];
	}

	return Array.isArray(value) ? value : [value];
};

const normalizeRegex = (pattern, forceIgnoreCase) => {
	if (!(pattern instanceof RegExp)) {
		throw new TypeError('Expected a RegExp');
	}

	const flags = new Set(pattern.flags);
	flags.add('g');

	// Override case handling
	if (forceIgnoreCase) {
		flags.add('i');
	} else if (forceIgnoreCase === false) {
		flags.delete('i');
	}

	return new RegExp(pattern.source, [...flags].join(''));
};

/**
Replace matching strings and regexes in files.

- If `find` is provided, `replacement` must be a string.
- If `transform` is provided, it runs after all find/replace operations.
- When `dryRun` is true, returns a list of proposed changes.
*/
export default async function replaceInFiles(
	inputPaths,
	{
		find,
		replacement,
		ignoreCase = false,
		glob = true,
		dryRun = false,
		transform,
	} = {},
) {
	const filePathPatterns = toArray(inputPaths);

	if (transform !== undefined && typeof transform !== 'function') {
		throw new TypeError('The `transform` option must be a function');
	}

	const hasFind = Array.isArray(find) && find.length > 0;
	const hasTransform = typeof transform === 'function';

	if (!hasFind && !hasTransform) {
		throw new Error('Expected at least one `find` pattern or a `transform` function');
	}

	if (hasFind && typeof replacement !== 'string') {
		throw new TypeError('Expected `replacement` to be a string when `find` is provided');
	}

	// Resolve file paths
	let filePaths;
	if (glob) {
		const patterns = filePathPatterns.map(p => normalizePath(p));
		// TODO: Look into using built-in glob when targeting Node.js 24.
		filePaths = await globby(patterns, {dot: true, absolute: true, expandDirectories: false});
	} else {
		filePaths = filePathPatterns.map(p => path.resolve(String(p)));
	}

	// De-duplicate
	filePaths = [...new Set(filePaths)];

	// Replace escape sequences in replacement if we have find patterns
	if (hasFind && typeof replacement === 'string') {
		replacement = replacement
			.replaceAll(String.raw`\n`, '\n')
			.replaceAll(String.raw`\r`, '\r')
			.replaceAll(String.raw`\t`, '\t');
	}

	// Prepare replacers
	const replacers = hasFind
		? toArray(find).map(pattern => {
			if (typeof pattern === 'string') {
				const flags = ignoreCase ? 'gi' : 'g';
				return new RegExp(escapeStringRegexp(pattern), flags);
			}

			return normalizeRegex(pattern, ignoreCase);
		})
		: [];

	const changes = [];

	await Promise.all(filePaths.map(async filePath => {
		const originalContent = await fs.readFile(filePath, 'utf8');

		let nextContent = originalContent;

		for (const rx of replacers) {
			nextContent = nextContent.replace(rx, replacement);
		}

		if (hasTransform) {
			nextContent = transform(nextContent, filePath);
			if (typeof nextContent !== 'string') {
				throw new TypeError('`transform` must return a string');
			}
		}

		if (nextContent === originalContent) {
			return;
		}

		if (dryRun) {
			changes.push({filePath, originalContent, newContent: nextContent});
			return;
		}

		await writeFileAtomic(filePath, nextContent);
	}));

	if (dryRun) {
		return changes;
	}
}
