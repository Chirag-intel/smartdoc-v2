'use client';

import { useState, useEffect, useRef, useCallback, use } from 'react';
import Icon from '@/components/Icon';
import { Button, Pill, Modal, Notice, Field, useToasts } from '@/components/ui';
import { DOC_MAP, docLabel, docIcon, DIGILOCKER_DOCS, AA_DOCS } from '@/lib/docs';
import { VOICES, buildPlaylist, clipUrl } from '@/lib/assist-script';

/* Reference images so applicants can self-check before uploading. */
const SAMPLES = {
    aadhaar_card: {
        sides: [
            { label: 'Front', src: '/samples/aadhaar_front.png', tip: 'Name, photo, date of birth and the 12-digit number' },
            { label: 'Back', src: '/samples/aadhaar_back.png', tip: 'Full address and the 12-digit number' },
        ],
        tips: ['All four corners inside the frame', 'Sharp enough to read every digit', 'Both sides are required'],
    },
    pan_card: {
        sides: [
            { label: 'Front', src: '/samples/pan_front.png', tip: 'Name, father’s name, date of birth and PAN number' },
            { label: 'Back', src: '/samples/pan_back.png', tip: 'Address and signature' },
        ],
        tips: ['The 10-character PAN must be legible', 'The name must match your application', 'Laminated cards are fine'],
    },
    passport: {
        sides: [{ label: 'Data page', src: '/samples/passport.png', tip: 'Photo page including the two MRZ lines at the bottom' }],
        tips: ['Data page only — not the cover', 'Both MRZ lines fully visible', 'Must still be valid'],
    },
    address_proof: {
        sides: [
            { label: 'Voter ID', src: '/samples/voter_id_front.png', tip: 'Election Commission voter ID is accepted' },
            { label: 'Driving licence', src: '/samples/driving_license_front.png', tip: 'A licence showing your address works too' },
        ],
        tips: ['Must show your current address', 'Issued within the last 3 years', 'Name must match your application'],
    },
};

const BANKS = [
    { id: 'sbi', name: 'State Bank of India' }, { id: 'hdfc', name: 'HDFC Bank' },
    { id: 'icici', name: 'ICICI Bank' }, { id: 'axis', name: 'Axis Bank' },
    { id: 'kotak', name: 'Kotak Mahindra' }, { id: 'pnb', name: 'Punjab National Bank' },
];

