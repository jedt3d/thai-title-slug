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

Create a Shortcut named `Translate Thai Title To English`:

1. Open Shortcuts on macOS.
2. Create a new Shortcut.
3. Set it to receive text from Shortcut Input.
4. Add the Translate Text action.
5. Set source language to Thai and target language to English.
6. Return the translated text as the Shortcut result.

Then run:

```sh
SLUG_TRANSLATE_SHORTCUT="Translate Thai Title To English" \
  thai-title-slug --title "AI ในโรงพยาบาลไทย"
```

Internally this uses:

```sh
shortcuts run "$SLUG_TRANSLATE_SHORTCUT" --input-path title.txt --output-type public.plain-text
```

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
