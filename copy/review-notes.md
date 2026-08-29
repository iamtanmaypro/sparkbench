# Register review pass, Devpost description (before lock)

The mandatory register-level pass from copy-guidelines.md, recorded before the
copy is declared locked. Method: every sentence read aloud through a judge's
eyes, hunting supplicant verbs, defensive disclaimers, effort adverbs, dangling
signposts, hype words, grammar wobbles, and any dash that is not a hyphen.
Date of pass: Aug 29, 2026. Adjudications are ranked by how much they changed
the read.

## Adjudications (ranked)

1. CHANGE (applied): Section 5, "the creativity and ambition show in treating
   an agent as..." had a wobbly verb ("show in"). Rewrote to "show up in
   treating an agent as a lab partner with its own identity rather than a macro
   recorder." Grammar now holds under the keyword load.
2. CHANGE (applied): Section 4, "any interactive simulator, chemistry, logic,
   orbital mechanics, can copy it" was a comma-chopped appositive list that
   read like a fragment. Rewrote to "any interactive simulator, from chemistry
   to orbital mechanics, can copy it."
3. CHANGE (applied): Section 1, "explains a circuit to me in perfect prose":
   "perfect" is an effort/hype adjective doing no work. Changed to "fluent
   prose", which states the fact without rating it.
4. KEEP: "boring stack on purpose" (Section 5). Deliberate register, it
   projects confidence without hype and matches the repo's actual design
   philosophy.
5. KEEP: "the other side of an unreadable glass" (Section 1). One metaphor per
   section budget; it earns its place because the whole section is about the
   see-but-not-touch gap.
6. KEEP: "a visible lab partner instead of a ghost" (Section 3). Same budget,
   different section, and it is the product claim in one line.
7. KEEP: Section 5 title uses "we" ("How we built it, and the thoughtful use of
   WebMCP") while the body stays first person. The title follows the Devpost
   section convention and PLAN.md's own structure; the body keeps Tanmay's
   voice. Not a register slip.
8. KEEP: "deliberately no toolautosubmit", "truncate honestly", "boring stack":
   checked individually for effort-adverb smell. Each is a design decision or a
   behavior claim, not effort padding ("we worked hard to..." is the pattern
   that fails; none of these are that).
9. KEEP: No dangling signposts found: no "First," without a "Second," anywhere.
10. KEEP: Supplicant register absent: zero instances of "we hope", "we tried",
    "we believe", "hopefully". The copy states what was built and what works.

## Post-fix verification

- Em dash and en dash grep over this file and devpost-description.md: 0 hits.
  Command: `sh copy/check-dashes.sh` (byte-level matcher, works with macOS
  grep; exits 1 and lists lines when a dash is found).
- Hype words swept: "revolutionary", "game-changing", "cutting-edge",
  "seamless", "powerful": 0 hits.
- Supplicant sweep: "hope", "tried our best", "believe": 0 hits.

## Keyword checklist (both judging vocabularies, verbatim placement)

| Keyword (verbatim) | Section where it appears | Status |
|---|---|---|
| callable | 3 ("the callable web") | present |
| structured tools instead of screen automation | 3 | present |
| human in the loop | 3 | present |
| agent experience | 3 ("The whole agent experience") | present |
| reliability and precision | 3 | present |
| usefulness | 5 | present |
| originality | 5 | present |
| execution | 5 | present |
| thoughtful use of WebMCP | 5 (heading and body) | present |
| quality of the human-agent experience | 5 | present |
| WebMCP leverage | 5 | present |
| potential impact | 4 | present |
| creativity and ambition | 5 | present |

## Structure check (PLAN.md section order, 1 to 7)

1. Inspiration (explain vs show gap + Tanmay's own student-with-AI line): present
2. What it does (one paragraph + three-role story): present
3. Why this use case fits WebMCP: present
4. What people and agents accomplish together that wasn't feasible before: present
5. How we built it / thoughtful use of WebMCP: present
6. Challenges / What's next: present
7. How to test it (both runtimes + 3 prompts): present

## Lock status

Copy is LOCKED as of this pass. If the Gate 2 tool-description iteration round
changes any claim here (for example a probe prompt), update section 7 and the
prompt list, then rerun this review on the changed lines only.
