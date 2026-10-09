# Woodcroft Deck Kit 2

One lesson file that is both the teacher deck and the student page.
Frames can be 16:9 slides, scrolling pages or zoomable maps, mixed in any order,
in any of seven themes. Live blocks (activities, polls, the class wall, prac data,
nominate) connect the class through the Learning Home live room.

Files here: `kit.js` and `kit.css` (built, do not edit), `src/` (edit these),
`make.py` (build), `gallery.html` (a lesson showing every block), `remote.html`
(phone remote), `sample-clip.webm` (used by the gallery).

## Build
- Edit `src/`, then run `python3 make.py`. It refuses to build if an em dash slips in.
- `python3 make.py inline lesson.html out.html` writes a standalone copy with the
  engine folded in (for claude.ai previews, OneNote, a USB stick). Decks on the site
  should link `/kit/v2/kit.css` and `/kit/v2/kit.js` instead, so a fix here reaches
  every deck at once.

## A lesson file
```html
<!doctype html><html lang="en-AU"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Mutations</title>
<meta name="learning-home" content="class=y10-science; lesson=2026-10-15; for=students; type=deck; title=Mutations">
<link rel="stylesheet" href="/kit/v2/kit.css">
</head>
<body data-theme="biology" data-deck="y10-mutations" data-class="y10-science" data-mins="80">
<main id="deck"> ...frames... </main>
<script src="/kit/v2/kit.js"></script>
</body></html>
```
- `data-theme`: kit, professional, biology, maths, chemistry, physics, year7.
- `data-deck`: unique per deck (keeps ink and answers separate).
- `data-class`: the Learning Home class id. Live only works with it.
- Tag the file `for=students`. Signed-in teacher gets the deck, everyone else the
  student page. A file tagged `teacher` can never be opened by students.
- Teacher notes and answers are in the page source. Students see neither on screen
  and the live room strips notes before they reach students, but do not put anything
  private in a deck.

## Frames
`<section class="frame" data-kind="slide" data-mode="youdo" data-id="practice" data-t="Practice" data-mins="10" data-timer="600">`
- `data-kind`: `slide` (1600 x 900), `scroll` (1600 wide, any height), `map` (`data-w`, `data-h`).
- `data-mode`: listen, notes, ido, wedo, youdo, check. Sets the stripe and the chip.
  `data-say` changes the chip's words ("Answer on your laptop").
- `data-id`: always give one. Ink is stored against it.
- `data-t` frame list title, `data-part` groups the list, `data-mins` planned minutes,
  `data-timer` countdown seconds, `data-theme` this frame only,
  `data-student="notes"` copies the frame onto the student page.
- `<aside class="script">` teacher notes: shown in the frame list (L) and on the phone remote.

Slide layout: `<header class="head"><h2>Title</h2></header>` then
`<div class="body c46">` with `.pane` columns. Layouts: `cols`, `c46`, `c37`, `c64`, `c3`, `centre`.
Title frame: `<div class="title-frame"><h1>..</h1><p>..</p><button class="k2start">Start lesson</button></div>`.
Scroll frame: `.head` then `<div class="col">` holding `.sec` blocks (`.sec` can carry its own `data-mode`, its `h3` gets a chip).
Map frame: `<h2 class="maptitle">`, nodes `<div class="node" data-id="dna" style="left:..px;top:..px;width:..px">`,
links on the frame: `data-links="dna>genes, genes>punnett"`. Tapping a node flies into it.

## Blocks
- Equations: `<span class="tex big" data-tex="\dfrac{F}{m}" data-tex-display></span>`. Division is always `\dfrac`.
- Walkthrough: `.walk > .walkq + .walkrow(.wleft(button.stepbtn[data-steps=ID] + ol.wsteps#ID > li) + .work)`. Key S.
- Working space: `<div class="work" data-label="Working"></div>` (`.lined` for lines). Never fill in working.
- Gaps: `<button class="gap">word</button>`, and `button.gapall`. Key G. Students get a word bank of the
  missing words (scrambled) to click into the gaps; when you fill the gaps, their answers get a tick or a cross.
