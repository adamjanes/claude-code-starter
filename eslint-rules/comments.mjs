// What both comment rules share: grouping comment tokens into blocks, and recognising labels.

// Comments ESLint, TypeScript or a test runner read as instructions are code, not prose.
const DIRECTIVE = /^(?:eslint-(?:disable|enable)\b|eslint(?:-env)?\s|globals?\s|@ts-(?:expect-error|ignore|nocheck|check)\b|prettier-ignore\b|@vitest-environment\b|<reference\b)/;

/** A comment's content lines, with the `//`, `*` framing and blank lines removed. */
export function contentLines(comment) {
  const framing = comment.type === "Block" ? /^\s*\*?\s?/ : /^\s*\/*\s?/;
  return comment.value
    .split("\n")
    .map((line) => line.replace(framing, "").trim())
    .filter((line) => line.length > 0);
}

function isDirective(comment) {
  if (comment.type !== "Line" && comment.type !== "Block") return true;
  return DIRECTIVE.test(contentLines(comment)[0] ?? "");
}

function isTrailing(sourceCode, comment) {
  const before = sourceCode.getTokenBefore(comment, { includeComments: false });
  return before !== null && before.loc.end.line === comment.loc.start.line;
}

/** Same-syntax comments separated only by whitespace form one block; a trailing comment stands alone. */
export function commentBlocks(sourceCode) {
  const blocks = [];
  let current = null;
  for (const comment of sourceCode.getAllComments()) {
    if (isDirective(comment)) {
      current = null;
      continue;
    }
    const trailing = isTrailing(sourceCode, comment);
    const last = current?.tokens.at(-1);
    const gap = last ? sourceCode.text.slice(last.range[1], comment.range[0]) : "";
    if (last && !current.trailing && !trailing && last.type === comment.type && gap.trim() === "") {
      current.tokens.push(comment);
      current.lines.push(...contentLines(comment));
    } else {
      current = { tokens: [comment], lines: contentLines(comment), trailing };
      blocks.push(current);
    }
  }
  return blocks;
}

export function blockLoc(block) {
  return { start: block.tokens[0].loc.start, end: block.tokens.at(-1).loc.end };
}

const TEST_FILE = /\.(?:test|spec)\.[cm]?[jt]sx?$|(?:^|[/\\])tests[/\\]/;
const ISSUE_LABEL = /^(?:TRAP|INCIDENT|WORKAROUND|REJECTED)\(#\d+\)/;
// A SOURCE names a document: a path, a URL, a file name or an issue, never a bare word.
const SOURCE_LABEL = /^SOURCE:\s*\S*(?:[/.]|#\d)/;
const BREAKS_LABEL = /^BREAKS:\s*\S/;

/** A `SOURCE: <document>` line: a date in it is provenance for the figure, not a staleness timer. */
export const isSourceCited = (firstLine) => SOURCE_LABEL.test(firstLine);

/** A first line that earns the longer cap: `LABEL(#n)`, `SOURCE: <document>`, or a test's `BREAKS: …`. */
export function isLabelled(firstLine, filename) {
  if (ISSUE_LABEL.test(firstLine) || SOURCE_LABEL.test(firstLine)) return true;
  return TEST_FILE.test(filename) && BREAKS_LABEL.test(firstLine);
}
