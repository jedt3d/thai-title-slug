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

## Translation Providers

Thai titles need an English translation provider. The CLI checks providers in
this order.

### Custom Command

`SLUG_TRANSLATE_COMMAND` receives the title on stdin and should print English
text on stdout:

```sh
SLUG_TRANSLATE_COMMAND='your-translate-command' \
  thai-title-slug --title "AI ในโรงพยาบาลไทย"
```

### macOS Shortcuts

Create a Shortcut that accepts text input, translates it to English, and returns
plain text. Then run:

```sh
SLUG_TRANSLATE_SHORTCUT="Translate Thai Title To English" \
  thai-title-slug --title "AI ในโรงพยาบาลไทย"
```

Internally this uses:

```sh
shortcuts run "$SLUG_TRANSLATE_SHORTCUT" --input-path title.txt --output-type public.plain-text
```

### LibreTranslate

Point the CLI at a LibreTranslate server:

```sh
LIBRETRANSLATE_URL="https://libretranslate.example" \
  thai-title-slug --title "AI ในโรงพยาบาลไทย"
```

Optional settings:

```sh
LIBRETRANSLATE_API_KEY="..."
SLUG_TRANSLATE_SOURCE="th"
SLUG_TRANSLATE_TARGET="en"
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
