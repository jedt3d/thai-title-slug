const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const repoRoot = path.resolve(__dirname, "..");
const cliPath = path.join(repoRoot, "bin", "thai-title-slug.js");

function run(args, options = {}) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: options.cwd || repoRoot,
    encoding: "utf8",
    env: { ...process.env, ...options.env },
  });

  return {
    code: result.status,
    stderr: result.stderr.trim(),
    stdout: result.stdout.trim(),
  };
}

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "thai-title-slug-test-"));
}

function writeTranslator(tempDir, text) {
  const translatorPath = path.join(tempDir, "translator.js");
  fs.writeFileSync(
    translatorPath,
    [
      "process.stdin.resume();",
      "process.stdin.setEncoding('utf8');",
      "process.stdin.on('end', () => console.log(process.env.TEST_TRANSLATION));",
    ].join("\n"),
    "utf8",
  );
  return {
    command: `${process.execPath} ${translatorPath}`,
    env: { TEST_TRANSLATION: text },
  };
}

function testEnglishTitle() {
  const result = run(["--title", "Open Source in Healthcare: Small Tools & Big Habits"]);
  assert.strictEqual(result.code, 0, result.stderr);
  assert.strictEqual(result.stdout, "open-source-in-healthcare-small-tools-and-big-habits");
}

function testThaiTitleWithCommand() {
  const tempDir = makeTempDir();
  const translator = writeTranslator(tempDir, "AI in Thai hospitals");
  const result = run(["--title", "AI ในโรงพยาบาลไทย"], {
    env: {
      SLUG_TRANSLATE_COMMAND: translator.command,
      ...translator.env,
    },
  });

  assert.strictEqual(result.code, 0, result.stderr);
  assert.strictEqual(result.stdout, "ai-in-thai-hospitals");
}

function testHugoContentUpdate() {
  const tempDir = makeTempDir();
  const contentDir = path.join(tempDir, "content", "english", "blog");
  fs.mkdirSync(contentDir, { recursive: true });
  fs.writeFileSync(
    path.join(contentDir, "thai-post.md"),
    [
      "---",
      'title: "AI กับโรงพยาบาลไทย"',
      'date: "2026-06-30T10:00:00+07:00"',
      "---",
      "",
      "Draft body.",
      "",
    ].join("\n"),
    "utf8",
  );

  const translator = writeTranslator(tempDir, "AI with Thai hospitals");
  const result = run(["--content-dir", "content/english/blog"], {
    cwd: tempDir,
    env: {
      SLUG_TRANSLATE_COMMAND: translator.command,
      ...translator.env,
    },
  });

  assert.strictEqual(result.code, 0, result.stderr);
  assert.match(result.stdout, /set slug "ai-with-thai-hospitals"/);

  const updated = fs.readFileSync(path.join(contentDir, "thai-post.md"), "utf8");
  assert.match(updated, /title: "AI กับโรงพยาบาลไทย"\nslug: "ai-with-thai-hospitals"/);
}

function testCheckModeFailsWhenSlugMissing() {
  const tempDir = makeTempDir();
  const contentDir = path.join(tempDir, "content", "english", "blog");
  fs.mkdirSync(contentDir, { recursive: true });
  fs.writeFileSync(
    path.join(contentDir, "thai-post.md"),
    ["---", 'title: "ภาพถ่ายกับเมือง"', "---", "", "Draft body.", ""].join("\n"),
    "utf8",
  );

  const translator = writeTranslator(tempDir, "Photography and the city");
  const result = run(["--content-dir", "content/english/blog", "--check"], {
    cwd: tempDir,
    env: {
      SLUG_TRANSLATE_COMMAND: translator.command,
      ...translator.env,
    },
  });

  assert.strictEqual(result.code, 1);
  assert.match(result.stdout, /would set slug "photography-and-the-city"/);
  assert.match(result.stderr, /Some posts need generated slugs/);
}

function main() {
  testEnglishTitle();
  testThaiTitleWithCommand();
  testHugoContentUpdate();
  testCheckModeFailsWhenSlugMissing();
  console.log("All tests passed.");
}

main();
