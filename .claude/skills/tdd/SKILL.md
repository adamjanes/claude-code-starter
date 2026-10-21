---
name: tdd
description: How tests are written here — red before green, tests at public seams only, what may be faked, expected values from outside the code, and the receipt that proves a test can fail. Load whenever a test is added, changed or deleted.
user-invocable: false
---

# tdd — a test exists to fail when the product breaks, and at no other time

The loop is adapted from Matt Pocock's `engineering/tdd` skill
(<https://github.com/mattpocock/skills/tree/main/skills/engineering/tdd>); quoted rules are his.

## Seams: where tests go

> "Tests verify behavior through public interfaces, not implementation details."

A **seam** is the public boundary a bug would have to cross: a route handler, a server action, a
rendered component, a module's exported function. **Before writing a test, name its seam** —
`/work`'s sign-off gate lists one line per behaviour with its entry point. A test that can only be
written against a private helper means the seam is wrong: move the seam, don't lower the test.

## The loop

- **Red before green.** Write the failing test, then only enough code to pass it. No speculative
  features for tests you haven't written.
- **Write it from the evidence** — the issue's acceptance criteria, a spec, the bug report — never
  from the code you're about to change.
- **One vertical slice at a time.** One seam, one test, one minimal implementation per cycle.
  Writing every test first and then all the code tests imagined behaviour.
- **Refactoring is not part of the loop.** It belongs to review.
- Paste the red output in the PR: the test name and the assertion line that failed.

## The three anti-patterns

1. **Implementation-coupled** — mocks internal collaborators, tests private functions, or verifies
   through a side channel (an admin read-back instead of the getter the user's request goes
   through). *Tell: it breaks on a refactor that changed no behaviour.*
2. **Tautological** — the expected value is recomputed the way the code computes it:
   `expect(total(items)).toBe(items.reduce((s, i) => s + i.price, 0))`. Use a literal:
   `expect(total([{ price: 10 }, { price: 5 }])).toBe(15)`.
3. **Horizontal slicing** — a block of tests with no implementation between them.

## What may be faked

Only system boundaries: external HTTP, the database client (or a real local database in its
place), time, and a server action when the thing under test is a client component.
**Never** the module, renderer or parser the test exists to prove: then the test checks the fake.

## Expected values come from outside the code

A spec, a hand-worked example (show the working in a comment), a number from the issue. Never a
value computed with the code's own helpers, and never a number pasted from the run you just did:
that makes an edited expectation indistinguishable from a fixed bug.

## The receipt: prove a test can fail

A test written test-first has been seen to fail. One added or changed afterwards has not, so
**break the code it covers on purpose and show the test going red** — test name, the break, the
failure line — in the PR. A test is deleted only if another test goes red for the same break.

**Read the failure line, not the colour.** `ReferenceError`, `is not a function` and a syntax
error mean the build broke, not the behaviour: that's not a receipt. A receipt's failure line is
an assertion.

## Name the behaviour

A test name is a sentence a non-engineer could judge: *"a task due today is not overdue"*. No ticket
numbers in titles (they belong in the commit), never `works correctly` or `handles edge case`.
