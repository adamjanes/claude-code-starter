import { RuleTester } from "eslint";
import { describe, it } from "vitest";

import commentLength from "../../eslint-rules/comment-length.mjs";
import noNarratingComments from "../../eslint-rules/no-narrating-comments.mjs";

RuleTester.describe = describe;
RuleTester.it = it;

const tester = new RuleTester({ languageOptions: { ecmaVersion: 2022, sourceType: "module" } });

describe("a comment is at most two lines unless it is labelled", () => {
  tester.run("comment-length", commentLength, {
    valid: [
      { code: "// One line.\nconst a = 1;" },
      { code: "// Two lines,\n// still fine.\nconst a = 1;" },
      { code: "/** Two lines\n * of JSDoc. */\nexport const a = 1;" },
      { code: "// TRAP(#12): a labelled comment\n// may run\n// to four\n// lines.\nconst a = 1;" },
      { code: "// SOURCE: docs/spec.md\n// may also\n// run to\n// four.\nconst a = 1;" },
      { code: "// BREAKS: due today counted as overdue\n// a test\n// may say\n// so.\nconst a = 1;", filename: "tests/unit/x.test.ts" },
      { code: "/**\n * Why it is blocked.\n * @param {string} line\n * @param {{ x?: number }} [opts]\n */\nexport function f() {}", filename: "x.mjs" },
      { code: "// eslint-disable-next-line no-console\n// One line.\n// Two lines.\nconsole.log(1);" },
      { code: "const a = 1; // a trailing comment\n// starts its own block\n// of two.\n" },
    ],
    invalid: [
      { code: "// One,\n// two,\n// three.\nconst a = 1;", errors: [{ messageId: "tooLong" }] },
      { code: "// One,\n\n// two after a blank line,\n// three: still one block.\nconst a = 1;", errors: [{ messageId: "tooLong" }] },
      { code: "/**\n * One.\n * Two.\n * Three.\n */\nexport const a = 1;", errors: [{ messageId: "tooLong" }] },
      { code: "// TRAP: no citation earns nothing\n// two\n// three\nconst a = 1;", errors: [{ messageId: "tooLong" }] },
      { code: "// BREAKS: outside a test file\n// two\n// three\nconst a = 1;", filename: "lib/x.ts", errors: [{ messageId: "tooLong" }] },
      { code: "// TRAP(#12): one\n// two\n// three\n// four\n// five\nconst a = 1;", errors: [{ messageId: "tooLong" }] },
      { code: "/**\n * One.\n * Two.\n * @param {string} line\n */\nexport function f() {}", filename: "x.ts", errors: [{ messageId: "tooLong" }] },
    ],
  });
});

describe("a comment says what is true now, not what changed or when", () => {
  tester.run("no-narrating-comments", noNarratingComments, {
    valid: [
      { code: "// ISO dates compare correctly as strings.\nconst a = 1;" },
      { code: "// The key used to sign the URL.\nconst a = 1;" },
      { code: "/** `2026-10-22` → `22 Oct`. */\nexport const a = 1;" },
      { code: '// Shows "No longer available" when the item is gone.\nconst a = 1;' },
      { code: "// See fixtures/2026-10-22-capture.json.\nconst a = 1;" },
      { code: "// a -- b\nconst a = 1;" },
      { code: "// SOURCE: lib/sample-tasks.ts, today 2026-10-22\nconst a = 1;" },
    ],
    invalid: [
      { code: "// Previously this read the cache.\nconst a = 1;", errors: [{ messageId: "narration" }] },
      { code: "// This no longer retries.\nconst a = 1;", errors: [{ messageId: "narration" }] },
      { code: "// It now uses the shared helper.\nconst a = 1;", errors: [{ messageId: "narration" }] },
      { code: "// Moved from lib/old.ts.\nconst a = 1;", errors: [{ messageId: "narration" }] },
      { code: "// It used to retry three times.\nconst a = 1;", errors: [{ messageId: "narration" }] },
      { code: "// Checked on 2026-10-22.\nconst a = 1;", errors: [{ messageId: "date" }] },
      { code: "// Measured in Oct 2026.\nconst a = 1;", errors: [{ messageId: "date" }] },
      { code: "// ----------------\nconst a = 1;", errors: [{ messageId: "separator" }] },
      { code: "/* ======== */\nconst a = 1;", errors: [{ messageId: "separator" }] },
      { code: "// --- Helpers ---\nconst a = 1;", errors: [{ messageId: "separator" }] },
    ],
  });
});
