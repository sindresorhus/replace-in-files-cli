# replace-in-files-cli

> Replace matching strings and regexes in files

## Install

```sh
npm install --global replace-in-files-cli
```

## Usage

```
$ replace-in-files --help

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
    $ replace-in-files --regex='v\d+\.\d+\.\d+' --replacement=v$npm_package_version foo.css
    $ replace-in-files --string='blob' --replacement='blog' 'some/**/[gb]lob/*' '!some/glob/foo'
    $ replace-in-files --dry-run --string='old' --replacement='new' file.txt

  You can use the same replacement patterns as with `String#replace()`, like `$&`.

  When working with quotes in shell commands, escape them with backslashes:
    $ replace-in-files --string='\"use strict\";' --replacement='\"use strict\";\nrequire(\"module\");' file.js
```

Real-world use-case: [Bumping version number in a file when publishing to npm](https://github.com/sindresorhus/modern-normalize/commit/c1d65e3f7daba2b695ccf837d2aef19d586d1ca6)

The regex should be [JavaScript flavor](https://www.regular-expressions.info/javascript.html).

## API

You can also use this package programmatically:

```js
import replaceInFiles from 'replace-in-files-cli';

// Find and replace
await replaceInFiles('*.js', {
	find: ['old', /version \d+/],
	replacement: 'new'
});

// Transform entire file content
await replaceInFiles('*.js', {
	transform: (content, filePath) => `/* Banner */\n${content}`
});

// Combine find/replace with transform (transform runs after find/replace)
await replaceInFiles('*.js', {
	find: ['old'],
	replacement: 'new', 
	transform: (content, filePath) => `/* ${filePath} */\n${content}`
});
```

The `transform` option provides full control over file content:
- **Standalone**: Use alone for prepend, append, or complex transformations
- **Combined**: Use with `find`/`replacement` - transform runs after find/replace operations
- **Parameters**: Receives `(content, filePath)` for context-aware transformations
