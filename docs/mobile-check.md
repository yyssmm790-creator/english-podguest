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

## 2026-10-29 minimal conversation

- Default voice is selected before entry; no settings step is required. One start/stop button preserves the current question/listening phase and accepts a resume click while the preceding recorder is finalizing. The pending request can also be stopped again.
- Removed normal connection/preparation/listening/instruction copy from the conversation screen. Only actionable errors are surfaced. AI orb changes only while the AI speaks; the user's waveform shows input energy independently. The user's most recent answer is played by the speaking-head icon, not a text button or native control panel.
- Compact flex layout in portrait, two-column dialogue in short landscape. Tests with long question/answer content cover 320×568, 360×640, 390×844, 430×932, 768×1024 and 844×390; primary controls remain in view with internal text scrolling.
- Native MediaRecorder/Web Audio with a controlled oscillator and WAV provider stub checks actual silence-driven auto-next, repeated and rapid stop/start, pause during a pending question, and own-answer playback. Both desktop and iPhone profiles use Chromium; this is not real iOS microphone validation.
- Synthetic late-injected Netlify branding is hidden in the regression. The actual production badge is not present in local source and must be checked after deployment.

## 2026-10-29 artwork and microphone refinement

The conversation AI artwork is larger (responsive 64–104px core) with richer green/teal/lilac colors; it still animates only during AI speech. Questions and answers use more comfortable spacing. The primary start/stop action is a 56–68px circular microphone with the podcast color palette and real input-level response. Own-answer playback appears in the row below only after stopping and finalizing a nonempty take. A reserved playback row prevents control jumps. Short portrait and landscape layouts retain all main controls in the viewport; long text scrolls within its areas. Answer hiding remains available inside settings. The browser regression checks visibility and position of the microphone/playback icon, rapid toggling, automatic next questions and the unchanged podcast favorite-save workflow.
