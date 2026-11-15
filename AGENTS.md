# Bubbles: start here

You are building the Bubbles iPhone app on a machine with Xcode. The planning machine had no Xcode, so nothing in `ios/` exists yet.

Read these in order before writing code:
1. `docs/PLAN.md`: product, final decisions, architecture, data model, build order, open items.
2. `docs/DESIGN.md`: the Manga visual spec.
3. `mockup/index.html` (open in Chrome): the working visual reference. Bubble placement, collision layout and animations in `mockup/app.js` are the behaviour to port to SwiftUI.

Rules:
- Decisions in `docs/PLAN.md` are final. Do not swap the stack (no PWA, no Unity, no face recognition). Ask the owner before changing hosting, database or framework choices.
- One sentence per bubble, always.
- Keep demo mode working at every step; it is the stage fallback.
- The Claude proxy endpoint is pending from the owner. Stub it until it arrives.
- Commits: no Claude co-author line.
- Update `docs/PLAN.md` when a decision changes, and record shipped work there. Do not record rejected explorations.
