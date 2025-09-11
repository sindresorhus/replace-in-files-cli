import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import test from 'ava';
import {execa} from 'execa';
import tempWrite from 'temp-write';

test('--string', async t => {
	const filePath = await tempWrite('foo bar foo');
	await execa('./cli.js', ['--string=bar', '--replacement=foo', filePath]);
	t.is(fs.readFileSync(filePath, 'utf8'), 'foo foo foo');
});

test('--regex', async t => {
	const filePath = await tempWrite('foo bar foo');
	await execa('./cli.js', [String.raw`--regex=\bb.*?\b`, '--replacement=foo', filePath]);
	t.is(fs.readFileSync(filePath, 'utf8'), 'foo foo foo');
});

test('newlines and tabs', async t => {
	const filePath = await tempWrite('a,b,c');
	await execa('./cli.js', ['--string=,', String.raw`--replacement=\n`, filePath]);
	t.is(fs.readFileSync(filePath, 'utf8'), 'a\nb\nc');

	const filePath2 = await tempWrite('a,b,c');
	await execa('./cli.js', ['--string=,', String.raw`--replacement=\t`, filePath2]);
	t.is(fs.readFileSync(filePath2, 'utf8'), 'a\tb\tc');

	const filePath3 = await tempWrite('a,b,c');
	await execa('./cli.js', ['--string=,', String.raw`--replacement=\r`, filePath3]);
	t.is(fs.readFileSync(filePath3, 'utf8'), 'a\rb\rc');
});

test('multiple newlines and tabs', async t => {
	const filePath = await tempWrite('a,b,c');
	await execa('./cli.js', ['--string=,', String.raw`--replacement=\n\n\t\r`, filePath]);
	t.is(fs.readFileSync(filePath, 'utf8'), 'a\n\n\t\rb\n\n\t\rc');
});

test('globs', async t => {
	const filePaths = [await tempWrite('foo bar foo', 'a.glob'), await tempWrite('foo bar foo', 'b.glob')];
	const dirnames = filePaths.map(filePath => path.dirname(filePath));

	await execa('./cli.js', ['--string=bar', '--replacement=foo', path.join(dirnames[0], '*.glob'), path.join(dirnames[1], '*.glob')]);
	t.is(fs.readFileSync(filePaths[0], 'utf8'), 'foo foo foo');
	t.is(fs.readFileSync(filePaths[1], 'utf8'), 'foo foo foo');
});

test('no globs', async t => {
	const filePaths = [await tempWrite('foo bar foo', process.platform === 'win32' ? 'STAR.glob' : '*.glob'), await tempWrite('foo bar foo', 'foo.glob')];
	const dirnames = filePaths.map(filePath => path.dirname(filePath));

	await t.throwsAsync(
		execa('./cli.js', [
			'--string=bar',
			'--replacement=foo',
			'--no-glob',
			path.join(dirnames[0], '*.glob'),
			path.join(dirnames[1], '*.glob'),
		]),
		{
			message: /ENOENT/,
		},
	);
});

test('--dry-run shows changes without modifying files', async t => {
	const filePath = await tempWrite('foo bar foo');
	const {stdout} = await execa('./cli.js', ['--dry-run', '--string=bar', '--replacement=baz', filePath]);

	t.is(fs.readFileSync(filePath, 'utf8'), 'foo bar foo');
	t.true(stdout.includes(filePath));
	t.true(stdout.includes('foo bar foo'));
	t.true(stdout.includes('foo baz foo'));
});

test('--dry-run with no matches', async t => {
	const filePath = await tempWrite('foo bar foo');
	const {stdout} = await execa('./cli.js', ['--dry-run', '--string=notfound', '--replacement=replacement', filePath]);

	t.is(fs.readFileSync(filePath, 'utf8'), 'foo bar foo');
	t.is(stdout.trim(), 'No matches found.');
});

test('--dry-run with regex', async t => {
	const filePath = await tempWrite('version 1.2.3 here');
	const {stdout} = await execa('./cli.js', ['--dry-run', String.raw`--regex=\d+\.\d+\.\d+`, '--replacement=2.0.0', filePath]);

	t.is(fs.readFileSync(filePath, 'utf8'), 'version 1.2.3 here');
	t.true(stdout.includes('version 1.2.3 here'));
	t.true(stdout.includes('version 2.0.0 here'));
});

