# Mobile check — 2026-10-20

## Method and limits

Local build tested with system Chromium and Playwright. iPhone 13 and Pixel 7 device profiles emulate viewport, touch, pixel ratio and user agent; both use Chromium. Safari/WebKit and physical devices are unavailable. Microphone input is a controlled local audio stream, not a physical microphone. MP3 decoding/playback and MediaRecorder/IndexedDB use browser implementations. Direct inspection of the published Netlify site was blocked by the execution network proxy (403), so these results describe the local build.

## Checks

- Layout: 320, 360, 390, 430, 768px portrait and 844px landscape; home, choices, podcast, recording stage, diary and conversation. No horizontal overflow; primary phone controls at least 44px high.
- Read-aloud: start → actual amplitude-driven waveform → stop → microphone released → restart. No transcription, word highlight, MediaRecorder or diary write.
- Podcast stage: hide script → mic → recording → finish → diary write. Timer and track cleanup checked.
- AI visualization: all three forms stationary while user speaks; animation enabled only for AI speaking state.
- Music: embedded MP3 advances, stays unmuted through practice/recording/speech, and pauses at OFF. External pause changes status to OFF and permits restarting.
- Permission denial: visible message, no active read session, start remains available.
- Automated Node checks: seven tests covering speech service and voice-turn detector.

## Mobile adjustment

Prepare and resume the Web Audio context from the start-button action before waiting for microphone permission. This avoids relying on a later permission callback to unlock audio analysis. Device-specific behavior still needs physical testing.

## Remaining physical-device checks

- Safari and Android Chrome with the built-in microphone, actual speech and headphones.
- Speaker output, iPhone silent switch/volume and browser audio routing while microphone is active.
- Screen lock, app switch, incoming call and Bluetooth interruptions.
- Actual device voice availability, microphone permission prompts and downloaded recording playback.
- Storage retention under Safari private mode/low storage. Diary is browser-local, not synchronized.

Do not label these results as complete iOS/Android certification. Free-story AI generation remains unconnected in this demonstration.

## 2026-10-22 compact podcast update

- Removed the guest hero, bottom start button and long podcast helper text. A 44px microphone button at the upper right controls recording with either visible or hidden script. It changes color and responds to actual input amplitude. Conversation controls retain their existing behavior.
- Script spacing and font size reduced while keeping Korean translations readable. 320–768px layouts checked; a four-line sample fits at 390×844. Long scripts remain scrollable. Header brand returns to the initial studio and closes/saves an active take.
- Script hiding no longer stops/splits recording. Finishing from the top mic or navigating home stores the script/source/audio together. Recording-file-only deletion remains available.
- Optional browser regression: `tests/compact-podcast.browser.mjs` (same Playwright/BASE_URL environment options as other browser scripts). Uses a controlled audio stream; no physical iPhone/Android audio verification.

## 2026-10-22 common AI voices update

Replaced device synthesis with a fixed OpenAI voice catalog and shared server audio. The browser regression injects failures if device voices are queried or spoken, and uses controlled native WAV playback to verify a common Nova default, audio reuse, API failure recovery, user-listening state and pause/resume on desktop/iPhone viewport profiles. These remain Chromium simulations, not physical iOS validation. Paid OpenAI audio/voice quality was not exercised locally.

## 2026-10-22 explicit favorites and text resume

Supersedes the earlier compact-screen automatic-save flow above. Visible script uses a small microphone and listen-English/listen-own/retry icons. Hidden script restores the large studio microphone and listen-own/save/retry icons. Only the explicit save action creates a diary pair. Unchosen audio stays in page memory; reload restores text/stage without activating recording or autoplay. Existing diary audio deletion still preserves its script. Browser checks cover these distinctions with actual controlled MediaRecorder audio; physical microphone/iOS behavior still requires testing.
