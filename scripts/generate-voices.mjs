#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────
// Renders every clip in src/lib/assist-script.js to public/assist/<lang>/<id>.mp3
// in the configured ElevenLabs voices. Run once; the app then needs no key.
//
//   npm run voices              # generate anything missing
//   npm run voices -- --force   # re-render everything
//   npm run voices -- --list    # print the script without calling the API
//   npm run voices -- --force --lang hi   # re-render one language only
//
// Reads ELEVENLABS_API_KEY from the environment or .env.local.
// Voice ids are looked up by name, so you do not have to hunt for them —
// override with ELEVENLABS_VOICE_EN / ELEVENLABS_VOICE_HI if you prefer.
// ─────────────────────────────────────────────────────────────────────────

import { readFileSync, existsSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const FORCE = args.has('--force');
const langArg = process.argv.find((a, i) => process.argv[i - 1] === '--lang');
const ONLY = langArg ? langArg.split(',') : null;             // --lang hi  |  --lang en,hi
const LIST = args.has('--list');

const { CLIPS, VOICES } = await import(pathToFileURL(join(root, 'src/lib/assist-script.js')).href);

const c = { dim: s => `\x1b[2m${s}\x1b[0m`, b: s => `\x1b[1m${s}\x1b[0m`,
            g: s => `\x1b[32m${s}\x1b[0m`, y: s => `\x1b[33m${s}\x1b[0m`, r: s => `\x1b[31m${s}\x1b[0m` };

// ── .env.local ───────────────────────────────────────────────────────────
function loadEnv() {
    const f = join(root, '.env.local');
    if (!existsSync(f)) return;
    for (const line of readFileSync(f, 'utf8').split('\n')) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').replace(/\s+#.*$/, '').trim();
    }
}
loadEnv();

const allLangs = Object.keys(VOICES);
const langs = ONLY ? allLangs.filter(l => ONLY.includes(l)) : allLangs;
if (ONLY && !langs.length) { console.error(`Unknown --lang ${langArg}. Known: ${allLangs.join(', ')}`); process.exit(1); }
const entries = Object.entries(CLIPS);
const suppliedFor = (v, lang) => (Array.isArray(v.supplied) ? v.supplied.includes(lang) : Boolean(v.supplied));
const todo = entries.filter(([, v]) => langs.some(l => !suppliedFor(v, l)));

// ── --list: print every line so it can be recorded by hand ───────────────
if (LIST) {
    console.log(c.b('\nAssist voice script\n'));
    for (const lang of langs) {
        console.log(c.b(`${VOICES[lang].label}  →  public/assist/${lang}/`));
        for (const [id, v] of entries) {
            const sup = Array.isArray(v.supplied) ? v.supplied.includes(lang) : Boolean(v.supplied);
            const tag = sup ? c.g('[supplied] ') : c.dim(`${id}.mp3`.padEnd(22));
            console.log(`  ${tag}  ${v[lang]}`);
        }
        console.log('');
    }
    console.log(c.dim(`${todo.length} clips per language · ${todo.length * langs.length} files total\n`));
    process.exit(0);
}

const KEY = process.env.ELEVENLABS_API_KEY;

// A key ID and a key look alike at a glance; only the key works, and it is
// shown once at creation. Catch the mix-up before spending a round trip.
if (KEY && !KEY.startsWith('sk_')) {
    console.error(`
${c.r('That looks like an API key ID, not an API key.')}

  ElevenLabs API keys start with ${c.b('sk_')} and are shown ${c.b('only once')}, when you
  create them. The value in .env.local starts with "${KEY.slice(0, 3)}…", which is
  the key's ID — it cannot be used to authenticate and cannot be converted.

  Create a fresh one:
    elevenlabs.io → Profile icon (bottom left) → API Keys → Create API Key
    Copy the sk_... value straight away, then put it in .env.local

`);
    process.exit(1);
}

if (!KEY) {
    console.error(`
${c.r('No ELEVENLABS_API_KEY found.')}

  1. cp .env.local.example .env.local
  2. Put your ElevenLabs key in it  (elevenlabs.io → Profile → API key)
  3. npm run voices

  Prefer to record by hand? ${c.b('npm run voices -- --list')} prints every line
  with the exact filename it belongs in.
`);
    process.exit(1);
}

