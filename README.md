# SmartDoc — Document Pendency Console

A redesigned prototype of the Smart-Doc-Collector document pendency system. Same product,
same API surface, same flows — rebuilt UI.

```bash
npm install
npm run dev     # http://localhost:3010
```

## The design thesis

**Tartan blue carries identity and action; status keeps its own vocabulary.**

Sampled from `console.tartanhq.com`: brand `#3762dd`, tint `#edf1ff`, ink `#1a202c`,
secondary `#475467`, white surfaces.

Blue is used for identity, every primary action, focus rings and selection. Status
deliberately avoids blue — amber pending, **violet** in progress, green validated, red
rejected — so a status chip can never be mistaken for a control, and a red *Rejected*
never has to shout over brand colour to be seen.

Light theme: this is a daytime back-office tool read on office monitors for hours. The
customer upload portal shares the same tokens at lower density with larger touch targets,
because a borrower meets it once, on a phone.

### Button states

Disabled buttons are **never** faded with `opacity` — white-on-brand at 45% is unreadable.
Disabled swaps to a muted fill with 4.8:1 label contrast. A button that is *busy* keeps its
own colours and just stops accepting input while the spinner runs, so the label stays legible
mid-request.

## What changed from the original

| | Before | Now |
|---|---|---|
| Iconography | Emoji throughout (📊 ➕ ✅ 🔗) | One inline SVG stroke set (`components/Icon.js`), no dependency |
| Colour | Brand blue on every surface, glass effects, gradients | Tartan blue for identity and actions; status in its own non-blue vocabulary |
| Metrics | Five gradient "hero metric" cards | One divided instrument rail |
| Loading | Centre-of-page spinners | Skeletons matching the real layout |
| Empty states | "No cases found" | States that teach the interface and offer the next action |
| Table | Inline-styled, click-only rows | Sticky headers, keyboard-focusable rows, tabular numerals, per-case segmented document bar |
| Modals | Div overlays, no focus handling | Focus-trapped, Esc to close, scroll-locked, labelled |
| Forms | Errors as toasts only | Per-field labels, hints, `aria-invalid`, inline errors |
| Case detail | Two flat lists | Timelines for links and activity, with live/expired state |
| Portal | One long scroll, floating bot bar | Numbered steps, sample-document disclosures, sticky progress footer, redesigned assist panel |
| Responsive | Fixed sidebar | Sidebar collapses to an overlay under 820px; portal is mobile-first |
| Motion | Ad-hoc | 120–260 ms ease-out-quart, state-only, full `prefers-reduced-motion` fallback |

## Assist voice

The upload portal's guide is fully voiced. There is no browser speech synthesis
anywhere in the app — every line is a pre-rendered MP3 under `public/assist/`.

| Language | Voice | Clips |
|---|---|---|
| English | Jessica — Playful, Bright, Warm | 28 (~48s of guide) |
| हिंदी | Sarah — Mature, Reassuring, Confident | 28 (~57s of guide) |

Switching language switches the entire pack: `/assist/en/*` or `/assist/hi/*`.
Greeting included, so the voice never changes mid-guide.

### Casting

Voice ids are pinned in `VOICES` in `src/lib/assist-script.js`. To recast a
language, change its `id` and run `npm run voices -- --force`.

> **Plan note.** ElevenLabs Voice Library voices — Tara, Riya Rao, Sia, Zara —
> return `paid_plan_required` over the API on a free plan, even when they are
> saved in your account. Only ElevenLabs' own *premade* voices are available,
> which is what Jessica and Sarah are. On a paid plan, swap in a library voice
> id (Sia has an Indian accent and would suit the Hindi pack better) and
> re-render. Nothing else changes.

The two originally supplied clips (Tara and Riya, both saying "Hi, I am there to
assist you.") are archived in `voice-source/` and no longer used, since mixing
them with the generated pack would change voice mid-guide.

### How it stays pre-recorded but still names real documents

A guide that says *"you have three documents left: Aadhaar, bank statement,
salary slip"* can't be one recording — the words change per case. So the script
is a **closed set of phrases** in `src/lib/assist-script.js`: nine count lines,
one clip per document type, one per instruction. `buildPlaylist()` assembles
them from the case's actual pending documents.

Real per-applicant narration, zero runtime API calls, no key needed to run or
deploy. The whole pack costs ~2,400 characters to render.

### Regenerating

```bash
cp .env.local.example .env.local     # add an ElevenLabs API key (starts sk_)
npm run voices                       # generate anything missing
npm run voices -- --force            # re-render everything
npm run voices -- --list             # print the script, no API calls
```

Adding a line: add an entry to `CLIPS`, re-run. Nothing else changes.

### Behaviour

- Selecting a language plays that voice's greeting, so it's audible before committing.
- While speaking, the panel shows a progress indicator only — no transcript. It's
  text-to-speech; printing the words being spoken is noise.
- Pause, replay, closing the panel or switching language cancels in-flight audio immediately.
- A missing clip is reported plainly rather than substituted with a robotic voice.

## Accessibility

- Every rendered text node measured against its painted backdrop across all four pages — 345 nodes, zero failures against WCAG AA (4.5:1 body, 3:1 large).
- Visible focus rings on every interactive element; table rows reachable and activatable by keyboard.
- Dialogs trap focus, restore it on close, and are announced via `role="dialog"` + `aria-modal`.
- Toasts live in an `aria-live="polite"` region.
- Status is never colour-only — every pill pairs a hue with an icon and a word.

## Structure

```
src/
├── app/
│   ├── page.js                  Pendency queue (dashboard)
│   ├── cases/new/page.js        Create a case
│   ├── cases/[id]/page.js       Case detail, links, activity
│   ├── upload/[token]/page.js   Customer upload portal
│   ├── globals.css              The design system — tokens, components, responsive
│   └── api/                     REST routes (carried over unchanged)
├── components/
│   ├── AppShell.js              Sidebar + breadcrumb top bar
│   ├── Icon.js                  Inline SVG icon set
│   └── ui.js                    Button, Pill, Modal, Field, Notice, Empty, toasts, formatters
└── lib/
    ├── store.js                 In-memory store with disk persistence
    ├── ocr-validator.js         Simulated OCR type detection
    └── docs.js                  Document catalogue (labels, icons, channels)
```

## Prototype boundaries

Unchanged from the original: the store is a JSON file under `/tmp`, OCR is filename-pattern
simulation, and the DigiLocker / Account Aggregator journeys are mock UIs — the AA step now says so
on screen rather than presenting a bank password field. No auth, no file storage, no real messaging.