export default function UploadPortal({ params }) {
    const { token } = use(params);
    const [toasts, toast] = useToasts();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [submitted, setSubmitted] = useState(false);

    const [busy, setBusy] = useState({});
    const [files, setFiles] = useState({});
    const [checks, setChecks] = useState({});
    const [notes, setNotes] = useState({});
    const [dragging, setDragging] = useState(null);
    const [sampleSide, setSampleSide] = useState({});
    const [override, setOverride] = useState({});      // docKey -> reason text (panel open when string)
    const [overriding, setOverriding] = useState({});

    const load = useCallback(async () => {
        try {
            const res = await fetch(`/api/upload/${token}`);
            if (res.status === 410) { setError('expired'); return; }
            if (!res.ok) { setError('invalid'); return; }
            setData(await res.json());
        } catch { setError('invalid'); }
        finally { setLoading(false); }
    }, [token]);

    // Initial fetch — state is set from the promise continuation, not the effect body.
    useEffect(() => {
        let alive = true;
        fetch(`/api/upload/${token}`)
            .then(async (res) => {
                if (!alive) return;
                if (res.status === 410) { setError('expired'); return; }
                if (!res.ok) { setError('invalid'); return; }
                setData(await res.json());
            })
            .catch(() => { if (alive) setError('invalid'); })
            .finally(() => { if (alive) setLoading(false); });
        return () => { alive = false; };
    }, [token]);

    const keyOf = (doc) => doc.id || doc.docType;
    const isDone = (doc) => checks[keyOf(doc)]?.valid || doc.status === 'validated' || doc.status === 'uploaded';

    const post = async (docKey, file, extra = {}) => {
        const fd = new FormData();
        fd.append('docType', docKey);
        fd.append('file', file);
        fd.append('comment', notes[docKey] || '');
        Object.entries(extra).forEach(([k, v]) => fd.append(k, v));
        const res = await fetch(`/api/upload/${token}`, { method: 'POST', body: fd });
        return res.json();
    };

    const upload = async (doc, file) => {
        if (!file) return;
        const k = keyOf(doc);
        setBusy(p => ({ ...p, [k]: true }));
        setFiles(p => ({ ...p, [k]: file }));
        try {
            const out = await post(k, file, { source: 'manual' });
            setChecks(p => ({ ...p, [k]: out.validation }));
            out.validation?.valid
                ? toast('success', `${docLabel(doc)} verified.`)
                : toast('error', `${docLabel(doc)} could not be verified.`);
        } catch { toast('error', 'That upload did not go through. Please try again.'); }
        finally { setBusy(p => ({ ...p, [k]: false })); }
    };

    const submitOverride = async (doc) => {
        const k = keyOf(doc);
        const reason = (override[k] || '').trim();
        if (!reason) return;
        setOverriding(p => ({ ...p, [k]: true }));
        try {
            const file = files[k] || new File(['override'], doc.uploadedFile || `${doc.docType}.jpg`, { type: 'image/jpeg' });
            const out = await post(k, file, { bypass: 'true', bypassRemark: reason });
            setChecks(p => ({ ...p, [k]: { ...out.validation, valid: true, bypassed: true } }));
            setOverride(p => ({ ...p, [k]: undefined }));
            toast('success', `${docLabel(doc)} submitted with your note. A reviewer will look at it.`);
        } catch { toast('error', 'Could not submit. Please try again.'); }
        finally { setOverriding(p => ({ ...p, [k]: false })); }
    };

    /* ── DigiLocker ─────────────────────────────────────────────── */
    const [digi, setDigi] = useState(null);            // { step, phone, otp[], pick{} }
    const digiPending = () => (data?.documents || []).filter(d => DIGILOCKER_DOCS.includes(d.docType) && !isDone(d));

    const openDigi = () => {
        const pick = {};
        digiPending().forEach(d => { pick[d.docType] = true; });
        setDigi({ step: 1, phone: '', otp: ['', '', '', '', '', ''], pick, working: false });
    };

    const runDigi = async () => {
        setDigi(d => ({ ...d, working: true }));
        await new Promise(r => setTimeout(r, 1600));
        try {
            const picked = digiPending().filter(d => digi.pick[d.docType]);
            for (const doc of picked) {
                const out = await post(keyOf(doc), new File(['digilocker'], `${doc.docType}_digilocker.pdf`, { type: 'application/pdf' }), {
                    source: 'digilocker', comment: 'Fetched via DigiLocker',
                });
                setChecks(p => ({ ...p, [keyOf(doc)]: out.validation }));
            }
            toast('success', `${picked.map(docLabel).join(' and ')} fetched from DigiLocker.`);
            setDigi(null);
            load();
        } catch { toast('error', 'DigiLocker did not respond. Please try again.'); setDigi(d => ({ ...d, working: false })); }
    };

    /* ── Account Aggregator ─────────────────────────────────────── */
    const [aa, setAa] = useState(null);                // { step, docKey, bank, id, consent }

    const runAa = async () => {
        setAa(a => ({ ...a, working: true }));
        await new Promise(r => setTimeout(r, 1800));
        try {
            const doc = data.documents.find(d => keyOf(d) === aa.docKey);
            const out = await post(aa.docKey, new File(['aa'], `${doc.docType}_aa.pdf`, { type: 'application/pdf' }), {
                source: 'account_aggregator', comment: `Fetched via Account Aggregator (${aa.bank})`,
            });
            setChecks(p => ({ ...p, [aa.docKey]: out.validation }));
            toast('success', `${docLabel(doc)} fetched from your bank.`);
            setAa(null);
            load();
        } catch { toast('error', 'The bank did not respond. Please try again.'); setAa(a => ({ ...a, working: false })); }
    };

    /* ── Voice assist ─────────────────────────────────────────────
       Every line is a pre-rendered MP3 in the applicant's chosen voice
       (Tara for English, Riya Rao for Hindi). The playlist is assembled
       from this case's real pending documents. No browser speech
       synthesis anywhere — if a clip is missing the guide says so rather
       than falling back to a robotic voice. */

    const [assist, setAssist] = useState({ open: false, lang: 'en', playing: false, at: -1, total: 0, missing: false });
    const audioRef = useRef(null);
    const runRef = useRef(0);          // bumps on every stop, cancelling in-flight playback

    const playlist = useCallback(() => {
        if (!data) return [];
        const left = data.documents.filter(d => !isDone(d));
        return buildPlaylist({
            pending: left.map(d => (d.isOther ? 'other' : d.docType)),
            hasRejected: left.some(d => d.status === 'rejected'),
            hasDigiLocker: left.some(d => DIGILOCKER_DOCS.includes(d.docType)),
            hasAA: left.some(d => AA_DOCS.includes(d.docType)),
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, checks]);

    const stopVoice = useCallback(() => {
        runRef.current += 1;
        const el = audioRef.current;
        if (el) { el.pause(); el.removeAttribute('src'); el.load(); audioRef.current = null; }
        setAssist(a => ({ ...a, playing: false, at: -1 }));
    }, []);

    // Resolves 'ok' | 'missing' | 'cancelled'.
    const playClip = (url, token) => new Promise((resolve) => {
        const el = new Audio(url);
        audioRef.current = el;
        let settled = false;
        const finish = (r) => { if (!settled) { settled = true; clearInterval(guard); resolve(r); } };
        el.onended = () => finish('ok');
        el.onerror = () => finish('missing');
        const guard = setInterval(() => { if (runRef.current !== token) { el.pause(); finish('cancelled'); } }, 150);
        el.play().catch(() => finish(runRef.current !== token ? 'cancelled' : 'missing'));
    });

    const play = useCallback(async () => {
        stopVoice();
        const token = runRef.current;
        const list = playlist();
        if (!list.length) return;

        setAssist(a => ({ ...a, playing: true, at: 0, total: list.length, missing: false }));
        let gaps = 0;

        for (let i = 0; i < list.length; i++) {
            if (runRef.current !== token) return;
            setAssist(a => ({ ...a, at: i }));
            const result = await playClip(clipUrl(assist.lang, list[i]), token);
            if (result === 'cancelled') return;
            if (result === 'missing') {
                gaps++;
                // Keep the transcript readable even with no audio for this line.
                await new Promise(r => setTimeout(r, 900));
            }
        }
        if (runRef.current === token) setAssist(a => ({ ...a, playing: false, at: -1, missing: gaps > 0 }));
         
    }, [playlist, assist.lang, stopVoice]);

    // Tapping a language plays its greeting, so the voice is audible before choosing.
    const previewVoice = useCallback((lang) => {
        stopVoice();
        playClip(clipUrl(lang, 'greeting'), runRef.current);
         
    }, [stopVoice]);

    useEffect(() => () => stopVoice(), [stopVoice]);

    /* ── States ─────────────────────────────────────────────────── */
    if (loading) return (
        <Shell>
            <div className="skel" style={{ height: 26, width: 220, marginBottom: 12 }} />
            <div className="skel" style={{ height: 14, width: 300, marginBottom: 22 }} />
            <div className="skel" style={{ height: 84, borderRadius: 12, marginBottom: 16 }} />
            <div className="skel" style={{ height: 190, borderRadius: 14, marginBottom: 14 }} />
            <div className="skel" style={{ height: 190, borderRadius: 14 }} />
        </Shell>
    );

    if (error) return (
        <Shell>
            <div className="panel" style={{ padding: '44px 24px', textAlign: 'center' }}>
                <div className="empty-art" style={{ margin: '0 auto 16px' }}>
                    <Icon name={error === 'expired' ? 'clock' : 'lock'} size={20} />
                </div>
                <h1 style={{ fontSize: 19, marginBottom: 7 }}>
                    {error === 'expired' ? 'This link has expired' : 'This link is not valid'}
                </h1>
                <p style={{ color: 'var(--ink-3)', maxWidth: '44ch', margin: '0 auto' }}>
                    {error === 'expired'
                        ? 'A newer link was issued for your application. Check your latest SMS, WhatsApp or email — or ask your loan officer to resend it.'
                        : 'The address may be mistyped or the request may have been closed. Your loan officer can send you a fresh link.'}
                </p>
            </div>
        </Shell>
    );

    if (submitted) return (
        <Shell>
            <div className="panel" style={{ padding: '44px 24px', textAlign: 'center' }}>
                <div className="empty-art" style={{ margin: '0 auto 16px', background: 'var(--ok-bg)', borderColor: 'var(--ok-line)', color: 'var(--ok)' }}>
                    <Icon name="check" size={22} strokeWidth={2.2} />
                </div>
                <h1 style={{ fontSize: 19, marginBottom: 7 }}>All done, {data.customerName.split(' ')[0]}</h1>
                <p style={{ color: 'var(--ink-3)', maxWidth: '46ch', margin: '0 auto 18px' }}>
                    We have all {data.documents.length} documents for {data.loanId}. Your loan officer reviews them next — you
                    only hear from us again if something needs a second look.
                </p>
                <Pill status="completed">Submitted {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</Pill>
            </div>
        </Shell>
    );

    const total = data.documents.length;
    const complete = data.documents.filter(isDone).length;
    const pct = total ? Math.round((complete / total) * 100) : 0;

    return (
        <div className="portal">
            <header className="portal-bar">
                <div className="portal-bar-in">
                    <span className="brand-mark"><Icon name="shield" size={17} strokeWidth={1.9} /></span>
                    <span>
                        <span className="brand-name">SmartDoc</span>
                        <span className="brand-sub">Secure document upload</span>
                    </span>
                    <span style={{ marginLeft: 'auto' }}><Pill tone="neutral" icon="lock">Encrypted</Pill></span>
                </div>
            </header>

            <main className="portal-wrap">
                <div className="portal-hero" style={{ marginBottom: 18 }}>
                    <h1>{complete === total ? 'Everything is in' : `${data.customerName.split(' ')[0]}, we need ${total - complete} more document${total - complete > 1 ? 's' : ''}`}</h1>
                    <p>
                        {complete === total
                            ? 'All your documents are verified. Submit below and you are done.'
                            : 'Upload a photo or PDF of each one — or pull it straight from DigiLocker or your bank, which is faster and never gets rejected.'}
                    </p>
                </div>

                <dl className="facts" style={{ marginBottom: 18 }}>
                    <div className="fact"><dt>Applicant</dt><dd>{data.customerName}</dd></div>
                    <div className="fact"><dt>Loan</dt><dd>{data.loanType}</dd></div>
                    <div className="fact"><dt>Reference</dt><dd className="mono" style={{ fontSize: 13 }}>{data.loanId}</dd></div>
                    <div className="fact">
                        <dt>Progress</dt>
                        <dd className="tnum">{complete} of {total}</dd>
                        <div className="track ok" style={{ marginTop: 6 }}><i style={{ width: `${pct}%` }} /></div>
                    </div>
                </dl>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {data.documents.map((doc, i) => {
                        const k = keyOf(doc);
                        const done = isDone(doc);
                        const check = checks[k];
                        const sample = SAMPLES[doc.docType];
                        const canDigi = DIGILOCKER_DOCS.includes(doc.docType);
                        const canAa = AA_DOCS.includes(doc.docType);
                        const showOverride = !done && ((check && !check.valid) || (doc.status === 'rejected' && !check));
                        const side = sampleSide[k] ?? 0;

                        return (
                            <section className={`doc-card ${done ? 'done' : ''}`} key={k}>
                                <div className="doc-card-head">
                                    <span className="doc-step">{done ? <Icon name="check" size={13} strokeWidth={2.6} /> : i + 1}</span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <h3>{docLabel(doc)}</h3>
                                        {!done && <div style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>{DOC_MAP[doc.docType]?.hint || 'Photo or PDF'}</div>}
                                    </div>
                                    {done
                                        ? <Pill status="validated">Verified</Pill>
                                        : doc.status === 'rejected' && <Pill status="rejected">Try again</Pill>}
                                </div>

                                {!done && (
                                    <div className="doc-card-body">
                                        {doc.adminComment && (
                                            <Notice tone="info" icon="info" title="From your loan officer">{doc.adminComment}</Notice>
                                        )}

                                        {doc.status === 'rejected' && doc.validationResult && !check && (
                                            <Notice tone="bad" title="Your last upload was not accepted">{doc.validationResult.message}</Notice>
                                        )}

                                        {sample && (
                                            <details className="disclosure">
                                                <summary>
                                                    <Icon name="idCard" size={15} />
                                                    See what a good {docLabel(doc)} looks like
                                                    <Icon name="chevronDown" size={15} className="chev" />
                                                </summary>
                                                <div className="disclosure-body">
                                                    {sample.sides.length > 1 && (
                                                        <div className="sample-tabs" role="tablist">
                                                            {sample.sides.map((s, si) => (
                                                                <button key={si} role="tab" aria-selected={side === si}
                                                                    onClick={() => setSampleSide(p => ({ ...p, [k]: si }))}>{s.label}</button>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img className="sample-img" src={sample.sides[side].src} alt={`Example ${docLabel(doc)} — ${sample.sides[side].label}`} />
                                                    <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 7 }}>{sample.sides[side].tip}</div>
                                                    <ul className="tips">{sample.tips.map((t, ti) => <li key={ti}>{t}</li>)}</ul>
                                                </div>
                                            </details>
                                        )}

                                        {busy[k] ? (
                                            <div className="dropzone" style={{ cursor: 'default' }}>
                                                <Icon name="loader" size={20} className="spin" />
                                                <strong>Checking your document</strong>
                                                <span>Reading the text to confirm it is the right one…</span>
                                            </div>
                                        ) : (canDigi || canAa) ? (
                                            <div className="methods">
                                                {canDigi && (
                                                    <button className="method rec" onClick={openDigi}>
                                                        <span className="method-flag"><Pill status="validated" icon="sparkle">Fastest</Pill></span>
                                                        <span className="m-icon"><Icon name="shield" size={16} /></span>
                                                        <h4>Fetch from DigiLocker</h4>
                                                        <p>Government-issued copy. Verified instantly.</p>
                                                    </button>
                                                )}
                                                {canAa && (
                                                    <button className="method rec" onClick={() => setAa({ step: 1, docKey: k, bank: null, id: '', consent: false })}>
                                                        <span className="method-flag"><Pill status="validated" icon="sparkle">Fastest</Pill></span>
                                                        <span className="m-icon"><Icon name="bank" size={16} /></span>
                                                        <h4>Fetch from your bank</h4>
                                                        <p>Over the RBI Account Aggregator network.</p>
                                                    </button>
                                                )}
                                                <label className="method" style={{ cursor: 'pointer' }}>
                                                    <span className="m-icon"><Icon name="upload" size={16} /></span>
                                                    <h4>Upload a file</h4>
                                                    <p>Photo or PDF from this device.</p>
                                                    <input type="file" accept="image/*,.pdf" className="sr-only"
                                                        onChange={e => upload(doc, e.target.files[0])} />
                                                </label>
                                            </div>
                                        ) : (
                                            <label
                                                className={`dropzone ${dragging === k ? 'over' : ''}`}
                                                onDragOver={e => { e.preventDefault(); setDragging(k); }}
                                                onDragLeave={() => setDragging(null)}
                                                onDrop={e => { e.preventDefault(); setDragging(null); upload(doc, e.dataTransfer.files[0]); }}
                                            >
                                                <Icon name="upload" size={20} />
                                                <strong>Tap to choose a file</strong>
                                                <span>or drop it here — JPG, PNG or PDF</span>
                                                <input type="file" accept="image/*,.pdf" onChange={e => upload(doc, e.target.files[0])} />
                                            </label>
                                        )}

                                        {files[k] && !busy[k] && (
                                            <div className="well" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                                                <Icon name="paperclip" size={14} style={{ color: 'var(--ink-3)' }} />
                                                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{files[k].name}</span>
                                                <span style={{ color: 'var(--ink-3)' }} className="tnum">{(files[k].size / 1024).toFixed(0)} KB</span>
                                            </div>
                                        )}

                                        {check && !busy[k] && !check.valid && (
                                            <Notice tone="bad" title="We could not verify this">{check.message}</Notice>
                                        )}

                                        {showOverride && (
                                            override[k] === undefined ? (
                                                <Button icon="flag" onClick={() => setOverride(p => ({ ...p, [k]: '' }))}>
                                                    This is the right document — submit it anyway
                                                </Button>
                                            ) : (
                                                <div className="well" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                    <Field label="Tell the reviewer why" required htmlFor={`ov-${k}`}
                                                        hint="A person will read this and decide. It does not slow anything else down.">
                                                        <textarea id={`ov-${k}`} className="textarea" value={override[k]}
                                                            placeholder="e.g. This is my Aadhaar — the number is on the reverse, which I have also attached."
                                                            onChange={e => setOverride(p => ({ ...p, [k]: e.target.value }))} />
                                                    </Field>
                                                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                        <Button onClick={() => setOverride(p => ({ ...p, [k]: undefined }))} disabled={overriding[k]}>Cancel</Button>
                                                        <Button variant="primary" onClick={() => submitOverride(doc)}
                                                            loading={overriding[k]} disabled={!override[k]?.trim() || overriding[k]}>Submit for review</Button>
                                                    </div>
                                                </div>
                                            )
                                        )}

                                        <Field label="Anything we should know? (optional)" htmlFor={`note-${k}`}>
                                            <textarea id={`note-${k}`} className="textarea" style={{ minHeight: 52 }}
                                                value={notes[k] || ''} placeholder="Add a note for the reviewer"
                                                onChange={e => setNotes(p => ({ ...p, [k]: e.target.value }))} />
                                        </Field>
                                    </div>
                                )}

                                {done && (
                                    <div className="doc-card-body">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-2)' }}>
                                            <Icon name="checkCircle" size={15} style={{ color: 'var(--ok)' }} />
                                            <span>{check?.message || doc.validationResult?.message || 'Verified.'}</span>
                                        </div>
                                    </div>
                                )}
                            </section>
                        );
                    })}
                </div>
            </main>

            {/* ── Sticky submit ─────────────────────────────────────── */}
            <div className="portal-foot">
                <div className="portal-foot-in">
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }} className="tnum">{complete} of {total} verified</div>
                        <div className="track ok" style={{ marginTop: 5 }}><i style={{ width: `${pct}%` }} /></div>
                    </div>
                    <Button variant={complete === total ? 'ok' : ''} size="lg" icon="check"
                        disabled={complete !== total}
                        onClick={() => setSubmitted(true)}>
                        {complete === total ? 'Submit documents' : `${total - complete} left`}
                    </Button>
                </div>
            </div>

            {/* ── Voice assist ──────────────────────────────────────── */}
            <div className="assist">
                {assist.open ? (
                    <div className="assist-panel">
                        <div className="assist-head">
                            <span className="brand-mark" style={{ width: 26, height: 26, borderRadius: 7 }}><Icon name="sparkle" size={14} /></span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Guide</div>
                                <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
                                    Reads this page out loud
                                </div>
                            </div>
                            <Button size="sm" variant="ghost" className="btn-icon" icon="x" aria-label="Close guide"
                                onClick={() => { stopVoice(); setAssist(a => ({ ...a, open: false })); }} />
                        </div>
                        <div className="assist-body">
                            <div style={{ display: 'flex', gap: 6 }}>
                                {Object.entries(VOICES).map(([code, v]) => (
                                    <button key={code} className="choice radio" aria-pressed={assist.lang === code}
                                        style={{ flex: 1, padding: '7px 9px' }}
                                        onClick={() => {
                                            stopVoice();
                                            setAssist(a => ({ ...a, lang: code, missing: false }));
                                            previewVoice(code);
                                        }}>
                                        <span className="tick"><Icon name="check" size={11} strokeWidth={2.6} /></span>
                                        <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{v.name}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Speaking indicator — progress only. This is text-to-speech;
                                printing the words the voice is saying would be noise. */}
                            {assist.playing && (
                                <div className="assist-status" aria-live="off">
                                    <span className="eq" aria-hidden="true"><i /><i /><i /><i /></span>
                                    <span>Speaking</span>
                                    <span className="assist-progress" aria-hidden="true">
                                        <i style={{ width: `${((assist.at + 1) / Math.max(assist.total, 1)) * 100}%` }} />
                                    </span>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: 8 }}>
                                {assist.playing
                                    ? <Button className="btn-block" icon="pause" onClick={stopVoice}>Pause</Button>
                                    : <Button className="btn-block" variant="primary" icon="play" onClick={play}>Play guide</Button>}
                                <Button icon="rotate" aria-label="Start again" onClick={() => { stopVoice(); setTimeout(play, 60); }} />
                            </div>

                            {assist.missing && (
                                <div style={{ fontSize: 11.5, color: 'var(--ink-3)', display: 'flex', gap: 5 }}>
                                    <Icon name="info" size={13} style={{ marginTop: 1, flex: 'none' }} />
                                    <span>Some lines have no recording yet — run <code>npm run voices</code> to generate the {VOICES[assist.lang].name} voice pack.</span>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <button className="assist-fab" onClick={() => setAssist(a => ({ ...a, open: true }))}>
                        <Icon name="volume" size={16} />Need help?
                    </button>
                )}
            </div>

            {/* ══ DigiLocker ═══════════════════════════════════════════ */}
            <Modal
                open={!!digi} onClose={() => !digi?.working && setDigi(null)} width={470}
                title="DigiLocker"
                description="Meri Pehchaan single sign-on. We only receive the documents you tick."
                footer={
                    <>
                        {digi?.step > 1 && <Button onClick={() => setDigi(d => ({ ...d, step: d.step - 1 }))} disabled={digi?.working} icon="arrowLeft">Back</Button>}
                        {digi?.step === 1 && <Button variant="primary" disabled={(digi?.phone || '').length < 10} onClick={() => setDigi(d => ({ ...d, step: 2 }))}>Send OTP</Button>}
                        {digi?.step === 2 && <Button variant="primary" disabled={digi.otp.join('').length < 6} onClick={() => setDigi(d => ({ ...d, step: 3 }))}>Verify</Button>}
                        {digi?.step === 3 && (
                            <Button variant="primary" icon="shield" loading={digi.working}
                                disabled={digi.working || !Object.values(digi.pick).some(Boolean)}
                                onClick={runDigi}>
                                Share {Object.values(digi.pick).filter(Boolean).length} document{Object.values(digi.pick).filter(Boolean).length > 1 ? 's' : ''}
                            </Button>
                        )}
                    </>
                }
            >
                {digi && (
                    <>
                        <Stepper step={digi.step} total={3} labels={['Sign in', 'Verify', 'Consent']} />
                        <div style={{ marginTop: 18 }}>
                            {digi.step === 1 && (
                                <Field label="Mobile number registered with DigiLocker" htmlFor="digi-phone">
                                    <input id="digi-phone" className="input" type="tel" inputMode="numeric" maxLength={10}
                                        placeholder="10-digit number" value={digi.phone}
                                        onChange={e => setDigi(d => ({ ...d, phone: e.target.value.replace(/\D/g, '') }))} />
                                </Field>
                            )}
                            {digi.step === 2 && (
                                <>
                                    <p style={{ fontSize: 13, color: 'var(--ink-3)', textAlign: 'center', marginBottom: 14 }}>
                                        Enter the 6-digit code sent to ••••• {digi.phone.slice(-4)}
                                    </p>
                                    <div className="otp">
                                        {digi.otp.map((v, i) => (
                                            <input key={i} id={`otp-${i}`} inputMode="numeric" maxLength={1} value={v}
                                                aria-label={`Digit ${i + 1}`}
                                                onChange={e => {
                                                    const val = e.target.value.replace(/\D/g, '').slice(0, 1);
                                                    setDigi(d => { const o = [...d.otp]; o[i] = val; return { ...d, otp: o }; });
                                                    if (val && i < 5) document.getElementById(`otp-${i + 1}`)?.focus();
                                                }}
                                                onKeyDown={e => { if (e.key === 'Backspace' && !digi.otp[i] && i > 0) document.getElementById(`otp-${i - 1}`)?.focus(); }} />
                                        ))}
                                    </div>
                                    <p style={{ fontSize: 12.5, color: 'var(--ink-3)', textAlign: 'center', marginTop: 12 }}>Valid for 10 minutes.</p>
                                </>
                            )}
                            {digi.step === 3 && (
                                <>
                                    <div style={{ display: 'grid', gap: 8 }}>
                                        {digiPending().map(d => (
                                            <button key={d.docType} className="choice" aria-pressed={!!digi.pick[d.docType]}
                                                onClick={() => setDigi(x => ({ ...x, pick: { ...x.pick, [d.docType]: !x.pick[d.docType] } }))}>
                                                <span className="tick"><Icon name="check" size={11} strokeWidth={2.6} /></span>
                                                <Icon name={docIcon(d)} size={16} style={{ color: digi.pick[d.docType] ? 'var(--accent)' : 'var(--ink-3)' }} />
                                                <span style={{ fontWeight: 550, color: 'var(--ink)' }}>{docLabel(d)}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <p style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 12 }}>
                                        Consent lasts 31 days and covers this loan application only.
                                    </p>
                                </>
                            )}
                        </div>
                    </>
                )}
            </Modal>

            {/* ══ Account Aggregator ═══════════════════════════════════ */}
            <Modal
                open={!!aa} onClose={() => !aa?.working && setAa(null)} width={470}
                title="Fetch from your bank"
                description="RBI Account Aggregator. Your bank sends the statement directly — we never see your login."
                footer={
                    <>
                        {aa?.step > 1 && <Button onClick={() => setAa(a => ({ ...a, step: a.step - 1 }))} disabled={aa?.working} icon="arrowLeft">Back</Button>}
                        {aa?.step === 1 && <Button variant="primary" disabled={!aa.bank} onClick={() => setAa(a => ({ ...a, step: 2 }))}>Continue</Button>}
                        {aa?.step === 2 && <Button variant="primary" disabled={!aa.id.trim()} onClick={() => setAa(a => ({ ...a, step: 3 }))}>Continue</Button>}
                        {aa?.step === 3 && (
                            <Button variant="primary" icon="bank" loading={aa.working} disabled={!aa.consent || aa.working} onClick={runAa}>
                                Approve &amp; fetch
                            </Button>
                        )}
                    </>
                }
            >
                {aa && (
                    <>
                        <Stepper step={aa.step} total={3} labels={['Bank', 'Identify', 'Consent']} />
                        <div style={{ marginTop: 18 }}>
                            {aa.step === 1 && (
                                <div className="choice-grid">
                                    {BANKS.map(b => (
                                        <button key={b.id} className="choice radio" aria-pressed={aa.bank === b.id}
                                            onClick={() => setAa(a => ({ ...a, bank: b.id }))}>
                                            <span className="tick"><Icon name="check" size={11} strokeWidth={2.6} /></span>
                                            <Icon name="bank" size={16} style={{ color: aa.bank === b.id ? 'var(--accent)' : 'var(--ink-3)' }} />
                                            <span style={{ fontWeight: 550, color: 'var(--ink)' }}>{b.name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {aa.step === 2 && (
                                <>
                                    <Notice tone="info" icon="lock" title="Sandbox journey">
                                        This prototype does not connect to a real bank. In production your bank authenticates you on
                                        its own page — no password is ever typed here.
                                    </Notice>
                                    <div style={{ marginTop: 14 }}>
                                        <Field label="Registered mobile or customer ID" htmlFor="aa-id"
                                            hint="Used only to look up which accounts your bank can share.">
                                            <input id="aa-id" className="input" value={aa.id}
                                                placeholder="e.g. 98765 43210"
                                                onChange={e => setAa(a => ({ ...a, id: e.target.value }))} />
                                        </Field>
                                    </div>
                                </>
                            )}
                            {aa.step === 3 && (
                                <>
                                    <dl className="facts">
                                        <div className="fact"><dt>Data</dt><dd>Bank statement</dd></div>
                                        <div className="fact"><dt>Period</dt><dd>Last 6 months</dd></div>
                                        <div className="fact"><dt>Purpose</dt><dd>Loan processing</dd></div>
                                        <div className="fact"><dt>Validity</dt><dd>One-time</dd></div>
                                    </dl>
                                    <button className="choice" aria-pressed={aa.consent} style={{ marginTop: 12, alignItems: 'flex-start' }}
                                        onClick={() => setAa(a => ({ ...a, consent: !a.consent }))}>
                                        <span className="tick" style={{ marginTop: 1 }}><Icon name="check" size={11} strokeWidth={2.6} /></span>
                                        <span style={{ fontSize: 13, textAlign: 'left' }}>
                                            I agree to share the statement described above, once, for this loan application.
                                        </span>
                                    </button>
                                </>
                            )}
                        </div>
                    </>
                )}
            </Modal>

            {toasts}
        </div>
    );
}

function Shell({ children }) {
    return (
        <div className="portal">
            <header className="portal-bar">
                <div className="portal-bar-in">
                    <span className="brand-mark"><Icon name="shield" size={17} strokeWidth={1.9} /></span>
                    <span>
                        <span className="brand-name">SmartDoc</span>
                        <span className="brand-sub">Secure document upload</span>
                    </span>
                </div>
            </header>
            <main className="portal-wrap">{children}</main>
        </div>
    );
}

function Stepper({ step, total, labels }) {
    return (
        <>
            <div className="stepper">
                {Array.from({ length: total }).map((_, i) => (
                    <span key={i} style={{ display: 'contents' }}>
                        {i > 0 && <span className={`bar ${step > i ? 'done' : ''}`} />}
                        <span className={`s ${step === i + 1 ? 'on' : step > i + 1 ? 'done' : ''}`}>
                            {step > i + 1 ? <Icon name="check" size={11} strokeWidth={2.8} /> : i + 1}
                        </span>
                    </span>
                ))}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 7, textAlign: 'center' }}>
                Step {step} of {total} — {labels[step - 1]}
            </div>
        </>
    );
}
