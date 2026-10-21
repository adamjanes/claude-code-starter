import { blockLoc, commentBlocks, isLabelled } from "./comments.mjs";

const UNLABELLED = 2;
const LABELLED = 4;
// In plain JS, JSDoc type tags are the type system, so those lines are not prose.
const TYPE_TAG = /^@(?:typedef|param|returns?|type|template|property|prop|callback)\b/;
const JS_FILE = /\.[cm]?jsx?$/;

/** @type {import("eslint").Rule.RuleModule} */
const commentLength = {
  meta: {
    type: "suggestion",
    docs: { description: "an unlabelled comment is at most 2 content lines; a labelled one at most 4" },
    schema: [],
    messages: {
      tooLong:
        "This comment is {{lines}} lines; the cap is {{cap}} ({{why}}). Comment the non-obvious decision, " +
        "not the change: when shortening, delete. TRAP(#n), INCIDENT(#n), WORKAROUND(#n), REJECTED(#n), " +
        "SOURCE: <document> and, in tests, BREAKS: <the break> buy {{labelled}} lines.",
    },
  },

  create(context) {
    const skipTypeTags = JS_FILE.test(context.filename);
    return {
      Program() {
        for (const block of commentBlocks(context.sourceCode)) {
          const lines = skipTypeTags ? block.lines.filter((line) => !TYPE_TAG.test(line)) : block.lines;
          const labelled = isLabelled(block.lines[0] ?? "", context.filename);
          const cap = labelled ? LABELLED : UNLABELLED;
          if (lines.length <= cap) continue;
          context.report({
            loc: blockLoc(block),
            messageId: "tooLong",
            data: { lines: String(lines.length), cap: String(cap), why: labelled ? "labelled" : "no label", labelled: String(LABELLED) },
          });
        }
      },
    };
  },
};

export default commentLength;
