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

If you don't know the class or lesson, ask Elliott once rather than guessing.

## 2. Package

- **One HTML file only**: label it and hand it over as the single file.
- **Several files, or any PDF, Word or image file**: put them all in one zip with a
  `learning-home.json` at the top level:

```json
{
  "class": "y7-enrichment",
  "lesson": "2026-10-20",
  "files": [
    { "file": "angle-hunt.html", "for": "students", "type": "app", "title": "Angle hunt" },
    { "file": "angles-deck.html", "for": "teacher", "type": "deck", "title": "Angles slides" },
    { "file": "angles-worksheet.pdf", "for": "print", "type": "sheet", "title": "Angles worksheet" },
    { "file": "angles-answers.pdf", "for": "teacher", "type": "key", "title": "Angles answers" }
  ]
}
```

`class` and `lesson` at the top apply to every file unless a file gives its own. Name the zip
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

## Checklist before handing over

1. Every HTML file has the `learning-home` meta tag (or is listed in `learning-home.json`).
2. Class id, date and `for` are right; answer keys and slides are `teacher`, handouts `print`.
3. No em-dashes, no `window.claude`, no `window.storage`.
4. One zip (or one HTML file), with a one-line note telling Elliott to use Import pack.
