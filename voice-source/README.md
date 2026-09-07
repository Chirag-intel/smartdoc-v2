# Supplied recordings

The two original ElevenLabs clips, kept verbatim as delivered. Nothing here is
served by the app — it is the archive copy, safe from `npm run voices -- --force`.

| File | Voice | Says |
|---|---|---|
| `tara-greeting-supplied.mp3` | Tara – Hindi Reels Explainer Style | "Hi, I am there to assist you." (1.99s) |
| `riya-greeting-supplied.mp3` | Riya Rao – Energetic and Pleasant | "Hi, I am there to assist you." (2.32s) |

`tara-greeting-supplied.mp3` ships as `public/assist/en/greeting.mp3`.

The Riya original is English, so the Hindi journey would open in English. The
Hindi greeting is therefore generated in Riya's voice from the Hindi line in
`src/lib/assist-script.js`. To go back to the original recording, copy
`riya-greeting-supplied.mp3` over `public/assist/hi/greeting.mp3` and mark
`greeting.supplied` as `['en', 'hi']`.
