#!/usr/bin/env node

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const THAI_RE = /[\u0E00-\u0E7F]/;
const DEFAULT_CONTENT_DIR = "content/english/blog";
const VERSION = "0.1.0";

function parseArgs(argv) {
  const args = {
    allTitles: false,
    check: false,
    contentDir: DEFAULT_CONTENT_DIR,
    dryRun: false,
    help: false,
    title: "",
    version: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--all-titles") {
      args.allTitles = true;
    } else if (arg === "--check") {
      args.check = true;
    } else if (arg === "--content-dir" || arg === "--blog-dir") {
      args.contentDir = argv[i + 1] || "";
      i += 1;
    } else if (arg.startsWith("--content-dir=")) {
      args.contentDir = arg.slice("--content-dir=".length);
    } else if (arg.startsWith("--blog-dir=")) {
      args.contentDir = arg.slice("--blog-dir=".length);
    } else if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--title") {
      args.title = argv[i + 1] || "";
      i += 1;
    } else if (arg.startsWith("--title=")) {
      args.title = arg.slice("--title=".length);
    } else if (arg === "--version" || arg === "-v") {
      args.version = true;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  return args;
}

function usage() {
  return [
    "thai-title-slug",
    "",
    "Generate English kebab-case slugs from Thai titles.",
    "",
    "Usage:",
    "  thai-title-slug --title \"AI ในโรงพยาบาลไทย\"",
    "  thai-title-slug --content-dir content/english/blog",
    "  thai-title-slug --content-dir content/english/blog --check",
    "",
    "Options:",
    "  --title <text>        Print one generated slug and exit.",
    "  --content-dir <dir>   Scan Hugo Markdown files. Default: content/english/blog",
    "  --blog-dir <dir>      Alias for --content-dir.",
    "  --all-titles          Add missing slugs for non-Thai titles too.",
    "  --check               Report missing generated slugs without editing.",
    "  --dry-run             Show intended changes without editing.",
    "  --version             Print the package version.",
    "  --help                Show this help.",
    "",
    "Translation providers, checked in this order:",
    "  SLUG_TRANSLATE_COMMAND   Command that receives the Thai title on stdin.",
    "  SLUG_TRANSLATE_SHORTCUT  macOS Shortcut name.",
    "  LIBRETRANSLATE_URL       LibreTranslate server URL.",
  ].join("\n");
}

function hasThai(text) {
  return THAI_RE.test(text);
}

function slugify(text) {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function getFrontmatter(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    return null;
  }

  return {
    raw: match[0],
    body: match[1],
    end: match[0].length,
  };
}

function getStringField(frontmatter, field) {
  const escapedField = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = frontmatter.match(
    new RegExp(`^${escapedField}:\\s*(?:"([^"]*)"|'([^']*)'|([^\\n#]*))\\s*$`, "m"),
  );

  if (!match) {
    return "";
  }

  return (match[1] ?? match[2] ?? match[3] ?? "").trim();
}

function hasUsableSlug(frontmatter) {
  return Boolean(getStringField(frontmatter, "slug"));
}

function setSlug(markdown, frontmatter, slug) {
  const line = `slug: "${slug}"`;
  let nextBody;

  if (/^slug:\s*.*$/m.test(frontmatter.body)) {
    nextBody = frontmatter.body.replace(/^slug:\s*.*$/m, line);
  } else {
    const titleLine = /^title:\s*.*$/m;
    if (titleLine.test(frontmatter.body)) {
      nextBody = frontmatter.body.replace(titleLine, (match) => `${match}\n${line}`);
    } else {
      nextBody = `${line}\n${frontmatter.body}`;
    }
  }

  return `---\n${nextBody}\n---\n${markdown.slice(frontmatter.end)}`;
}

function translateWithCommand(title) {
  const command = process.env.SLUG_TRANSLATE_COMMAND;
  if (!command) {
    return "";
  }

  const result = spawnSync(command, {
    input: title,
    encoding: "utf8",
    shell: true,
    timeout: 30000,
  });

  if (result.status !== 0) {
    throw new Error(
      `SLUG_TRANSLATE_COMMAND failed: ${(result.stderr || result.stdout || "").trim()}`,
    );
  }

  return (result.stdout || "").trim();
}

