import fs from "fs";
import path from "path";

const roots = ["src", "styles", "scripts", "api"];
const extensions = new Set([".js", ".css", ".html"]);
const suspiciousChars = /[\u0400\u0402-\u040F\u0450\u0452-\u045F\u00A0\u00B0-\u00BF]/u;
const mojibakeFragments = [
  "\u0432\u0402",
  "\u0420\u045c",
  "\u0420\u040f",
  "\u0420\u2018",
  "\u0420\u040e",
  "\u0420\u045a",
  "\u0420\u201c",
  "\u0420\u00a4",
  "\u0420\u0408",
  "\u0420\u0459",
  "\u0420\u0402",
  "\u0421\u0453",
  "\u0421\u201a",
  "\u0421\u040a",
  "\u0421\u045b",
  "\u0421\u040f",
  "\u0421\u2039",
  "\u0421\u2020",
  "\u0421\u2021",
  "\u0421\u20ac",
  "\u0421\u2030",
];

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
      .filter((entry) => suspiciousChars.test(entry.line) || mojibakeFragments.some((fragment) => entry.line.includes(fragment))),
  );

if (findings.length) {
  findings.forEach((entry) => {
    console.log(`${entry.file}:${entry.lineNumber}:${entry.line}`);
  });
  process.exit(1);
}

console.log("Unicode check passed");
