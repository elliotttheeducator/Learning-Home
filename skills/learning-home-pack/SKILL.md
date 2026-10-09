---
name: learning-home-pack
description: Label and package classroom resources for Elliott's Learning Home site so the planner's Import pack puts each file in the right lesson. Use whenever Elliott asks for any resource for his Woodcroft classes (slides or deck, student page, practice app, simulation, worksheet, booklet, answer key, printout), mentions Learning Home, the planner or a lesson date, or asks to "pack", "ship", "export" or "get it ready for the site". Use alongside any other skill that builds the resource itself.
---

# Learning Home pack

Elliott's class website (Learning Home) has an **Import pack** button in the teacher planner.
He drops in a zip or loose files and each one goes to its lesson, tagged for students, teacher
only or printing. Your job is to make every file land in the right place with no fixing.

## 1. Label every file

Every HTML page gets this tag inside `<head>`:

```html
<meta name="learning-home" content="class=y7-enrichment; lesson=2026-10-20; for=students; type=app; title=Angle hunt">
```

- **class**: one of the ids below.
- **lesson**: the lesson date, `YYYY-MM-DD`. "week 3 lesson 2" (nth lesson of that class in
  that term week) also works. Leave it out if the file is not for one lesson (it goes to the
  class's Files list).
- **for**: `students` (students open it from their calendar once Elliott publishes the lesson),
  `teacher` (slides, answer keys, teacher versions, never shown to students) or `print`
  (worksheets and handouts, opens ready to print).
- **type**: `deck`, `app`, `sim`, `booklet`, `sheet`, `key` or `link`.
- **title**: what it is called in the planner. Keep it short and plain.

The main file for a lesson (usually the slides) should also carry the lesson plan in its label, so
the plan arrives even without a json file:

```html
<meta name="learning-home" content="class=y10-science; lesson=2026-10-15; for=teacher; type=deck; title=Punnett squares slides; topic=Punnett squares; objectives=Use a Punnett square to predict offspring | Work out the probability of a recessive disease; covers=2,4">
```

Separate list items with `|` (and `covers` numbers with commas). Put a `learning-home.json` in
the zip as well whenever there is more to say (bring, notes, prep, copies to print).

If you don't know the class or lesson, ask Elliott once rather than guessing.

## 2. Package, with the lesson plan baked in

- **One HTML file only, nothing else to say about the lesson**: label it and hand it over.
- **Anything more** (a whole lesson, several files, any PDF, Word or image file): put them all in
  one zip with a `learning-home.json` at the top level. Fill in the lesson plan whenever you made
  the lesson: the planner shows it to Elliott and fills in the lesson for him.

```json
{
  "class": "y7-enrichment",
  "lesson": "2026-10-20",
  "topic": "Angles on a straight line",
  "unit": "Topic 9: Geometry",
  "objectives": ["Name angle pairs", "Find missing angles on a straight line"],
  "bring": ["Booklet 1", "Protractor"],
  "studentNote": "Start on page 4 if you finish early.",
  "assess": "",
  "notes": "Timings: 10 min warm up, 25 min walkthrough, 30 min practice, 10 min exit ticket. Watch for students adding to 360 instead of 180.",
  "prep": ["Set up the mini whiteboards"],
  "covers": [3, 4],
  "files": [
    { "file": "angle-hunt.html", "for": "students", "type": "app", "title": "Angle hunt" },
    { "file": "angles-deck.html", "for": "teacher", "type": "deck", "title": "Angles slides" },
    { "file": "angles-worksheet.pdf", "for": "print", "type": "sheet", "title": "Angles worksheet", "copies": 28, "paper": "A4 double-sided" },
    { "file": "angles-answers.pdf", "for": "teacher", "type": "key", "title": "Angles answers" }
  ]
}
```

- `class` and `lesson` at the top apply to every file unless a file gives its own.
- Lesson plan fields (all optional): `topic`, `unit`, `objectives` (students see these as
  "We will"), `bring`, `studentNote`, `assess` (for example "Quiz" or "Investigation due"), and the
  teacher-only `notes` and `prep` (a checklist). Students see topic, objectives, bring, note and
  assessment once Elliott publishes; notes and prep never reach them.
- **Unit objectives**: some classes have a numbered unit objectives list (see "Unit objectives"
  below, or the list Elliott pastes). Always add `"covers": [3, 4]` with the numbers of the
  objectives the lesson teaches, set `unit` to the unit's name, and write the lesson's own
  `objectives` so they build towards those unit objectives. Students then jump from each unit
  objective on their Learning objectives page to this lesson. If Elliott's planner "Copy
  instructions for other chats" text has a newer list, that one wins.
- **Printing**: every file with `"for": "print"` is added to the lesson's prep list automatically.
  Give `copies` (class size if you don't know: about 28) and `paper` (A4 or A3, single or
  double-sided, colour if it matters). Anything else to print or set up goes in `prep`.
- **Several lessons in one zip**: add `"lessons": [ { "lesson": "2026-10-22", "topic": "...",
  "objectives": [...] }, ... ]` and give each file its own `"lesson"`. Name the zip
after the lesson, for example `y7-enrichment-2026-10-20.zip`, and give Elliott the download.
Tell him: "In the planner, press Import pack and drop this in."

## 3. Make each file work on the site

- Each page must work on its own, opened straight from its link. Pictures, CSS and JS placed in
  the same zip and linked with relative paths (`img/dog.png`) are folded into the page on import;
  anything else must be inline. No links back to claude.ai.
- No artifact runtime features: no `window.claude`, no `window.storage`, no artifact
  capabilities (`db`, `downloads`). Save anything (ink, progress, answers) to `localStorage`, and
  never write to it before reading what is already stored.
- Include a `<title>`.
- **New versions**: keep exactly the same title (and class). The import then replaces the old file
  at the same link instead of adding a copy, so Elliott's links keep working.
- Never set anything to published. Elliott publishes lessons himself.

## Deck Kit 2 decks

New decks use Deck Kit 2: one lesson file that is the teacher deck and the student page.
- Link the engine, do not inline it: `<link rel="stylesheet" href="/kit/v2/kit.css">` in the head and
  `<script src="/kit/v2/kit.js"></script>` at the end of the body. The import leaves these links alone.
- Tag the deck `for=students; type=deck`. Signed-in Elliott gets the deck, students get their page.
  One file only: no separate student sheet for the same activities.
- `<body data-theme="biology" data-deck="unique-id" data-class="y10-science">`, frames as
  `<section class="frame" data-kind="slide|scroll|map" data-mode="..." data-id="...">`.
- The full list of frames and blocks is at `/kit/v2/README.md` on the site.
- For a claude.ai preview, also give a standalone copy (engine folded in); never upload that copy.

## 4. Elliott's rules for every resource

- Never use em-dashes, anywhere (copy, comments, file names). Australian spelling.
- Student-facing text readable from the back of a long room: slide body about 30px, tables about
  26px, equations about 33px at 1440 wide.
- Colourful, bright and legible, not dark or industrial.
- Equations in LaTeX, Cambria Math, large and centred. Every division is a stacked fraction.
- Decks: stylus ink, eraser and save; a clock; timers on activity slides; unmistakable when
  students should start writing; empty room to write. Never fill in worked solutions.
- Walkthroughs reveal one step at a time behind a button.
- Apps are fun and game-like and work with typed input. Bronze / Silver / Gold extension tiers.
- Lessons are 80 usable minutes; plan well under.
- Nothing identifying a student, and no textbook pages or scanned faculty booklets in anything
  tagged `students` (those files are public to anyone with the link).

## Classes (Term 4 2026)

Term 4 starts Monday 12 October 2026 and runs 8 weeks. Each class has at most one lesson a day,
so a date is enough.

| id | Class | Lessons each week |
|---|---|---|
| `y7-science` | Year 7 Science | Wed P1-2, Fri P6-7 |
| `y7-enrichment` | Year 7 Enrichment Maths | Tue P6-7, Thu P3, Fri P1-2 |
| `y9-maths` | Year 9 Maths | Tue P4-5, Wed P4-5, Fri P3 |
| `y10-science` | Year 10 Science | Mon P1-2, Tue P2, Thu P6-7 |
| `y10-ess-maths` | Year 10 Essential Maths | Mon P6-7, Tue P3, Thu P1-2 |

Double periods (for example P6-7) are about 80 minutes; single periods about 45.

## Unit objectives

Numbers to use in `covers`. Use the unit name exactly as written for `unit`.

### y10-science: Biology (Genetics & Evolution)

1. Be able to define the following terms: gene, allele, dominant, recessive, genotype, phenotype, homozygous, heterozygous.
2. Be able to use a Punnett square to determine the genotype and phenotype of traits.
3. Understand that an individual can be a carrier of a recessive disease, and that a sufferer must be homozygous recessive for it.
4. Be able to complete a Punnett square to predict the probability of a recessive disease.
5. Know that a mutation is a permanent change to a DNA sequence, and that it can change the proteins produced by transcription and translation.
6. Know that a mutation can change an organism's genotype, and therefore its phenotype.
7. Recognise that pedigree charts are used to trace a family history of showing or carrying certain traits, and to work out how likely offspring are to show or carry them.
8. Be able to interpret pedigree charts for autosomal dominant and autosomal recessive traits.
9. Be able to identify carriers in a pedigree chart.
10. Understand the difference between a genetic and an acquired trait.
11. Be able to explain how a new variant of a genetic trait can arise in a population.
12. Define evolution and explain why variation is needed for evolution to occur.
13. Define natural selection and give examples of selection pressures and how they may affect a population.
14. Be able to explain how species evolve adaptations through natural selection.
15. Be able to tell the difference between behavioural, physiological and structural adaptations.
16. Be able to describe the main types of evidence that support the theory of evolution.
17. Define species and be able to summarise the process of speciation.

## Checklist before handing over

1. Every HTML file has the `learning-home` meta tag (or is listed in `learning-home.json`), and
   the lesson plan (topic, objectives, notes, prep) is in `learning-home.json` if you made the lesson.
2. `covers` lists the unit objective numbers the lesson teaches (when the class has a unit list).
3. Class id, date and `for` are right; answer keys and slides are `teacher`, handouts `print`
   with copies and paper.
4. No em-dashes, no `window.claude`, no `window.storage`.
5. One zip (or one HTML file), with a one-line note telling Elliott to use Import pack.
