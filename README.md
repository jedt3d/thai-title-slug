# Thai Title Slug

Small zero-dependency Node.js CLI for turning Thai article titles into English
kebab-case slugs, especially for Hugo blog front matter.

It keeps the visible article title in Thai and only writes the URL slug:

```yaml
---
title: "AI กับโรงพยาบาลไทย"
slug: "ai-with-thai-hospitals"
---
```

## Usage

Generate one slug:

```sh
thai-title-slug --title "AI ในโรงพยาบาลไทย"
```

Scan Hugo content and fill missing `slug:` fields for posts with Thai titles:

```sh
thai-title-slug --content-dir content/english/blog
```

Check mode for CI:

```sh
thai-title-slug --content-dir content/english/blog --check
```

Dry run:

```sh
thai-title-slug --content-dir content/english/blog --dry-run
```

By default, content scanning only updates posts whose titles contain Thai text.
Use `--all-titles` if you also want missing slugs added for English titles.

## macOS Translation

Thai titles need English text before they can become URL-safe slugs. This tool
is designed to use Apple's built-in Translate action through macOS Shortcuts, so
you do not need an external translation service account.

Install the shared Shortcut:

[Translate Thai Title To English](https://www.icloud.com/shortcuts/34ff82d00d5d4100aed7916b0122e466)

The Shortcut must be named exactly `Translate Thai Title To English`. It reads
the input file passed by the `shortcuts` CLI, extracts the text, translates Thai
to English with Apple Translate, and returns the translated text.

Then run:

```sh
SLUG_TRANSLATE_SHORTCUT="Translate Thai Title To English" \
  thai-title-slug --title "AI ในโรงพยาบาลไทย"
```

Internally this uses:

```sh
shortcuts run "$SLUG_TRANSLATE_SHORTCUT" --input-path title.txt --output-type public.plain-text
```

If the iCloud link is unavailable, create it manually:

1. Open Shortcuts on macOS.
2. Create a new Shortcut.
3. Name it `Translate Thai Title To English`.
4. Add `Get Text from Input`.
5. Add `Translate Text`; set source language to Thai and target language to English.
6. Add `Stop and Output`, returning `Translated Text`.

For tests or a custom fully-local translator, `SLUG_TRANSLATE_COMMAND` is still
available. It receives the Thai title on stdin and should print English text on
stdout:

```sh
SLUG_TRANSLATE_COMMAND='your-translate-command' \
  thai-title-slug --title "AI ในโรงพยาบาลไทย"
```

## Hugo Integration

Install from GitHub once the repo is available:

```sh
npm install git+ssh://git@github.com/jedt3d/thai-title-slug.git --save-dev
```

Then run it before Hugo builds:

```json
{
  "scripts": {
    "slugs": "thai-title-slug --content-dir content/english/blog",
    "build": "npm run slugs && hugo --gc --minify"
  }
}
```

## Development

```sh
npm test
```

The test suite uses only Node.js built-ins.
