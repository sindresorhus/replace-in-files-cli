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

  Examples
    $ replace-in-files --string='horse' --regex='unicorn|rainbow' --replacement='🦄' foo.md
    $ replace-in-files --regex='v\d+\.\d+\.\d+' --replacement=v$npm_package_version foo.css
    $ replace-in-files --string='blob' --replacement='blog' 'some/**/[gb]lob/*' '!some/glob/foo'

  You can use the same replacement patterns as with `String#replace()`, like `$&`.
```

Real-world use-case: [Bumping version number in a file when publishing to npm](https://github.com/sindresorhus/modern-normalize/commit/c1d65e3f7daba2b695ccf837d2aef19d586d1ca6)
