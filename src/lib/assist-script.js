// ─────────────────────────────────────────────────────────────────────────
// Assist voice pack — the single source of truth.
//
// Every line the guide can speak lives here as a CLIP with a stable id.
// The narration is assembled from these clips at runtime, so it still names
// the applicant's real documents while remaining entirely pre-recorded.
//
//   scripts/generate-voices.mjs  reads this and renders public/assist/<lang>/<id>.mp3
//   the upload portal            reads this and plays the clips in order
//
// Adding a line = add an entry here, re-run `npm run voices`. Nothing else.
// ─────────────────────────────────────────────────────────────────────────

// ── Voice casting ────────────────────────────────────────────────────
// `id` is the ElevenLabs voice id used to render the pack. Swap an id here
// and re-run `npm run voices -- --force` to recast a language entirely.
//
// Note: ElevenLabs' Voice Library voices (Tara, Riya Rao, Sia, Zara…) require
// a paid plan to use over the API — the free tier only permits ElevenLabs'
// own premade voices, which is what these are. On a paid plan, swap `id` for
// a library voice and re-render.
export const VOICES = {
    en: {
        name: 'English',
        voice: 'Jessica',
        id: 'cgSgspJ2msm6clMCkdW9',
        label: 'Jessica — Playful, Bright, Warm',
        match: /^jessica/i,
    },
    hi: {
        name: 'हिंदी',
        voice: 'Sarah',
        id: 'EXAVITQu4vr4xnSDxMaL',
        label: 'Sarah — Mature, Reassuring, Confident',
        match: /^sarah/i,
    },
};

