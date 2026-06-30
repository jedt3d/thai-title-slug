# Translate Thai Title To English Shortcut

Install:

https://www.icloud.com/shortcuts/34ff82d00d5d4100aed7916b0122e466

Required Shortcut name:

```text
Translate Thai Title To English
```

Purpose:

This Shortcut is used by `thai-title-slug` through the macOS `shortcuts` CLI. It
reads a title from the input file, extracts the text, translates Thai to English
with Apple Translate, and returns plain text for slug generation.

Expected command:

```sh
SLUG_TRANSLATE_SHORTCUT="Translate Thai Title To English" \
  thai-title-slug --title "AI ในโรงพยาบาลไทย"
```
