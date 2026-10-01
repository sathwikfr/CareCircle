# Aaptha: premium redesign plan

Written 2026-10-02 after a full walk-through of the current landing page (working tree, desktop 1440px).
Sources: our own audit plus the design principles in the web_pros slides the user shared
(scroll storytelling, reveal hierarchy, hover/click feedback, "fix the hierarchy", "remove the AI look",
"fix the first 5 seconds", "do the designer pass").

**Goal:** an adult child in Bengaluru, Dubai or New Jersey opens aaptha.in on their phone and within
5 seconds thinks *"this is a serious, calm, expensive-feeling service I can trust with my mother."*
Premium here means **confidence and restraint**, not more effects.

---

## 1. Where we are (audit)

| # | Problem | Evidence |
|---|---|---|
| 1 | **Every section is the same template.** Centered icon pill, then a two-part heading with the second half in teal, then a grey centered subline, then a card. 11 times in a row. This is the "AI look" the slides warn about. | `page.tsx`: every `<h2>` is `WordReveal` + `<span className={s.grad}>` |
| 2 | **Too long.** 11,659px at desktop, about 13 screens. Premium pages say less. | measured in the browser |
| 3 | **The same idea is told 4 times.** Chat bubbles appear in the hero, How it works, Who it's for and Languages. The dashboard gets two separate sections ("ten seconds" + "at a glance"). | sections 1, 3, 5, 6, 7, 8 |
| 4 | **The hero decorates before it explains.** The right side is an abstract WebGL particle wave. It doesn't show the product, and it is the heaviest thing on the page for a mid-range Android phone. | `CallWave.tsx` (WebGL) |
| 5 | **Too much motion, no signature moment.** ScrollProgress, FloatingCta, Ticker, WaveBand, WordReveal on every heading, magnetic button, tilt cards, parallax, draw-line. Everything moves a little, so nothing feels special. | `src/components/motion/*` (10 components) |
| 6 | **Weak type contrast.** Section headings are about 48px with similar weight everywhere. Premium sites use a much bigger jump between display, heading and body. | `--fs-2xl`, `--fs-display` |
| 7 | **Generic AI tells.** A Sparkles icon in the hero pill, icon-in-a-rounded-square on every card, a pill above every heading. | hero, safety cards, FlowTabs |
| 8 | **Docs and code disagree on the palette.** CLAUDE.md says white + royal blue. The (uncommitted) code is ivory paper + peacock teal + marigold. | `globals.css` vs CLAUDE.md §4 |

What's already good and stays: the copy voice ("Speaks the way Amma speaks", "A companion, not a doctor"), honest
"Example" labels, the teal/ivory/marigold palette (warm, Indian, not another blue SaaS), reduced-motion support,
the `motion` library already installed, plain CSS + tokens.

---

## 2. Design direction: "Quiet luxury, Indian warmth"

Think Aesop / Calm / Apple Health editorial, not a dev-tool SaaS template.

**Principles (every change is checked against these):**
1. **Show the outcome, not the technology.** The product is *"Amma took her BP tablet at 8:34, she sounded well"* landing on your phone. Lead with that, not with AI.
2. **One idea per screen.** Each section earns its place by answering one question the buyer has.
3. **Scale contrast is the luxury.** Huge, confident headlines; small, quiet supporting text; lots of space.
4. **Motion is feedback or story, never decoration.** One signature scroll moment, then calm everywhere else.
5. **Fewer containers.** Remove cards, pills and icon squares unless they carry information.
6. **Fast on a ₹12,000 phone on 4G.** Premium that stutters isn't premium.

### 2a. Typography
- **Display: an editorial serif** for H1/H2 (recommend **Instrument Serif** or **Fraunces** via `next/font`). This is the single biggest "premium" lever, and it moves us away from the default geometric-sans SaaS look. Keep **Figtree** for body/UI.
  - Alternative if the user prefers sans: keep Bricolage Grotesque but at much larger sizes with tighter tracking.
- New scale: display `clamp(3rem, 8vw, 7rem)`, section `clamp(2.25rem, 5vw, 4.5rem)`, lead 1.25rem, body 1.0625rem, eyebrow 0.75rem tracked caps (text only, no pill).
- Headlines are allowed to be *one* colour. The teal second-half trick is used at most twice on the page.

