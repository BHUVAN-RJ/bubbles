# Bubbles: build plan

Status: decisions final as of 2026-11-14. Hackathon deadline 2026-11-15, 11:00. Built as a native iPhone app on a separate machine with Xcode (the planning Mac has no Xcode).

## The product in one paragraph

You hold up your iPhone and scan the room, Pokemon Go style. Every person nearby who runs Bubbles gets a manga speech bubble over their head with one sentence: the line from their profile that matters most to you. If you are a grad student and they are a freshman, the bubble says "How would I add a Redis cache to my project?". If you want to get into aerospace and they are a researcher, it says "I'm an aerospace researcher working on satellite autonomy.". A person walking by gives you 2 to 3 seconds to read, so the bubble must appear fast and say exactly one sentence. Phones find each other over Bluetooth, not face recognition. The phone is the first device; AR glasses come later and are out of scope.

## Hard rules

1. One sentence per bubble. No second line, no list. A small badge (% match) is allowed.
2. Bubble visible within 1 second of a face entering the frame. Matching runs before the person is in view (see Latency).
3. Identity comes from Bluetooth tokens only. No face recognition, no face storage. Faces are detected only to know where heads are.
4. Visual style is Manga. Spec in [DESIGN.md](DESIGN.md). Reference implementation in `mockup/` (open `mockup/index.html` in Chrome, Manga is the default preset).
5. iOS 26 only. Swift, SwiftUI, ARKit, Vision, CoreBluetooth.
6. Demo mode must exist so the stage demo cannot fail.

## Decisions

| Area | Decision |
|---|---|
| Platform | Native iPhone app, iOS 26 minimum, Swift + SwiftUI. Not a PWA (iOS Safari has no Web Bluetooth). |
| Camera | ARKit `ARWorldTrackingConfiguration`, rear camera. Heads found with Vision on each `ARFrame`. |
| Identity | CoreBluetooth. Each app advertises a service and serves a rotating token. Works with the other phone in background. |
| Head to person | RSSI ranking: strongest Bluetooth signal goes to the largest face. |
| Backend | Supabase: Postgres, Realtime, Edge Functions. |
| Matching AI | Claude Haiku through the team's own proxy on a Mac mini (details pending, see Open items). Called from a Supabase Edge Function. |
| Onboarding | Name, then a spoken AI interview, then review and approve lines. |
| Profile lines | Five kinds: ask, offer, identity, looking_for, plan (plan comes from calendar). |
| Calendar | Read with EventKit, Claude (through the proxy) suggests "plan" lines, user approves each. No on-device models (too slow). |
| Tap a bubble | Opens their card, with Wave and Catch buttons. |
| Waves | Supabase Realtime, in app only. No push (free Apple account cannot use APNs). |
| Game layer | Manga % match badge, rarity tiers, Caught collection. No XP or levels. |
| Distribution | Free Apple account, Xcode sideload by cable. Apps expire after 7 days, max 3 apps per device. |

## Architecture

```
 iPhone A (scanning)                          iPhone B (in pocket, app backgrounded)
 ARKit camera + Vision heads                  CBPeripheralManager advertises SERVICE_UUID
 CBCentralManager scans SERVICE_UUID  ──BLE──> GATT read: TOKEN characteristic (16 bytes)
        │ token + RSSI
        ▼
 Supabase Edge Function `match`  ──> profiles, ble_tokens, matches tables
        │ (cache miss) ──> Mac mini Claude proxy ──> sentence, kind, score
        ▼
 Bubble { sentence, score, rarity } pinned to the face ranked by RSSI
```

### Bluetooth

