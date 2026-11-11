# Background Audio — Credits & Licensing

The site plays one of five tracks at random when a visitor turns audio on. The
interface only shows **Audio On** or **Audio Off**; track titles and artist names
are kept here for maintenance and licensing.

## Tracks

| # | Track | Creator | Source | Local file | Licence |
| --- | --- | --- | --- | --- | --- |
| 1 | Eventually, Everything Connects - V1.5 | igana | [Suno](https://suno.com/s/UaWmXrn6HwvvX7Na) | `audio/eventually-everything-connects.mp3` | User-supplied original |
| 2 | past time - relax lofi | snoozybeats | [Pixabay](https://pixabay.com/music/beats-past-time-relax-lofi-248760/) | `audio/past-time.mp3` | Pixabay Content License |
| 3 | Moonlight Whispers (1) / lofi | LofCosmos | [Pixabay](https://pixabay.com/music/modern-classical-moonlight-whispers-1-lofi-261228/) | `audio/moonlight-whispers.mp3` | Pixabay Content License |
| 4 | Whispering Stars (1) / Lofi | LofCosmos | [Pixabay](https://pixabay.com/music/modern-classical-whispering-stars-1-lofi-319185/) | `audio/whispering-stars.mp3` | Pixabay Content License |
| 5 | Dreamy Whispers [chill lofi] | snoozybeats | [Pixabay](https://pixabay.com/music/beats-dreamy-whispers-chill-lofi-341260/) | `audio/dreamy-whispers.mp3` | Pixabay Content License |

Track 1 is the user's own Suno track. The Suno share page does not provide a
download without signing in, so the MP3 must be supplied by the owner and placed
at the path above.

Tracks 2–5 are used under the [Pixabay Content License](https://pixabay.com/service/license-summary/).
The licence permits use on websites and does not require attribution. It does not
permit redistributing the audio as a standalone download or presenting it as the
site owner's own music. The files are hosted only as part of this portfolio's
background player.

Some Pixabay tracks are marked **Content ID Registered** on their Pixabay pages.
That affects content-ID matching on video platforms; it does not change the
licence for website playback.

## Hosting and playback

- Files live in `audio/` and are served as static assets.
- The track list is in `audio-tracks.js`.
- The player is in `site-audio.js`.
- One hidden `<audio id="siteAudio">` element with `loop` and `preload="none"`.
- Nothing loads until a visitor turns audio on. There is no autoplay.
- The first turn-on in a visit picks one track at random.
- The chosen track persists for the session and across in-app navigation.
- Turning audio off and on again resumes the same track and position.
- A new visit picks a new random track and avoids the previous visit's track
  where possible.
- Volume fades in/out and is capped low (`0.22`).
- If a file is missing or fails to load, the player tries another available
  track; if none work it returns to **Audio Off**.

Storage keys:

- `ibrahim-gana:audio-session-track` — track chosen for this session.
- `ibrahim-gana:audio-last-track` — previous visit's track, used to avoid
  immediate repetition.

## Adding or replacing tracks

1. Put the MP3 in `audio/`.
2. Add or edit an entry in `audio-tracks.js` (`id`, `title`, `file`).
3. Update the table above.
4. Test: turn audio on, off, on again, and navigate between pages.
