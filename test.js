import fs from 'fs';
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

test('new lines and tabs', async t => {
	let filePath = await tempWrite('a,b,c');
	await execa('./cli.js', ['--string=,', '--replacement=\\n', filePath]);
	t.is(fs.readFileSync(filePath, 'utf8'), 'a\nb\nc');
	filePath = await tempWrite('a,b,c');
	await execa('./cli.js', ['--string=,', '--replacement=\\t', filePath]);
	t.is(fs.readFileSync(filePath, 'utf8'), 'a\tb\tc');
	filePath = await tempWrite('a,b,c');
	await execa('./cli.js', ['--string=,', '--replacement=\\r', filePath]);
	t.is(fs.readFileSync(filePath, 'utf8'), 'a\rb\rc');
});

test('multiple new lines and tabs', async t => {
	const filePath = await tempWrite('a,b,c');
	await execa('./cli.js', ['--string=,', '--replacement=\\n\\n\\t\\r', filePath]);
	t.is(fs.readFileSync(filePath, 'utf8'), 'a\n\n\t\rb\n\n\t\rc');
});
