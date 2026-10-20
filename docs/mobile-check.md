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
