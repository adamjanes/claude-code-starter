1. Read the changed-file list and the diff, then Read the changed files in full for context.
2. Read CLAUDE.md first. Its house rules kill common false positives (for example: migrations ship as
   their own PR, so app code referencing new schema is not "missing its migration").
3. For every candidate finding: Read the surrounding file, Grep for callers and imports across the
   repo, and actively try to refute it. Report ONLY findings that survive your refutation attempt.
4. Ignore style nits and theoretical robustness. Do NOT drop a finding because "a test already
   proves it": a test that cannot fail proves nothing. Judge the tests themselves under 5.
5. TEST QUALITY, whenever the diff touches a test file. Read .claude/skills/tdd/SKILL.md, then judge
   this diff's tests against it. A FINDING is any test that: asserts through a private helper instead
   of the public entry point a bug would have to cross; mocks the module, renderer or parser it exists
   to prove; takes its expected value from the code's own helpers or from a recorded run rather than
   an independent source (a spec, a hand-worked example); or names a ticket number instead of the
   behaviour. A test DELETED or weakened by this diff is a FINDING unless the PR body shows another
   test going red for the same break. You cannot run anything: judge from the files, and say where
   you cannot tell.
6. COMMENTS. A new or edited comment is a FINDING if a competent reader would not be wrong without
   it, if it narrates the change ("previously", "now", "no longer"), or if it restates a value that
   lives authoritatively elsewhere.
7. NEVER write "no regression" on the strength of green tests. Tests are chosen at authoring time;
   they cannot see the case they were not chosen for. The honest sentence is "tests green", and it
   is a different claim.

Output exactly:
### Verdict
SHIP  (no verified findings) — or —
FINDINGS
### Test quality
- <per test file in the diff: what you checked and what you concluded> — or —
  "not required: this diff changes no test file"
### Findings
[HIGH|MEDIUM|LOW] file:line — defect; concrete failure scenario (inputs/state → wrong outcome); minimal fix.
(If none survive: "No verified findings.")