// `supplied: true` — shipped as a hand-made recording; the generator never
// overwrites these.
export const CLIPS = {
    greeting: {
        // Rendered in the same voice as the rest of the guide — a greeting in
        // one voice followed by instructions in another is jarring. The two
        // original supplied clips are archived in voice-source/.
        en: 'Hi! I am here to help you upload your documents.',
        hi: 'नमस्ते! मैं आपकी मदद के लिए यहाँ हूँ।',
    },

    /* ── How many are left ─────────────────────────────────────────── */
    pending_1:    { en: 'You have one document left.',    hi: 'आपका एक डॉक्यूमेंट बाकी है।' },
    pending_2:    { en: 'You have two documents left.',   hi: 'आपके दो डॉक्यूमेंट बाकी हैं।' },
    pending_3:    { en: 'You have three documents left.', hi: 'आपके तीन डॉक्यूमेंट बाकी हैं।' },
    pending_4:    { en: 'You have four documents left.',  hi: 'आपके चार डॉक्यूमेंट बाकी हैं।' },
    pending_5:    { en: 'You have five documents left.',  hi: 'आपके पाँच डॉक्यूमेंट बाकी हैं।' },
    pending_6:    { en: 'You have six documents left.',   hi: 'आपके छह डॉक्यूमेंट बाकी हैं।' },
    pending_7:    { en: 'You have seven documents left.', hi: 'आपके सात डॉक्यूमेंट बाकी हैं।' },
    pending_8:    { en: 'You have eight documents left.', hi: 'आपके आठ डॉक्यूमेंट बाकी हैं।' },
    pending_many: { en: 'You have a few documents left.', hi: 'आपके कुछ डॉक्यूमेंट बाकी हैं।' },

    list_intro: {
        en: 'Here is what is still pending.',
        hi: 'जो अभी बाकी है, वो ये है।',
    },

    /* ── One clip per document type, so the guide can name them ────── */
    doc_pan_card:       { en: 'Your PAN card.',        hi: 'आपका पैन कार्ड।' },
    doc_aadhaar_card:   { en: 'Your Aadhaar card.',    hi: 'आपका आधार कार्ड।' },
    doc_address_proof:  { en: 'Your address proof.',   hi: 'आपका एड्रेस प्रूफ़।' },
    doc_bank_statement: { en: 'Your bank statement.',  hi: 'आपका बैंक स्टेटमेंट।' },
    doc_passport:       { en: 'Your passport.',        hi: 'आपका पासपोर्ट।' },
    doc_photograph:     { en: 'Your photograph.',      hi: 'आपकी फ़ोटो।' },
    doc_salary_slip:    { en: 'Your salary slip.',     hi: 'आपकी सैलरी स्लिप।' },
    doc_itr:            { en: 'Your income tax return.', hi: 'आपकी इनकम टैक्स रिटर्न।' },
    doc_signature:      { en: 'Your signature.',       hi: 'आपका हस्ताक्षर।' },
    doc_other:          { en: 'And one more document listed on the page.', hi: 'और एक डॉक्यूमेंट, जो पेज पर लिखा है।' },
    doc_more:           { en: 'And a few more listed below.', hi: 'और कुछ और, जो नीचे दिए गए हैं।' },

    /* ── Instructions ──────────────────────────────────────────────── */
    retry: {
        en: 'Some of these were not accepted last time. Look for the note in red, then upload a clearer copy.',
        hi: 'इनमें से कुछ पिछली बार स्वीकार नहीं हुए थे। लाल रंग में लिखा नोट देखिए, और साफ़ कॉपी अपलोड कीजिए।',
    },
    digilocker: {
        en: 'If you use DigiLocker, you can fetch your PAN and Aadhaar together in one go. That is the fastest way, and it never gets rejected.',
        hi: 'अगर आप डिजिलॉकर इस्तेमाल करते हैं, तो पैन और आधार एक साथ ला सकते हैं। यह सबसे तेज़ तरीका है, और यह कभी रिजेक्ट नहीं होता।',
    },
    aa: {
        en: 'For your bank statement, tap Fetch from your bank. It comes straight from your bank over the R B I Account Aggregator network.',
        hi: 'बैंक स्टेटमेंट के लिए, बैंक से लाएँ पर टैप कीजिए। यह सीधे आपके बैंक से, आर बी आई अकाउंट एग्रीगेटर नेटवर्क के ज़रिए आता है।',
    },
    upload: {
        en: 'To upload a file, tap the upload box and choose a photo or PDF. Keep the whole document inside the frame, and make sure the text is easy to read.',
        hi: 'फ़ाइल अपलोड करने के लिए, अपलोड बॉक्स पर टैप कीजिए और फ़ोटो या पीडीएफ़ चुनिए। पूरा डॉक्यूमेंट फ्रेम के अंदर रखिए, और ध्यान रखिए कि लिखा हुआ साफ़ पढ़ा जा सके।',
    },
    outro: {
        en: 'That is everything. Tap Need help any time and I will run through it again.',
        hi: 'बस इतना ही। कभी भी हेल्प पर टैप कीजिए, मैं फिर से बता दूँगी।',
    },
    done: {
        en: 'All your documents are verified. Tap Submit documents at the bottom to finish.',
        hi: 'आपके सभी डॉक्यूमेंट वेरिफाई हो गए हैं। नीचे सबमिट डॉक्यूमेंट्स पर टैप करके पूरा कीजिए।',
    },
};

export const clipUrl = (lang, id) => `/assist/${lang}/${id}.mp3`;
export const clipText = (lang, id) => CLIPS[id]?.[lang] || '';

const MAX_NAMED = 4;

/**
 * Build the ordered clip-id playlist for the current state of a case.
 * Pure — no audio, no DOM — so it is trivially testable.
 */
export function buildPlaylist({ pending = [], hasRejected = false, hasDigiLocker = false, hasAA = false }) {
    const list = ['greeting'];

    if (pending.length === 0) {
        list.push('done');
        return list;
    }

    list.push(pending.length <= 8 ? `pending_${pending.length}` : 'pending_many');
    list.push('list_intro');

    pending.slice(0, MAX_NAMED).forEach((docType) => {
        const id = `doc_${docType}`;
        list.push(CLIPS[id] ? id : 'doc_other');
    });
    if (pending.length > MAX_NAMED) list.push('doc_more');

    if (hasRejected) list.push('retry');
    if (hasDigiLocker) list.push('digilocker');
    if (hasAA) list.push('aa');
    list.push('upload', 'outro');

    return list;
}
