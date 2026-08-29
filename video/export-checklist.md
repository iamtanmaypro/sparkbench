# Export checklist (hard rule: 2:55 maximum)

## Edit order

1. Lay the voiceover down first as one continuous track (recorded from
   video/voiceover-script.md in one sitting).
2. Cut screen recordings to the audio per the shot list; the demo shot (C)
   stays continuous, trim only its head and tail.
3. Add the end card (live URL + repo URL) in Shot E's last 5 seconds.
4. No music needed. If a quiet bed is used, it must sit far below the voice.

## Export settings

| Setting | Value |
|---|---|
| Resolution | 1920x1080 |
| Frame rate | 30 fps (60 only if the source recordings are 60) |
| Codec / container | H.264, MP4 |
| Audio | AAC, 48 kHz, mono or stereo, voice normalized to about -16 LUFS |
| Duration | 2:55 or less (target 2:50) |

## Length check (do not skip)

- macOS: `mdls -name kMDItemDurationSeconds <file>.mp4` must report 175.0
  seconds (2:55) or less. QuickTime's rounded display is not precise enough on
  its own; the mdls value is the record.
- If over: trim silence at the head of Beat 1 and pauses at cut points first,
  then shorten the Shot D montage. Never shorten the demo shot (C).

## Pre-upload checks

- [ ] Duration at or under 2:55 (mdls record above)
- [ ] 1080p, cursor visible throughout every screen segment
- [ ] Audio is Tanmay's voice, audible on laptop speakers
- [ ] Zero em dashes in every on-screen text, caption, and title card
      (`sh copy/check-dashes.sh <files>` over any text files feeding overlays;
      expect "OK: no em dashes, no en dashes.")
- [ ] End card URL matches the live app URL and the repo URL in the README
- [ ] Playback spot-checked on a second device (phone is fine)

## YouTube upload (Tanmay only)

1. Upload as Public (not unlisted; the rules require public).
2. Title suggestion: `Sparkbench: an electronics lab where your AI agent is your lab partner (WebMCP)`
3. Description, first line matters (judges click through from Devpost):
   `Sparkbench is a browser electronics lab where a student and their AI agent share one workbench through WebMCP. The agent reads live circuit measurements, proposes changes that wait for the student's approval, and diagnoses broken circuits. Built for the OpenAI WebMCP Challenge.`
   Then: live app URL, repo URL, and the three prompts to try (What is wrong
   with my circuit? / Build me a voltage divider / Why is the LED dark?).
4. Category: Science & Technology. Language: English. No age restriction.
5. Captions: upload the auto-generated ones after a pass, or skip; not scored.
6. Confirm the video plays signed out in a private window before pasting the
   URL into Devpost.

## Timing (from the plan's schedule)

- Record and edit: Aug 31 IST.
- Upload public: Sep 1 IST (buffer day, per the schedule).
- Paste the YouTube URL into the Devpost form during the dry run; Submit is
  Sep 2 IST, never later.
