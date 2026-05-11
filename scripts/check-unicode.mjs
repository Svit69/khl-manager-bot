import fs from "fs";
import path from "path";

const roots = ["src", "styles"];
const extensions = new Set([".js", ".css", ".html"]);
const suspiciousChars = /[\u0400\u0402-\u040F\u0450\u0452-\u045F\u00A0\u00B0-\u00BF]/u;

const walk = (directory) => {
  const result = [];
  fs.readdirSync(directory, { withFileTypes: true }).forEach((item) => {
    const fullPath = path.join(directory, item.name);
    if (item.isDirectory()) {
      result.push(...walk(fullPath));
      return;
    }
    if (extensions.has(path.extname(item.name))) result.push(fullPath);
  });
  return result;
};

const findings = roots
  .filter((root) => fs.existsSync(root))
  .flatMap(walk)
  .flatMap((file) =>
    fs
      .readFileSync(file, "utf8")
      .split(/\r?\n/)
      .map((line, index) => ({ file, line, lineNumber: index + 1 }))
      .filter((entry) => suspiciousChars.test(entry.line)),
  );

if (findings.length) {
  findings.forEach((entry) => {
    console.log(`${entry.file}:${entry.lineNumber}:${entry.line}`);
  });
  process.exit(1);
}

console.log("Unicode check passed");