function translateWithShortcut(title) {
  const shortcut = process.env.SLUG_TRANSLATE_SHORTCUT;
  if (!shortcut || process.platform !== "darwin") {
    return "";
  }

  const inputPath = path.join(
    os.tmpdir(),
    `thai-title-slug-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`,
  );

  fs.writeFileSync(inputPath, title, "utf8");

  try {
    const result = spawnSync(
      "shortcuts",
      ["run", shortcut, "--input-path", inputPath, "--output-type", "public.plain-text"],
      {
        encoding: "utf8",
        timeout: 30000,
      },
    );

    if (result.status !== 0) {
      throw new Error(
        `Shortcut "${shortcut}" failed: ${(result.stderr || result.stdout || "").trim()}`,
      );
    }

    return (result.stdout || "").trim();
  } finally {
    fs.rmSync(inputPath, { force: true });
  }
}

async function translateWithLibreTranslate(title) {
  const baseUrl = process.env.LIBRETRANSLATE_URL;
  if (!baseUrl) {
    return "";
  }

  const endpoint = new URL("/translate", baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  const body = {
    q: title,
    source: process.env.SLUG_TRANSLATE_SOURCE || "th",
    target: process.env.SLUG_TRANSLATE_TARGET || "en",
    format: "text",
  };

  if (process.env.LIBRETRANSLATE_API_KEY) {
    body.api_key = process.env.LIBRETRANSLATE_API_KEY;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`LibreTranslate failed with HTTP ${response.status}`);
  }

  const data = await response.json();
  return String(data.translatedText || "").trim();
}

async function translateTitle(title) {
  return (
    translateWithCommand(title) ||
    translateWithShortcut(title) ||
    (await translateWithLibreTranslate(title))
  );
}

async function slugFromTitle(title) {
  const source = hasThai(title) ? await translateTitle(title) : title;
  const slug = slugify(source);

  if (!slug) {
    throw new Error(
      [
        `Could not generate an English slug for "${title}".`,
        "Set one manually with slug: \"english-kebab-case\" or configure a provider:",
        "- SLUG_TRANSLATE_COMMAND=\"your-command\"",
        "- SLUG_TRANSLATE_SHORTCUT=\"Your macOS Shortcut Name\"",
        "- LIBRETRANSLATE_URL=\"https://your-libretranslate.example\"",
      ].join("\n"),
    );
  }

  return slug;
}

function listMarkdownFiles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...listMarkdownFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith(".md") && entry.name !== "_index.md") {
      files.push(entryPath);
    }
  }

  return files.sort();
}

async function ensureContentSlugs({
  allTitles = false,
  check = false,
  contentDir = DEFAULT_CONTENT_DIR,
  dryRun = false,
} = {}) {
  const absoluteDir = path.resolve(process.cwd(), contentDir);
  const updates = [];

  for (const filePath of listMarkdownFiles(absoluteDir)) {
    const markdown = fs.readFileSync(filePath, "utf8");
    const frontmatter = getFrontmatter(markdown);
    if (!frontmatter || hasUsableSlug(frontmatter.body)) {
      continue;
    }

    const title = getStringField(frontmatter.body, "title");
    if (!title || (!allTitles && !hasThai(title))) {
      continue;
    }

    const slug = await slugFromTitle(title);
    updates.push({ filePath, slug, title });

    if (!check && !dryRun) {
      fs.writeFileSync(filePath, setSlug(markdown, frontmatter, slug), "utf8");
    }
  }

  for (const update of updates) {
    const relative = path.relative(process.cwd(), update.filePath);
    const action = check || dryRun ? "would set" : "set";
    console.log(`${action} slug "${update.slug}" in ${relative}`);
  }

  if (check && updates.length > 0) {
    throw new Error("Some posts need generated slugs. Run thai-title-slug to update them.");
  }

  if (updates.length === 0 && !check) {
    console.log("No missing Thai-title slugs found.");
  }

  return updates;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(usage());
    return;
  }

  if (args.version) {
    console.log(VERSION);
    return;
  }

  if (args.title) {
    console.log(await slugFromTitle(args.title));
    return;
  }

  await ensureContentSlugs(args);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = {
  ensureContentSlugs,
  getFrontmatter,
  getStringField,
  hasThai,
  setSlug,
  slugFromTitle,
  slugify,
};