### 2b. Colour
- Keep ivory `--paper`, peacock `--teal`, marigold `--marigold`. Add one deeper "ink night" surface for 1–2 dramatic dark sections.
- Marigold becomes rare: only live/positive states (the "call in progress" dot, a ticked medicine). That makes it feel precious.
- Fix CLAUDE.md §4 to match the code once this direction is approved.

### 2c. Layout system
Replace the one centered template with **3 section types**, used deliberately:
- **Editorial split:** left-aligned headline on a 12-col grid, content offset right. The default.
- **Full-bleed stage:** dark surface, one big visual. Used for the signature story and safety.
- **Quiet list:** no cards; hairline dividers, numbered rows (like the slides). Used for safety, FAQ.

Max content width 1200px, generous `--section-y` (raise to `clamp(96px, 14vw, 180px)`).

### 2d. Motion system (from the slides, applied with restraint)
| Slide idea | Where we use it | Where we don't |
|---|---|---|
| **Pin + transform / scrub** | The one signature story (§3, section 3) | Nowhere else |
| **Fade + lift, stagger** | Section entrances, once, 12–16px, 500ms | Not on every word of every heading (drop `WordReveal` except the hero) |
| **Clip reveal** | Hero headline, first load only | — |
| **Parallax** | Max one subtle layer in the story section | Remove elsewhere |
| **Magnetic CTA, tilt cards** | Remove | They read as gimmicks to a 45-year-old buyer |
| **Image zoom / text shift on hover** | Links ("See how it works →" arrow shift + underline) | — |
| **Press + spring, state change** | Every primary button in the app (§5) | — |

One easing (`--ease-out` already exists), three durations (150 / 300 / 600ms). Everything off under
`prefers-reduced-motion`, and the pinned story becomes plain stacked steps.

---

## 3. New landing page structure (13 screens → about 7)

| # | Section | Answers | Replaces |
|---|---|---|---|
| 1 | **Hero** | "What is this and is it for me?" | Hero + pill + WebGL wave |
| 2 | **Language strip** (static, quiet) | "Will it work for my parent?" | Ticker |
| 3 | **Signature: "One call, start to finish"** (pinned, scroll-scrubbed) | "How does it actually work?" | How it works + Three kinds of care + Who it's for |
| 4 | **Hear it** (real call audio, language switch) | "Does it sound human?" | Speaks the way Amma speaks |
| 5 | **What you get** (WhatsApp + dashboard, one section) | "What do I see?" | Ten seconds + Both parents at a glance |
| 6 | **A companion, not a doctor** (dark, quiet numbered list) | "Is it safe?" | Safety cards |
| 7 | **Plans** + short compare line + FAQ | "What does it cost?" | Compare table, Plans, FAQ |
| 8 | **Closing CTA** + footer | "OK, let's start." | — |

### Section details

**1. Hero (the 5-second test).**
- Eyebrow (plain text): `For families caring from a distance`.
- H1 (serif, huge): *"A daily call to Amma. A clear update to you."*, or keep the current line. Copy is decided in Phase 2, tested against: who is it for, what happens, what you get.
- Lead: one sentence. CTA: **Start 7-day free trial** + text link *Hear a sample call →*.
- **Visual: the two phones.** Left, a basic phone ringing ("Saathi · 8:30 AM"). Right, the child's WhatsApp with the call update arriving (medicine ticks, mood, "sounded well"). A thin animated line connects them on load. This *is* the product in one image. Static SVG/HTML, no WebGL.
- Trust line under the CTA: `No app for your parent · 9 Indian languages · Never gives medical advice`.

**3. Signature scroll story (the "wow", from slide 1: pin + transform).**
A pinned stage about 3 screens tall, scrubbed by scroll with `motion`'s `useScroll`. Five beats:
1. *8:30 AM.* Amma's phone rings (any phone, even a landline).
2. *She answers in Telugu.* Transcript lines appear in Telugu with English underneath.
3. *Every medicine, checked.* The list ticks off: Amlodipine ✓, Metformin ✗ "will take after lunch".
4. *Something off? You'll know.* A calm amber flag: "Said she felt dizzy."
5. *Your update lands.* The WhatsApp message slides in on your phone.

Mobile: the same 5 beats as stacked cards, each revealing on scroll (no pinning; pinning is janky on mobile Safari).
Reduced motion: all beats shown statically.