- Answers: `.pa` spans show with `button.ansall` or key A.
- Tiers: `.tiers > .tier.bronze|.silver|.gold`. Tables: `table.t`. Points: `ul.pts`. Cards: `.card`.
- Pieces: `data-piece="Label"` on any element lets it be summoned into the workspace.
- Image: `<figure class="img"><div class="imwrap"><img src="..."> <button class="hot" style="left:30%;top:40%">1<span>Label</span></button></div><figcaption>Source, author, licence</figcaption></figure>`.
- Video: `<div class="vid" data-src="clip.webm"><p class="pause" data-t="1:20">Question</p></div>`. Stops at each pause point.
  Host clips on Learning Home (uploads to 20 MB).
- YouTube (not blocked at school): `<div class="yt" data-yt="https://youtu.be/ID" data-start="1:20" data-end="3:05"></div>`.
  Any YouTube link or the 11 character id works; start and end are optional. Each student plays their own copy.

## Activities (on the board and on every student's page)
```html
<div class="activity" data-id="punnett" data-title="Punnett practice">
  <div class="q" data-tier="bronze" data-answer="Aa|aA">Text answer, alternatives split by |</div>
  <div class="q" data-tier="bronze" data-choices="Dominant|Recessive" data-answer="Dominant">Multiple choice</div>
  <div class="q" data-tier="silver" data-num="0.75" data-tol="0.001" data-show="3/4" data-hint="Draw the square first.">Number (fractions accepted)</div>
  <div class="q" data-tier="gold">No answer attribute: an open answer the student saves</div>
</div>
```
Students get Check, a hint after a wrong answer, "Show me the answer" after three tries,
and Bronze, Silver, Gold progress. When live, the board shows how many have finished each tier.

## Live blocks
- Poll: `<div class="live-poll" data-id="lever" data-choices="A|B|C" data-answer="C">Question</div>`. Results stay hidden until you press Show results.
- Wall: `<div class="live-wall" data-id="moths">Question</div>`. Names hidden by default, tap a card to spotlight it.
- Prac data: `<div class="live-prac" data-id="chute" data-cols="Area (cm²)|Trial 1 (s)|Trial 2 (s)|Trial 3 (s)" data-x="0" data-y="1-3" data-ylabel="Mean fall time (s)">Instructions</div>`. Table, means, outliers flagged, graph with a trend line.
- Activities and live blocks open for students on their own when you reach their frame.

## Live room
Go live from the live button. On Learning Home the deck, student pages and the phone
remote (`/kit/v2/remote.html?room=<class-id>`) meet in a Durable Object at `/live/<class-id>`
(`src/live.js`). Teacher by sign-in cookie, students by class code from `lh-classes`.
Student messages only reach the teacher. Off the site (claude.ai, a file) it falls back to a
BroadcastChannel, which only reaches tabs in the same browser: good for testing.

## Teaching controls
Only the pen draws. Finger and mouse pan and zoom (pinch, Ctrl and wheel, double tap or 0 to fit).
D lets finger and mouse draw until the next frame. W cycles frame, split screen, workspace.
Keys: arrows / Page Up / Page Down / space move (scroll pages scroll first), P pen, H highlighter,
E eraser, Ctrl+Z / Ctrl+Y, S step, A answers, G gaps, T timer, N nominate, B blank screen,
C calculator, R protractor, L frame list, F full screen, U hide controls.

## Saving
Ink, workspace boards, text edits, the lesson clock and live results save to localStorage under
`kit2:<data-deck>`, with the Kit 1 guards: nothing written before the stored copy is read, an empty
deck never overwrites a stored one unless Clear was pressed, a rolling `-prev` copy and Recover.
Menu: Download with my ink (a standalone copy), Save or Load a backup file.
Students' answers save under `kit2s:<data-deck>`, their name under `kit2-name`.
