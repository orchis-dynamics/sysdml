import { describe, test } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE_ROOT = join(__dirname, "..", "src");

function listTypeScriptSources(directory: string): string[] {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listTypeScriptSources(fullPath));
    } else if (entry.name.endsWith(".ts")) {
      files.push(fullPath);
    }
  }
  return files;
}

function stripLineComment(line: string): string {
  const commentStart = line.indexOf("//");
  return commentStart === -1 ? line : line.slice(0, commentStart);
}

interface Offender {
  file: string;
  line: number;
  text: string;
  pattern: string;
}

// The simulator must remain interpretive: it walks the IR and computes values
// directly rather than compiling user expressions to JavaScript. This invariant
// is load-bearing for security in any browser-hosted context (VS Code webview,
// future Monaco demo) because the IR is derived from user-supplied .sysdml
// source. If the simulator ever begins eval'ing user input, that source becomes
// executable code in the visitor's browser.
//
// This test exists as a tripwire: any future change that introduces eval() or
// new Function() into @sysdml/simulator must trip CI and force an explicit
// security review.
describe("simulator security invariants", () => {
  test("source contains no eval() or Function() constructor calls", () => {
    const evalPattern = /\beval\s*\(/;
    const functionConstructorPattern = /\bnew\s+Function\s*\(/;
    const sources = listTypeScriptSources(SOURCE_ROOT);
    const offenders: Offender[] = [];

    for (const file of sources) {
      const content = readFileSync(file, "utf-8");
      const lines = content.split("\n");
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const rawLine = lines[lineIndex] ?? "";
        const code = stripLineComment(rawLine);
        if (evalPattern.test(code)) {
          offenders.push({ file, line: lineIndex + 1, text: rawLine.trim(), pattern: "eval()" });
        }
        if (functionConstructorPattern.test(code)) {
          offenders.push({ file, line: lineIndex + 1, text: rawLine.trim(), pattern: "new Function()" });
        }
      }
    }

    if (offenders.length > 0) {
      const summary = offenders
        .map((offender) => `  ${offender.file}:${offender.line} — ${offender.pattern}\n    ${offender.text}`)
        .join("\n");
      throw new Error(
        `Simulator must remain interpretive — found ${offenders.length} forbidden ` +
          `JavaScript-execution call(s) in source:\n${summary}\n\n` +
          `Why: .sysdml source flows through parser → IR → simulator. If the ` +
          `simulator ever interprets IR by compiling to JavaScript at runtime, ` +
          `user input becomes executable code in any browser-hosted context. This ` +
          `is the difference between "user-controlled data" and "user-controlled ` +
          `JavaScript" — a path to XSS in hosted demos.\n\n` +
          `If this change is intentional, update or remove this test and add a ` +
          `comment explaining the new threat model.`,
      );
    }
  });
});