test('prepend using regex ^', async t => {
	const filePath = await tempWrite('line 1\nline 2');
	await execa('./cli.js', ['--regex=^', '--replacement=PREPENDED: ', filePath]);
	t.is(fs.readFileSync(filePath, 'utf8'), 'PREPENDED: line 1\nline 2');
});

test('append using regex $ with global flag', async t => {
	const filePath = await tempWrite('line 1\nline 2');
	await execa('./cli.js', ['--regex=$', '--replacement= :APPENDED', filePath]);
	t.is(fs.readFileSync(filePath, 'utf8'), 'line 1\nline 2 :APPENDED');
});

test('transform option - prepend', async t => {
	const {default: replaceInFiles} = await import('./api.js');
	const filePath = await tempWrite('line 1\nline 2');

	await replaceInFiles(filePath, {
		transform: content => `PREPENDED\n${content}`,
	});

	t.is(fs.readFileSync(filePath, 'utf8'), 'PREPENDED\nline 1\nline 2');
});

test('transform option - append', async t => {
	const {default: replaceInFiles} = await import('./api.js');
	const filePath = await tempWrite('line 1\nline 2');

	await replaceInFiles(filePath, {
		transform: content => `${content}\nAPPENDED`,
	});

	t.is(fs.readFileSync(filePath, 'utf8'), 'line 1\nline 2\nAPPENDED');
});

test('transform option - with file path parameter', async t => {
	const {default: replaceInFiles} = await import('./api.js');
	const filePath = await tempWrite('content');

	await replaceInFiles(filePath, {
		transform: (content, path) => `FILE: ${path} | CONTENT: ${content}`,
	});

	const result = fs.readFileSync(filePath, 'utf8');
	t.true(result.includes('FILE: ') && result.includes('CONTENT: content'));
});

test('transform option - dry run', async t => {
	const {default: replaceInFiles} = await import('./api.js');
	const filePath = await tempWrite('original');

	const changes = await replaceInFiles(filePath, {
		transform: content => `transformed: ${content}`,
		dryRun: true,
	});

	t.is(fs.readFileSync(filePath, 'utf8'), 'original');
	t.is(changes.length, 1);
	t.is(changes[0].originalContent, 'original');
	t.is(changes[0].newContent, 'transformed: original');
});

test('transform option - no change when content identical', async t => {
	const {default: replaceInFiles} = await import('./api.js');
	const filePath = await tempWrite('unchanged');

	const changes = await replaceInFiles(filePath, {
		transform: content => content,
		dryRun: true,
	});

	t.is(changes.length, 0);
});

test('transform option - error when not a function', async t => {
	const {default: replaceInFiles} = await import('./api.js');
	const filePath = await tempWrite('content');

	await t.throwsAsync(
		replaceInFiles(filePath, {
			transform: 'not a function',
		}),
		{
			message: 'The `transform` option must be a function',
		},
	);
});

test('transform + find/replace - transform runs after find/replace', async t => {
	const {default: replaceInFiles} = await import('./api.js');
	const filePath = await tempWrite('Hello world!');

	await replaceInFiles(filePath, {
		find: ['world'],
		replacement: 'universe',
		transform: content => `BANNER\n${content}\nFOOTER`,
	});

	t.is(fs.readFileSync(filePath, 'utf8'), 'BANNER\nHello universe!\nFOOTER');
});

test('transform + find/replace - dry run', async t => {
	const {default: replaceInFiles} = await import('./api.js');
	const filePath = await tempWrite('Hello world!');

	const changes = await replaceInFiles(filePath, {
		find: ['world'],
		replacement: 'universe',
		transform: content => `[${content}]`,
		dryRun: true,
	});

	t.is(fs.readFileSync(filePath, 'utf8'), 'Hello world!');
	t.is(changes.length, 1);
	t.is(changes[0].originalContent, 'Hello world!');
	t.is(changes[0].newContent, '[Hello universe!]');
});

test('transform only - no find/replace required', async t => {
	const {default: replaceInFiles} = await import('./api.js');
	const filePath = await tempWrite('content');

	await replaceInFiles(filePath, {
		transform: content => `wrapped: ${content}`,
	});

	t.is(fs.readFileSync(filePath, 'utf8'), 'wrapped: content');
});

test('find/replace without transform - still works', async t => {
	const {default: replaceInFiles} = await import('./api.js');
	const filePath = await tempWrite('Hello world!');

	await replaceInFiles(filePath, {
		find: ['world'],
		replacement: 'universe',
	});

	t.is(fs.readFileSync(filePath, 'utf8'), 'Hello universe!');
});

