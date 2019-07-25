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

test('--string', async t => {
	const filePath = await tempWrite(',');
	await execa('./cli.js', ['--string=,', '--replacement=\n', filePath]);
	t.is(fs.readFileSync(filePath, 'utf8'), '\n');
});