**4. Hear it.** A real recorded Saathi call (with the parent's consent) as an audio player with a waveform
and a live transcript following along, plus language chips. **Needs the user to record real calls**: we never
fake audio (rule 9). Until then, keep the existing text example, labelled "Example".

**5. What you get.** One section: WhatsApp update on the left (the primary channel), and the dashboard on
the right as a lightly tilted browser frame. Three short captions, no cards.

**6. Safety.** Dark band, editorial numbered list (01–04) with hairline dividers, no icon squares. The 112 note
stays visible.

**7. Plans.** Three plans; Family is featured. The compare table becomes 3–4 lines of "Instead of calling every day
yourself…" copy, or moves under a disclosure. FAQ as a quiet accordion.

**Cut:** ScrollProgress, WaveBand, TiltCard, MagneticLink on the landing page, Sparkles icon, FamiliesCarousel,
the `CallWave` WebGL hero. FloatingCta stays on **mobile only**. Components stay in the repo until the
user approves deleting them (rule 4).

**No fake social proof.** No invented testimonials, user counts or ratings. When real families agree, add real
quotes. Until then: a short, signed founder note ("Why we built Aaptha") is honest and builds more trust.

---

## 4. Phases

| Phase | Work | Done when |
|---|---|---|
| **0. Baseline** | Commit or stash the current uncommitted landing WIP. Save desktop + mobile screenshots of every section and a Lighthouse mobile run (LCP, CLS, TBT). | Before/after is comparable |
| **1. Foundation** | Fonts, type scale, spacing, the 3 section layouts, motion tokens. Remove motion clutter. Update CLAUDE.md palette/fonts. | Existing page looks calmer with no content change |
| **2. Hero** | New hero copy + two-phones visual + CTA hierarchy. 5-second test with 3 people who have parents in India. | They can say what it does and who it's for |
| **3. Signature story** | Pinned scroll story (desktop), stacked version (mobile), reduced-motion version. | Smooth at 60fps on a mid-range Android |
| **4. Rest of page** | Sections 4–8 rebuilt/merged per §3; cuts applied. | Page ≈ 7 screens at desktop |
| **5. Micro-interactions** | Press + spring on `.btn`; Send → Sending → Sent ✓ states on signup, login, checkout, test call, WhatsApp opt-in, save buttons. Arrow/underline hover on text links. | Every click gets visible feedback within 100ms |
| **6. Mobile, speed, a11y** | 375px pass on every section; images via `next/image`; no layout shift; contrast AA; focus rings; keyboard nav of the story. | Lighthouse mobile Performance ≥ 90, A11y ≥ 95, LCP < 2.5s |
| **7. Designer pass (loop ×2)** | Open the running site, list the 10 highest-impact problems, fix, re-review. Ask *"what should be removed?"*, not *"what should be added?"* | Two clean passes |
| **8. Carry it through the app** | Same type, spacing and button feedback on login/signup, onboarding wizard, dashboard, billing. | Signing up doesn't feel like a different product |

Phases 1–2 alone will make the biggest visible difference. 3 is the "wow". 5 is what makes it *feel* expensive day to day.

---

## 5. Guardrails
- Plain CSS + tokens only; no Tailwind/shadcn (so no Aceternity / Cult UI / Magic UI / Motion Primitives copy-paste; we borrow ideas, not code).
- No WebGL/3D (Spline, Canvas UI, VGPU): cost on low-end phones, and it doesn't build trust.
- Never fabricate data shown to families: example UI stays labelled "Example"; no fake reviews or counts.
- Everything works in dark mode (`[data-theme='dark']`) and under `prefers-reduced-motion`.
- Landing copy stays honest about limits (not a medical/emergency service, call 112).

## 6. Decisions needed from the user
1. **Display font:** editorial serif (recommended) or bigger Bricolage?
2. **Hero line:** keep "A daily call for your parents. Peace of mind for you." or test new options?
3. **Real call recordings** for "Hear it": can you record 2–3 consented calls (Telugu, Hindi, English)?
4. **Founder note:** willing to put your name/photo on a short "why we built this"?
5. **Compare table:** cut, shorten, or keep?
6. **Current WIP:** is the uncommitted teal/ivory landing work final enough to commit as the baseline?