// ── Resolve voice ids by name ────────────────────────────────────────────
async function resolveVoices() {
    const out = {};
    // Priority: env override → the id pinned in the manifest → lookup by name.
    langs.forEach(l => { out[l] = process.env[`ELEVENLABS_VOICE_${l.toUpperCase()}`] || VOICES[l].id || null; });
    const missing = langs.filter(l => !out[l]);
    if (!missing.length) {
        langs.forEach(l => console.log(c.dim(`  ${l}: ${VOICES[l].label} (${out[l]})`)));
        return out;
    }

    let res = await fetch('https://api.elevenlabs.io/v2/voices?page_size=100', { headers: { 'xi-api-key': KEY } })
        .catch(() => null);
    if (!res?.ok && res?.status !== 400) {
        // Older accounts only expose v1.
        res = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': KEY } }).catch(() => null);
    }
    if (!res?.ok) {
        let msg = '';
        try { msg = (await res.json())?.detail?.message || ''; } catch { /* non-JSON body */ }
        console.error(c.r(`\nCould not list your voices (HTTP ${res?.status ?? 'no response'}).`));
        if (msg) console.error(`  ${msg}`);
        console.error(c.dim('  Or set ELEVENLABS_VOICE_EN / ELEVENLABS_VOICE_HI in .env.local directly.\n'));
        process.exit(1);
    }
    const { voices = [] } = await res.json();
    for (const l of missing) {
        const hit = voices.find(v => VOICES[l].match.test(v.name || ''));
        if (!hit) {
            console.error(c.r(`\nNo voice matching "${VOICES[l].voice}" in your ElevenLabs account.`));
            console.error(c.dim(`Available: ${voices.map(v => v.name).join(', ') || '(none)'}`));
            console.error(c.dim(`Add it from the Voice Library, or set ELEVENLABS_VOICE_${l.toUpperCase()} directly.`));
            process.exit(1);
        }
        out[l] = hit.voice_id;
        console.log(c.dim(`  ${l}: matched "${hit.name}" → ${hit.voice_id}`));
    }
    return out;
}

console.log(c.b('\nResolving voices…'));
const voiceIds = await resolveVoices();

// ── Render ───────────────────────────────────────────────────────────────
async function render(text, voiceId, attempt = 1) {
    const res = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
        {
            method: 'POST',
            headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
            body: JSON.stringify({
                text,
                model_id: 'eleven_multilingual_v2',
                voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true },
            }),
        }
    ).catch(e => ({ ok: false, status: 0, statusText: e.message }));

    if (!res.ok) {
        if ((res.status === 429 || res.status >= 500) && attempt < 4) {
            const wait = attempt * 2000;
            console.log(c.y(`    rate-limited, retrying in ${wait / 1000}s…`));
            await new Promise(r => setTimeout(r, wait));
            return render(text, voiceId, attempt + 1);
        }
        const detail = res.text ? await res.text().catch(() => '') : res.statusText;
        throw new Error(`HTTP ${res.status} ${String(detail).slice(0, 200)}`);
    }
    return Buffer.from(await res.arrayBuffer());
}

let made = 0, skipped = 0, failed = 0;

for (const lang of langs) {
    const dir = join(root, 'public', 'assist', lang);
    mkdirSync(dir, { recursive: true });
    console.log(`\n${c.b(VOICES[lang].label)}`);

    for (const [id, clip] of entries) {
        const file = join(dir, `${id}.mp3`);

        const isSupplied = Array.isArray(clip.supplied) ? clip.supplied.includes(lang) : Boolean(clip.supplied);
        if (isSupplied) {
            const ok = existsSync(file) && statSync(file).size > 0;
            console.log(`  ${ok ? c.g('kept    ') : c.r('MISSING ')} ${id}.mp3 ${c.dim('(supplied recording)')}`);
            if (!ok) failed++;
            continue;
        }
        if (existsSync(file) && !FORCE) { skipped++; console.log(`  ${c.dim('exists  ')} ${id}.mp3`); continue; }

        try {
            const audio = await render(clip[lang], voiceIds[lang]);
            writeFileSync(file, audio);
            made++;
            console.log(`  ${c.g('wrote   ')} ${id}.mp3 ${c.dim(`${(audio.length / 1024).toFixed(0)} KB`)}`);
        } catch (err) {
            failed++;
            console.log(`  ${c.r('failed  ')} ${id}.mp3 ${c.dim(err.message)}`);
        }
        await new Promise(r => setTimeout(r, 250));   // stay polite with the API
    }
}

console.log(`\n${c.b('Done.')} ${made} written, ${skipped} already present, ${failed ? c.r(`${failed} failed`) : '0 failed'}`);
if (skipped && !FORCE) console.log(c.dim('Re-render everything with: npm run voices -- --force'));
console.log('');
process.exit(failed ? 1 : 0);
