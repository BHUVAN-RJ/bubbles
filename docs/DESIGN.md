# Bubbles: Manga design spec

Final direction: **Manga**. Live reference: open `mockup/index.html` in Chrome; it starts on Manga. Values below come from `mockup/app.js` (preset `manga`) and `mockup/styles.css`. Sizes are in points at the 393 x 852 pt iPhone screen used by the emulator.

## Type

- Font: **Bangers** (Google Fonts, SIL Open Font License). Bundle `Bangers-Regular.ttf` in the app and register it under `UIAppFonts`.
- Bubble sentence: Bangers 20 pt, letter spacing 0.035 em (0.7 pt), line height 1.1, colour #111111. Wrap so lines are balanced (equal length), maximum bubble width 236 pt.
- Badge: Bangers 14 pt, letter spacing 0.06 em, uppercase.
- UI chrome (profile chip, scan pill): Bangers is fine for labels; body text in the chip can be the system font at 11 to 13 pt.

## Colour

- Ink: #111111
- Paper: #FFFFFF
- Accent (manga red): #E4002B
- Halftone dots: rgba(0, 0, 0, 0.14), dot radius 1.1 pt, on a 6 pt grid
- UI chip background: rgba(17, 17, 17, 0.78), text #FFFFFF, background blur 14 pt

## Bubble

- Shape: rounded rectangle with elliptical corners, radius 26 pt horizontal by 22 pt vertical.
- Padding: 12 top, 16 sides, 13 bottom.
- Fill: white with the halftone dot pattern on top.
- Border: 3 pt solid ink.
- Shadow: hard offset, 4 pt right and 4 pt down, ink, no blur.
- Tail: 18 pt square rotated 45 degrees, half visible below the bubble, same fill and border on its two outer edges. Its x position follows the person's head, clamped to at least 18 pt from either bubble edge.
- Tilt: each bubble is rotated slightly, by person slot: -3, +2.5, -1.5 degrees, repeating.
- Stem: if the bubble is pushed above its natural spot, a 1.5 pt accent line runs from the tail tip to the head.
- Head dot: 3.5 pt radius accent circle at the head anchor.
- Placement: bubble bottom sits 14 pt above the head anchor. Keep 10 pt from screen edges.

## Badge (% match)

- Sits on the bubble's top edge, 12 pt from the left, overlapping the border. The bubble reserves 12 pt above itself for it.
- Text: "94% MATCH".
- Fill by rarity: Legendary (90 and up) #FFB800 with ink text; Rare (75 to 89) #E4002B with white text; Common (below 75) #111111 with white text. The mockup shows only the red version.
- Border 2.5 pt ink, corner radius 3 pt, hard shadow 3 pt right and 3 pt down, ink.
- Counter rotated against the bubble tilt by twice the tilt (a -3 degree bubble gets a +6 degree badge).

## Motion

1. **Scanning** (first 0.35 s after a face gets a person): the bubble shows three pulsing dots (7 pt circles, 0.9 s cycle, staggered 0.15 s).
2. **Slam in** (sentence lands): from scale 1.35, rotation -3 degrees, opacity 0, to rest in 0.3 s, timing curve cubic-bezier(0.2, 0.9, 0.3, 1.2). Scale origin is the tail.
3. **Badge pop**: 0.12 s after the slam, scale from 0 with a 6 pt upward drift, 0.5 s, cubic-bezier(0.3, 1.8, 0.5, 1).
4. Bubble fade out 0.18 s when the head leaves the frame.
5. Position smoothing: each frame move 45% of the way to the target position.

## Crowded layout

When two bubbles overlap (port of `Renderer.render` in `mockup/app.js`):
1. Sort by head x. For each overlapping pair, slide the left bubble so its right edge is near its own head (head x minus width plus 22 pt), and the right bubble so its left edge is near its head (head x minus 22 pt).
2. Then sort by head y, lowest first. If a bubble still overlaps one below it, push it up so it sits 8 pt above that bubble. The higher head goes on top.
3. Draw the stem for any bubble whose tail is more than 10 pt from its head.

## Screen chrome

- **Profile chip**: top left, 14 pt from the left edge, 60 pt from the top. Pill shape, 34 pt accent avatar circle with initials, name in bold 13 pt, one line role in 11 pt at 80% opacity.
- **Scan pill**: bottom left, 16 pt in, 34 pt up. Pill, 8 pt accent dot pulsing, text "2 in view · 4 nearby".
- **Radar**: bottom right, 16 pt in, 30 pt up, 108 pt circle, chip background, 1.5 pt accent border at 60% opacity. Two inner rings at 18 and 36 pt inset. Sweep: accent conic gradient over 70 degrees, one turn every 2.4 s. Me: 9 pt white dot in the centre. Blips: 8 pt dots at 45% white; a blip turns accent, scales 1.35 and glows when that person has a bubble. Angle comes from the person's x position in the camera (about plus or minus 35 degrees); distance from the RSSI (stronger is closer to the centre). Bluetooth peers out of view show as dim blips around the full circle.

## Card (tap a bubble)

Same manga language as the bubble: white halftone paper, 3 pt ink border, 4 pt hard shadow. Name in Bangers 28 pt, rarity badge, the bubble sentence in Bangers 20 pt, then the rest of their public lines grouped by kind (Who I am, I can help with, I need help with, Looking for, Plans). Two big buttons at the bottom: **WAVE** (accent fill, white Bangers) and **CATCH** (white fill, ink border).