- Service UUID: `67B45D74-F99F-4401-AF1A-6794602F3D08`
- Token characteristic UUID: `DB0A724D-9CD5-4E63-8212-F493554F8923` (read only)
- Peripheral side: `CBPeripheralManager` advertises `[SERVICE_UUID]`. Characteristic value is the current token. Token is 16 random bytes, registered in `ble_tokens` with a 1 hour expiry, rotated every 30 minutes.
- Central side: `CBCentralManager.scanForPeripherals(withServices: [SERVICE_UUID], options: [CBCentralManagerScanOptionAllowDuplicatesKey: true])` while the scan screen is open. Scanning must filter by the service UUID, because a backgrounded iOS peripheral moves its UUID into the overflow area, which only filtered scans can see.
- On a new peripheral: connect, read token, disconnect. Cache `peripheral.identifier -> token`. Keep scanning to update RSSI (smooth with an exponential moving average, alpha 0.3).
- Info.plist: `UIBackgroundModes` = `bluetooth-central`, `bluetooth-peripheral`. `NSBluetoothAlwaysUsageDescription`, `NSCameraUsageDescription`, `NSMicrophoneUsageDescription`, `NSSpeechRecognitionUsageDescription`, `NSCalendarsFullAccessUsageDescription`.
- Only consider peers with smoothed RSSI above -85 dBm.

### Camera and head tracking

- `ARSession` with `ARWorldTrackingConfiguration`. Display with `ARSCNView` or `ARView`, overlay SwiftUI on top.
- Every second frame (about 15 Hz) run `VNDetectFaceRectanglesRequest` and `VNDetectHumanRectanglesRequest(upperBodyOnly: true)` on `frame.capturedImage`, orientation `.right` for portrait.
- Anchor point: top center of the face box, raised by a quarter of the face height. When only a body box exists, use its top center.
- Track IDs across frames with nearest neighbour matching (max jump 9% of frame width, drop after 8 missed frames) and a 5 frame moving average. Port the logic from `tools/tracks.py`, which did this offline for the mockup clip.
- Convert normalized Vision coordinates to view coordinates with `frame.displayTransform(for:viewportSize:)`.

### Assigning people to heads

1. Sort visible head tracks by face size, largest first.
2. Sort Bluetooth peers that have a match result by smoothed RSSI, strongest first.
3. Pair them in order. Once a track has a peer, keep it until the track dies (sticky), so bubbles do not swap between people.
4. Extra heads with no peer get no bubble. Extra peers with no head show only as radar blips.

### Latency

The 1 second budget works because matching happens when Bluetooth first hears someone, typically 10+ meters away and several seconds before they are in the camera. The `match` result is cached in `matches` per (viewer, target, profile versions). Once in view, the bubble only needs local data. Show the scanning dots for 0.35 s on first appearance, then the sentence.

### Matching

Edge Function `match(viewer_id, token)`:
1. Resolve token to `target_id` via `ble_tokens`.
2. Return cached row from `matches` if both profile versions are unchanged.
3. Otherwise call Claude Haiku through the proxy with both profiles' public lines. Prompt: pick the single line of the target most useful to the viewer; may tighten wording to at most 60 characters; keep first person; return JSON `{ "sentence": string, "kind": "ask|offer|identity|looking_for|plan", "score": 0-100 }`.
4. Store and return `{ target_id, name, sentence, kind, score, rarity }`.

Rarity from score: 90 and up is Legendary, 75 to 89 is Rare, below 75 is Common.

### Data model (Supabase)

```sql
create table profiles (
  id uuid primary key default gen_random_uuid(),
  device_id text unique not null,
  name text not null,
  avatar_url text,
  version int not null default 1,
  updated_at timestamptz default now()
);
create table profile_lines (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles on delete cascade,
  kind text check (kind in ('ask','offer','identity','looking_for','plan')),
  text text not null,
  source text check (source in ('interview','calendar','manual')),
  expires_at timestamptz,          -- calendar lines expire after the event
  is_public boolean default true
);
create table ble_tokens (
  token text primary key,          -- hex of the 16 byte token
  profile_id uuid references profiles on delete cascade,
  expires_at timestamptz not null
);
create table matches (
  viewer_id uuid, target_id uuid,
  viewer_version int, target_version int,
  sentence text, kind text, score int,
  created_at timestamptz default now(),
  primary key (viewer_id, target_id)
);
create table waves (
  id uuid primary key default gen_random_uuid(),
  from_id uuid, to_id uuid, sentence text,
  created_at timestamptz default now(), seen_at timestamptz
);
create table catches (
  owner_id uuid, target_id uuid, sentence text, score int, rarity text,
  created_at timestamptz default now(),
  primary key (owner_id, target_id)
);
```

