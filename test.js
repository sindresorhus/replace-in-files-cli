import fs from 'fs';
import path from 'path';
import test from 'ava';
import execa from 'execa';
import tempWrite from 'temp-write';

test('--string', async t => {
	const filePath = await tempWrite('foo bar foo');
	await execa('./cli.js', ['--string=bar', '--replacement=foo', filePath]);
	t.is(fs.readFileSync(filePath, 'utf8'), 'foo foo foo');
});

test('--regex', async t => {
	const filePath = await tempWrite('foo bar foo');
	await execa('./cli.js', ['--regex=\\bb.*?\\b', '--replacement=foo', filePath]);
	t.is(fs.readFileSync(filePath, 'utf8'), 'foo foo foo');
});

test('newlines and tabs', async t => {
	const filePath = await tempWrite('a,b,c');
	await execa('./cli.js', ['--string=,', '--replacement=\\n', filePath]);
	t.is(fs.readFileSync(filePath, 'utf8'), 'a\nb\nc');

	const filePath2 = await tempWrite('a,b,c');
	await execa('./cli.js', ['--string=,', '--replacement=\\t', filePath2]);
	t.is(fs.readFileSync(filePath2, 'utf8'), 'a\tb\tc');

	const filePath3 = await tempWrite('a,b,c');
	await execa('./cli.js', ['--string=,', '--replacement=\\r', filePath3]);
	t.is(fs.readFileSync(filePath3, 'utf8'), 'a\rb\rc');
});

test('multiple newlines and tabs', async t => {
	const filePath = await tempWrite('a,b,c');
	await execa('./cli.js', ['--string=,', '--replacement=\\n\\n\\t\\r', filePath]);
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
	const filePaths = [await tempWrite('foo bar foo', '*.glob'), await tempWrite('foo bar foo', 'foo.glob')];
	const dirnames = filePaths.map(filePath => path.dirname(filePath));

	await t.throwsAsync(
		execa('./cli.js', [
			'--string=bar',
			'--replacement=foo',
			'--no-glob',
			path.join(dirnames[0], '*.glob'),
			path.join(dirnames[1], '*.glob')
		]),
		{
			code: 1,
			message: /ENOENT/
		}
	);
});
