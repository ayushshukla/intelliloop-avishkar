import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ignoredDirectories = new Set([".git", "dist", "node_modules", "test-results"]);
const markdownLinkPattern = /!?\[[^\]]*\]\((?<target>[^)]+)\)/g;

async function collectMarkdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) {
      continue;
    }

    const entryPath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectMarkdownFiles(entryPath)));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      files.push(entryPath);
    }
  }

  return files;
}

function normalizeTarget(rawTarget) {
  let target = rawTarget.trim();
  if (target.startsWith("<") && target.endsWith(">")) {
    target = target.slice(1, -1);
  } else {
    target = target.split(/\s+["']/u, 1)[0];
  }
  return target;
}

function isNonLocalTarget(target) {
  return (
    target.length === 0 ||
    target.startsWith("#") ||
    /^[a-z][a-z\d+.-]*:/iu.test(target) ||
    target.startsWith("//")
  );
}

async function targetExists(sourceFile, target) {
  const pathPart = target.split("#", 1)[0];
  if (pathPart.length === 0) {
    return true;
  }

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathPart);
  } catch {
    return false;
  }

  try {
    await stat(resolve(dirname(sourceFile), decodedPath));
    return true;
  } catch {
    return false;
  }
}

const markdownFiles = await collectMarkdownFiles(repositoryRoot);
const brokenLinks = [];

for (const markdownFile of markdownFiles) {
  const content = await readFile(markdownFile, "utf8");
  for (const match of content.matchAll(markdownLinkPattern)) {
    const target = normalizeTarget(match.groups?.target ?? "");
    if (isNonLocalTarget(target)) {
      continue;
    }
    if (!(await targetExists(markdownFile, target))) {
      brokenLinks.push({
        file: relative(repositoryRoot, markdownFile).replaceAll("\\", "/"),
        target
      });
    }
  }
}

if (brokenLinks.length > 0) {
  for (const brokenLink of brokenLinks) {
    console.error(`${brokenLink.file} -> ${brokenLink.target}`);
  }
  console.error(
    `Documentation link check failed: ${brokenLinks.length} broken local target(s).`
  );
  process.exitCode = 1;
} else {
  console.log(
    `Documentation links: ${markdownFiles.length} Markdown files checked; 0 broken local targets.`
  );
}