Identity is the device ID (`identifierForVendor`), no login. Row level security can stay permissive for the hackathon; tighten later.

### Onboarding: voice interview

1. Type your name.
2. Interview of 4 to 6 questions. The AI speaks each question with `AVSpeechSynthesizer`; the user answers by voice, transcribed on device with iOS 26 `SpeechAnalyzer` / `SpeechTranscriber`. Edge Function `interview` sends the transcript so far to Claude, which returns either the next question or `done` plus draft lines tagged by kind.
3. Review screen: each draft line is editable and removable. Save writes `profiles` and `profile_lines`.
4. Calendar step (optional): EventKit full access, next 7 days. The app sends event titles and times to Edge Function `calendar_lines`, which asks Claude to turn them into short plan lines like "Playing tennis Saturday morning". Event data is not stored. The user ticks which lines go public; only approved lines are saved. Do not use Apple on-device models (Foundation Models) anywhere; they are too slow.

### Screens

1. **Onboarding**: name, voice interview, review lines, calendar suggestions.
2. **Scan** (home): camera, Manga bubbles, my profile chip (top left), scan pill (bottom left, "2 in view, 4 nearby"), radar (bottom right; blips from Bluetooth, lit when that person has a bubble).
3. **Card**: tap a bubble. Full manga profile card with all their public lines, the % match badge, rarity, and Wave and Catch buttons.
4. **Caught**: Pokedex style grid of people you caught, with the sentence and rarity at catch time.
5. **Wave toast**: Realtime insert on `waves` for me shows "[Name] waved: [sentence]".
6. **Demo mode**: hidden toggle, long press the profile chip for 2 seconds.

### Demo mode

Seeded profiles assigned to faces left to right, no Bluetooth or network needed:
1. "I'm an aerospace researcher working on satellite autonomy." 94%, Legendary
2. "How would I add a Redis cache to my project?" 81%, Rare
3. "Need a teammate who knows ARKit, demo is tomorrow." 67%, Common

## Build order

Each step ends in something demoable. Stop and polish if time runs short.

1. Xcode project `Bubbles`, iOS 26, SwiftUI. Bundle the Bangers font. Scan screen: ARKit camera, Vision heads, Manga bubbles with demo mode data. This alone is the demo floor.
2. Radar, profile chip, scan pill, collision layout, entrance animations, matching the mockup.
3. Supabase project, tables above, `match` Edge Function with a stub answer, then the real Claude call through the proxy.
4. Bluetooth: peripheral advertising plus token, central scanning plus RSSI, RSSI to head assignment.
5. Onboarding: name and review screen first (typed lines), then the voice interview on top.
6. Card, Wave over Realtime, Caught collection.
7. Calendar plan lines.

## Repo layout

```
docs/       PLAN.md (this file), DESIGN.md (Manga spec)
mockup/     browser emulator, the visual reference; open index.html
tools/      offline head tracking used for the mockup clip (Swift + Python)
ios/        Xcode project (to be created on the build machine)
supabase/   migrations and edge functions (to be created)
```

## Open items

1. **Claude proxy on the Mac mini.** The owner will provide the URL and request format. The Edge Function needs it reachable from the internet (tunnel or public port). Until then, stub `match` and `interview` with canned responses.
2. Supabase project and GitHub repo do not exist yet; create them in build step 3. The owner pushes the repo.
3. Bundle identifier and signing team are set on the build machine (free personal team).