test('error when neither find nor transform provided', async t => {
	const {default: replaceInFiles} = await import('./api.js');
	const filePath = await tempWrite('content');

	await t.throwsAsync(
		replaceInFiles(filePath, {}),
		{
			message: 'Expected at least one `find` pattern or a `transform` function',
		},
	);
});

test('ignoreCase overrides string patterns', async t => {
	const {default: replaceInFiles} = await import('./api.js');
	const filePath = await tempWrite('Hello WORLD world');

	await replaceInFiles(filePath, {
		find: ['world'],
		replacement: 'universe',
		ignoreCase: true,
	});

	t.is(fs.readFileSync(filePath, 'utf8'), 'Hello universe universe');
});

test('ignoreCase overrides regex patterns', async t => {
	const {default: replaceInFiles} = await import('./api.js');
	const filePath = await tempWrite('Hello WORLD world');

	await replaceInFiles(filePath, {
		find: [/world/],
		replacement: 'universe',
		ignoreCase: true,
	});

	t.is(fs.readFileSync(filePath, 'utf8'), 'Hello universe universe');
});

test('ignoreCase overrides regex with existing i flag', async t => {
	const {default: replaceInFiles} = await import('./api.js');
	const filePath = await tempWrite('Hello WORLD world');

	await replaceInFiles(filePath, {
		find: [/world/i],
		replacement: 'universe',
		ignoreCase: false, // Should remove the i flag
	});

	// Without ignoreCase, only lowercase 'world' should match
	t.is(fs.readFileSync(filePath, 'utf8'), 'Hello WORLD universe');
});

test('multiple find patterns applied in order', async t => {
	const {default: replaceInFiles} = await import('./api.js');
	const filePath = await tempWrite('apple banana cherry');

	await replaceInFiles(filePath, {
		find: ['apple', 'banana'],
		replacement: 'fruit',
	});

	t.is(fs.readFileSync(filePath, 'utf8'), 'fruit fruit cherry');
});

test('no-op writes - unchanged files not touched', async t => {
	const {default: replaceInFiles} = await import('./api.js');
	const filePath = await tempWrite('unchanged content');

	const statBefore = await fs.promises.stat(filePath);

	// Add a tiny delay to ensure mtime would change if file was written
	await new Promise(resolve => {
		setTimeout(resolve, 10);
	});

	await replaceInFiles(filePath, {
		find: ['nonexistent'],
		replacement: 'something',
	});

	const statAfter = await fs.promises.stat(filePath);

	t.deepEqual(statBefore.mtime, statAfter.mtime);
	t.is(fs.readFileSync(filePath, 'utf8'), 'unchanged content');
});

test('transform must return string', async t => {
	const {default: replaceInFiles} = await import('./api.js');
	const filePath = await tempWrite('content');

	await t.throwsAsync(
		replaceInFiles(filePath, {
			transform: () => 123, // Returns number instead of string
		}),
		{
			message: '`transform` must return a string',
		},
	);
});

test('dry-run returns structured FileChange array', async t => {
	const {default: replaceInFiles} = await import('./api.js');
	const filePath = await tempWrite('original content');

	const changes = await replaceInFiles(filePath, {
		find: ['original'],
		replacement: 'modified',
		dryRun: true,
	});

	t.true(Array.isArray(changes));
	t.is(changes.length, 1);
	t.is(changes[0].filePath, filePath);
	t.is(changes[0].originalContent, 'original content');
	t.is(changes[0].newContent, 'modified content');
});

test('file deduplication', async t => {
	const {default: replaceInFiles} = await import('./api.js');
	const filePath = await tempWrite('test content');

	// Pass same file multiple times
	await replaceInFiles([filePath, filePath, filePath], {
		find: ['test'],
		replacement: 'modified',
	});

	t.is(fs.readFileSync(filePath, 'utf8'), 'modified content');
});

test('globby options applied correctly', async t => {
	const {default: replaceInFiles} = await import('./api.js');

	// Create files and test absolute paths are returned
	const filePath = await tempWrite('content');

	const changes = await replaceInFiles([filePath], {
		find: ['content'],
		replacement: 'modified',
		dryRun: true,
	});

	// Should have absolute path
	t.is(changes.length, 1);
	t.true(path.isAbsolute(changes[0].filePath));
});
