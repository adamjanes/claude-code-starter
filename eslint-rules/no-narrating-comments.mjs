import { blockLoc, commentBlocks, isSourceCited } from "./comments.mjs";

// Change narration: git owns the history, a comment says what is true now.
const NARRATION = [
  /\bpreviously\b(?!-)/i,
  /\bno longer\b/i,
  // The history sense has a subject: "it used to retry". "The key used to sign" is the purpose sense.
  /\b(?:we|it|this|that|they|which)\s+used to\b/i,
  /\bmoved (?:from|to|here)\b/i,
  /\bnow (?:uses|does|calls|returns|lives|reads|renders)\b/i,
  /\b(?:is|are) now\b/i,
  /\brenamed (?:from|to)\b/i,
  /\bformerly\b/i,
  /\boriginally\b/i,
  /\bthe old (?:version|code|behaviou?r|implementation)\b/i,
];
// A date glued into a path or slug names a file, not a moment.
const ISO_DATE = /(?<![\w/-])\d{4}-\d{2}-\d{2}(?![\w/-]|\.\w)/;
const MONTH_YEAR = /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{4}\b/i;
const SEPARATOR = /^[\s/*]*([-=_#*~─━])\1{3,}[\s/*]*$|^([-=─━#~])\2{2,}\s+\S.*\s([-=─━#~])\3{2,}\s*$/;
// Quoted text and code spans are evidence (UI copy, an example value), not narration or a timestamp.
const unquoted = (text) =>
  text.replace(/"[^"]{1,240}"/g, '""').replace(/“[^”]{1,240}”/g, "“”").replace(/`[^`]{1,240}`/g, "``");

/** @type {import("eslint").Rule.RuleModule} */
const noNarratingComments = {
  meta: {
    type: "suggestion",
    docs: { description: "no change narration, dates or separator lines in comments" },
    schema: [],
    messages: {
      narration: "This comment narrates a change (“{{match}}”): git owns the history; say what is true now.",
      date: "This comment carries a date (“{{match}}”): a date is a staleness timer. Cite the issue instead.",
      separator: "This comment is a ruled line: structure comes from the code, not from dashes.",
    },
  },

  create(context) {
    return {
      Program() {
        for (const block of commentBlocks(context.sourceCode)) {
          const loc = blockLoc(block);
          const text = block.lines.join(" ");
          const prose = unquoted(text);
          for (const pattern of NARRATION) {
            const hit = prose.match(pattern);
            if (hit) {
              context.report({ loc, messageId: "narration", data: { match: hit[0] } });
              break;
            }
          }
          const date = isSourceCited(block.lines[0] ?? "") ? null : (prose.match(ISO_DATE) ?? prose.match(MONTH_YEAR));
          if (date) context.report({ loc, messageId: "date", data: { match: date[0] } });
          const raw = block.tokens.flatMap((token) => token.value.split("\n"));
          if (raw.some((line) => SEPARATOR.test(line.trim())) || block.lines.some((line) => SEPARATOR.test(line))) {
            context.report({ loc, messageId: "separator" });
          }
        }
      },
    };
  },
};

export default noNarratingComments;
