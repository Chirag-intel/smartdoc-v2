'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import Icon, { CHANNEL_ICON } from '@/components/Icon';
import {
    Button, Pill, Modal, Notice, Field, Empty, CopyRow, useToasts,
    initials, fmtDate, fmtDateTime, relative, elapsed,
} from '@/components/ui';
import { CHANNELS, docLabel, docIcon } from '@/lib/docs';

const SOURCE_TAG = {
    digilocker: { label: 'DigiLocker', icon: 'shield', note: 'Pulled from the government issuer — no OCR needed.' },
    account_aggregator: { label: 'Account Aggregator', icon: 'bank', note: 'Pulled from the bank over the RBI AA network.' },
};

export default function CaseDetailPage({ params }) {
    const { id } = use(params);
    const router = useRouter();
    const [toasts, toast] = useToasts();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // send / remind / retrigger dialog
    const [dialog, setDialog] = useState(null);      // { mode: 'send'|'remind'|'retrigger', doc? }
    const [channels, setChannels] = useState(['email']);
    const [remark, setRemark] = useState('');
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState(null);

    // reject-override dialog
    const [revoke, setRevoke] = useState(null);
    const [revokeReason, setRevokeReason] = useState('');
    const [revoking, setRevoking] = useState(false);

    const load = useCallback(async () => {
        setRefreshing(true);
        try {
            const json = await (await fetch(`/api/cases/${id}`)).json();
            if (json.case) setData(json.case);
        } catch { /* keep last good data */ }
        finally { setRefreshing(false); }
    }, [id]);

    // Initial fetch. Also honours ?send_link=1 from the create flow, once the
    // case is in hand, so the dialog opens against real data.
    useEffect(() => {
        let alive = true;
        fetch(`/api/cases/${id}`)
            .then(r => r.json())
            .then(json => {
                if (!alive) return;
                if (json.case) setData(json.case);
                const q = new URLSearchParams(window.location.search);
                if (q.get('send_link') || q.get('remind')) {
                    setDialog({ mode: q.get('remind') ? 'remind' : 'send' });
                    window.history.replaceState({}, '', window.location.pathname);
                }
            })
            .catch(() => { /* falls through to the not-found state */ })
            .finally(() => { if (alive) setLoading(false); });
        return () => { alive = false; };
    }, [id]);

    const openDialog = (mode, doc) => {
        setDialog({ mode, doc });
        setResult(null);
        setRemark(doc?.validationResult?.rejectedOverride
            ? `The manual override was revoked. Please re-upload your ${docLabel(doc)}.`
            : '');
        setChannels(prev => prev.length ? prev : ['email']);
    };


    const toggleChannel = (ch) =>
        setChannels(prev => prev.includes(ch)
            ? (prev.length === 1 ? prev : prev.filter(c => c !== ch))
            : [...prev, ch]);

    const send = async () => {
        const { mode, doc } = dialog;
        setSending(true);
        try {
            const retrigger = mode === 'retrigger';
            const res = await fetch(`/api/cases/${id}/${retrigger ? 'retrigger' : 'send-link'}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(retrigger
                    ? { channels, docId: doc.id || doc.docType, remark }
                    : { channels, reminder: mode === 'remind', remark }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error || 'Request failed');
            setResult(json);
            toast('success', `${retrigger ? 'Re-upload request' : mode === 'remind' ? 'Reminder' : 'Upload link'} sent via ${json.channels.map(c => c.toUpperCase()).join(', ')}.`);
            load();
        } catch (err) {
            toast('error', `Could not send — ${err.message}`);
        } finally { setSending(false); }
    };

    const remindToken = async (token) => {
        try {
            const res = await fetch(`/api/cases/${id}/remind-link`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error || 'Request failed');
            toast('success', `Reminder sent via ${json.channels.map(c => c.toUpperCase()).join(', ')}.`);
            load();
        } catch (err) { toast('error', `Could not send the reminder — ${err.message}`); }
    };

    const confirmRevoke = async () => {
        setRevoking(true);
        try {
            const res = await fetch(`/api/cases/${id}/reject-override`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ docId: revoke.id || revoke.docType, reason: revokeReason.trim() }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error || 'Request failed');
            toast('success', `Override revoked — ${docLabel(revoke)} is back to Rejected.`);
            setRevoke(null); setRevokeReason('');
            load();
        } catch (err) { toast('error', `Could not revoke — ${err.message}`); }
        finally { setRevoking(false); }
    };

    /* ── Loading / not found ─────────────────────────────────────── */
    if (loading) {
        return (
            <AppShell crumbs={[{ label: 'Pendency queue', href: '/' }, { label: 'Loading…' }]}>
                <div className="page">
                    <div className="skel" style={{ width: 240, height: 24, marginBottom: 10 }} />
                    <div className="skel" style={{ width: 340, height: 14, marginBottom: 24 }} />
                    <div className="skel" style={{ height: 92, borderRadius: 14, marginBottom: 20 }} />
                    <div className="cols">
                        <div className="skel" style={{ height: 320, borderRadius: 14 }} />
                        <div className="skel" style={{ height: 240, borderRadius: 14 }} />
                    </div>
                </div>
            </AppShell>
        );
    }

    if (!data) {
        return (
            <AppShell crumbs={[{ label: 'Pendency queue', href: '/' }, { label: 'Not found' }]}>
                <div className="page">
                    <div className="panel">
                        <Empty icon="search" title="That case no longer exists"
                            actions={<Link href="/" className="btn btn-primary"><Icon name="arrowLeft" size={15} />Back to the queue</Link>}>
                            It may have been removed, or the link you followed is out of date.
                        </Empty>
                    </div>
                </div>
            </AppShell>
        );
    }

    const docs = data.pendingDocuments;
    const done = docs.filter(d => d.status === 'validated').length;
    const failed = docs.filter(d => d.status === 'rejected').length;
    const waiting = docs.filter(d => d.status === 'pending').length;
    const pct = docs.length ? Math.round((done / docs.length) * 100) : 0;
    const liveLinks = data.links.filter(l => l.status !== 'expired');
    const canRemind = liveLinks.length > 0 && (data.status === 'pending' || data.status === 'partial' || data.status === 'rejected');

    const dialogTitle = dialog?.mode === 'retrigger' ? 'Request a re-upload'
        : dialog?.mode === 'remind' ? 'Send a reminder' : 'Send upload link';

    return (
        <AppShell
            crumbs={[{ label: 'Pendency queue', href: '/' }, { label: data.customerName }]}
            actions={
                <>
                    <Button size="sm" icon="refresh" onClick={load} loading={refreshing}>Refresh</Button>
                    {/* The primary button is whatever moves the case forward right now. */}
                    {canRemind ? (
                        <>
                            <Button size="sm" icon="link" onClick={() => openDialog('send')}>New link</Button>
                            <Button size="sm" variant="primary" icon="bell" onClick={() => openDialog('remind')}>Remind</Button>
                        </>
                    ) : (
                        <Button size="sm" variant="primary" icon="link"
                            disabled={waiting + failed === 0}
                            onClick={() => openDialog('send')}>Send link</Button>
                    )}
                </>
            }
        >
            <div className="page">
                <div className="page-head">
                    <div style={{ display: 'flex', gap: 13, alignItems: 'center', minWidth: 0 }}>
                        <span className="avatar" style={{ width: 40, height: 40, fontSize: 14 }}>{initials(data.customerName)}</span>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                                <h1>{data.customerName}</h1>
                                <Pill status={data.status} />
                            </div>
                            <p className="lede">
                                <span className="mono">{data.loanId}</span> · {data.loanType} · {data.customerType} ·
                                raised {fmtDate(data.createdAt)} ({elapsed(data.createdAt, data.completedAt)} {data.completedAt ? 'to close' : 'open'})
                            </p>
                        </div>
                    </div>
                </div>

                {(() => {
                    const rejectedDocs = docs.filter(d => d.status === 'rejected');
                    const lastLink = liveLinks[liveLinks.length - 1];
                    let step;
                    if (docs.length && done === docs.length) {
                        step = { tone: 'ok', icon: 'checkCircle', title: 'All documents verified',
                            text: `Nothing left to collect${data.completedAt ? ` — closed ${fmtDate(data.completedAt)}` : ''}.` };
                    } else if (rejectedDocs.length === 1) {
                        step = { tone: 'bad', icon: 'alert', title: `${docLabel(rejectedDocs[0])} was rejected`,
                            text: rejectedDocs[0].validationResult?.message || 'The upload did not pass validation.',
                            action: <Button variant="primary" icon="rotate" onClick={() => openDialog('retrigger', rejectedDocs[0])}>Re-request it</Button> };
                    } else if (rejectedDocs.length > 1) {
                        step = { tone: 'bad', icon: 'alert', title: `${rejectedDocs.length} documents were rejected`,
                            text: `${rejectedDocs.map(docLabel).join(', ')}. A fresh link lets ${data.customerName.split(' ')[0]} upload them all again.`,
                            action: <Button variant="primary" icon="link" onClick={() => openDialog('send')}>Send a fresh link</Button> };
                    } else if (lastLink) {
                        step = { tone: 'wait', icon: 'clock', title: `Waiting on ${data.customerName.split(' ')[0]}`,
                            text: `Link sent ${relative(lastLink.sentAt)} via ${liveLinks.map(l => l.channel).join(', ')}. ${waiting} document${waiting > 1 ? 's' : ''} still to come.`,
                            action: <Button variant="primary" icon="bell" onClick={() => openDialog('remind')}>Send a reminder</Button> };
                    } else {
                        step = { tone: 'wait', icon: 'link', title: 'No upload link sent yet',
                            text: `${data.customerName.split(' ')[0]} can't upload anything until they have a link.`,
                            action: <Button variant="primary" icon="link" onClick={() => openDialog('send')}>Send upload link</Button> };
                    }
                    return (
                        <div className={`next-step ${step.tone}`}>
                            <span className="ns-icon"><Icon name={step.icon} size={17} /></span>
                            <div className="ns-body">
                                <div className="ns-title">{step.title}</div>
                                <div className="ns-text">{step.text}</div>
                            </div>
                            {step.action}
                        </div>
                    );
                })()}

                <div className="metrics">
                    <div className="metric">
                        <div className="metric-top"><span className="metric-label">Collection progress</span></div>
                        <div className="metric-val tnum">{pct}<small>%</small></div>
                        <div className="track ok" style={{ marginTop: 8 }}><i style={{ width: `${pct}%` }} /></div>
                    </div>
                    <div className="metric">
                        <div className="metric-top"><span className="dot" style={{ background: 'var(--ok)' }} /><span className="metric-label">Validated</span></div>
                        <div className="metric-val tnum">{done}<small> / {docs.length}</small></div>
                    </div>
                    <div className="metric">
                        <div className="metric-top"><span className="dot" style={{ background: 'var(--bad)' }} /><span className="metric-label">Rejected</span></div>
                        <div className="metric-val tnum">{failed}</div>
                        <div className="metric-note">{failed ? 'needs a re-upload' : 'nothing blocked'}</div>
                    </div>
                    <div className="metric">
                        <div className="metric-top"><span className="dot" style={{ background: 'var(--pending)' }} /><span className="metric-label">Awaiting</span></div>
                        <div className="metric-val tnum">{waiting}</div>
                        <div className="metric-note">{liveLinks.length ? `${liveLinks.length} live link${liveLinks.length > 1 ? 's' : ''}` : 'no link sent yet'}</div>
                    </div>
                </div>

                <div className="cols">
                    {/* ── Checklist ─────────────────────────────────── */}
                    <section className="panel">
                        <div className="panel-head">
                            <Icon name="files" size={16} style={{ color: 'var(--ink-3)' }} />
                            <h2>Document checklist</h2>
                            <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }} className="tnum">{docs.length} requested</span>
                        </div>

                        {docs.map((doc, i) => {
                            const vr = doc.validationResult;
                            const src = vr?.source && SOURCE_TAG[vr.source];
                            return (
                                <div className="doc-row" key={doc.id || doc.docType || i}>
                                    <span className={`doc-icon ${doc.status}`}><Icon name={docIcon(doc)} size={16} /></span>

                                    <div className="doc-main">
                                        <div className="doc-title">
                                            <strong>{docLabel(doc)}</strong>
                                            {src && <Pill tone="accent" icon={src.icon}>{src.label}</Pill>}
                                            {vr?.bypassed && <Pill tone="pending" icon="flag">Manual override</Pill>}
                                        </div>

                                        <div className="doc-meta">
                                            {doc.status === 'pending' && 'Waiting on the applicant.'}
                                            {doc.status === 'uploaded' && `Uploaded — ${doc.uploadedFile}`}
                                            {(doc.status === 'validated' || doc.status === 'rejected') && vr?.message}
                                        </div>

                                        {doc.uploadedFile && (
                                            <div className="doc-meta" style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                                                <Icon name="paperclip" size={12} />
                                                <span className="mono">{doc.uploadedFile}</span>
                                                <span>· {src ? src.note : 'Uploaded manually by the applicant.'}</span>
                                            </div>
                                        )}

                                        {doc.adminComment && (
                                            <div className="doc-note"><b>Your note:</b> {doc.adminComment}</div>
                                        )}
                                        {doc.comment && (
                                            <div className="doc-note"><b>Applicant said:</b> &ldquo;{doc.comment}&rdquo;</div>
                                        )}
                                        {vr?.bypassed && vr?.bypassRemark && (
                                            <div className="doc-note"><b>Override reason:</b> {vr.bypassRemark}</div>
                                        )}
                                    </div>

                                    <div className="doc-side">
                                        <Pill status={doc.status} />
                                        {doc.uploadedFile && (
                                            <Button size="sm" icon="download"
                                                onClick={() => toast('success', `Preparing ${doc.uploadedFile} for download…`)}>File</Button>
                                        )}
                                        {doc.status === 'rejected' && (
                                            <Button size="sm" icon="rotate" onClick={() => openDialog('retrigger', doc)}>Re-request</Button>
                                        )}
                                        {vr?.bypassed && doc.status === 'validated' && (
                                            <Button size="sm" icon="xCircle" onClick={() => { setRevoke(doc); setRevokeReason(''); }}>Revoke</Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </section>

                    {/* ── Right rail ────────────────────────────────── */}
                    <div className="stack">
                        <section className="panel">
                            <div className="panel-head"><Icon name="user" size={16} style={{ color: 'var(--ink-3)' }} /><h2>Contact</h2></div>
                            <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <ContactRow icon="phone" label="Mobile" value={data.customerPhone || 'Not on file'} />
                                <ContactRow icon="mail" label="Email" value={data.customerEmail || 'Not on file'} />
                                <ContactRow icon="users" label="Type" value={data.customerType} />
                            </div>
                        </section>

                        <section className="panel">
                            <div className="panel-head">
                                <Icon name="link" size={16} style={{ color: 'var(--ink-3)' }} />
                                <h2>Upload links</h2>
                                {canRemind && <Button size="sm" icon="bell" onClick={() => openDialog('remind')}>Remind</Button>}
                            </div>
                            <div className="panel-body">
                                {data.links.length === 0 ? (
                                    <p style={{ fontSize: 13, color: 'var(--ink-3)' }}>
                                        No link sent yet. Sending one issues a fresh token and expires anything older.
                                    </p>
                                ) : (
                                    <div className="timeline">
                                        {[...data.links].reverse().map((l, i) => {
                                            const expired = l.status === 'expired';
                                            return (
                                                <div className={`tl-item ${expired ? 'off' : 'on'}`} key={l.id || i}>
                                                    <div className="tl-title">
                                                        <Icon name={CHANNEL_ICON[l.channel] || 'link'} size={13} style={{ color: 'var(--ink-3)' }} />
                                                        <span style={{ textTransform: 'capitalize' }}>{l.channel}</span>
                                                        {l.isRetrigger && <Pill tone="accent" icon="rotate">Re-request</Pill>}
                                                        <Pill tone={expired ? 'neutral' : 'completed'} icon={expired ? 'clock' : 'check'}>
                                                            {expired ? 'Expired' : 'Live'}
                                                        </Pill>
                                                    </div>
                                                    <div className="tl-meta">
                                                        Sent {fmtDateTime(l.sentAt)} · {relative(l.sentAt)}
                                                        {l.expiredAt && ` · expired ${relative(l.expiredAt)}`}
                                                    </div>
                                                    {l.isRetrigger && !expired && (
                                                        <div style={{ marginTop: 6 }}>
                                                            <Button size="sm" icon="bell" onClick={() => remindToken(l.token)}>Nudge this link</Button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </section>

                        <section className="panel">
                            <div className="panel-head"><Icon name="chat" size={16} style={{ color: 'var(--ink-3)' }} /><h2>Activity</h2></div>
                            <div className="panel-body">
                                {data.remarks.length === 0 ? (
                                    <p style={{ fontSize: 13, color: 'var(--ink-3)' }}>Nothing logged yet. Uploads, overrides and reminders all land here.</p>
                                ) : (
                                    <div className="timeline">
                                        {[...data.remarks].reverse().map((r, i) => (
                                            <div className="tl-item done" key={i}>
                                                <div className="tl-title">{r.author}</div>
                                                <div className="tl-meta">{fmtDateTime(r.createdAt)}</div>
                                                <div className="tl-body">{r.text}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            </div>

            {/* ══ Send / remind / re-request ══════════════════════════ */}
            <Modal
                open={!!dialog} onClose={() => setDialog(null)} title={dialogTitle}
                description={
                    dialog?.mode === 'retrigger'
                        ? `${docLabel(dialog.doc)} will be reset to pending and ${data.customerName} gets a fresh link.`
                        : dialog?.mode === 'remind'
                            ? `Nudge ${data.customerName} about the documents still outstanding.`
                            : `Issue a secure upload link for ${data.customerName}. Any older link stops working.`
                }
                footer={
                    <>
                        <Button onClick={() => setDialog(null)} disabled={sending}>{result ? 'Done' : 'Cancel'}</Button>
                        {!result && (
                            <Button variant="primary" onClick={send} loading={sending}
                                disabled={sending || !channels.length || (dialog?.mode === 'retrigger' && !remark.trim())}
                                icon={dialog?.mode === 'remind' ? 'bell' : dialog?.mode === 'retrigger' ? 'rotate' : 'link'}>
                                Send via {channels.length > 1 ? `${channels.length} channels` : channels[0]?.toUpperCase()}
                            </Button>
                        )}
                    </>
                }
            >
                {!result ? (
                    <>
                        <Field label="Channels" hint="Pick one or more. All of them carry the same link.">
                            <div style={{ display: 'grid', gap: 8 }}>
                                {CHANNELS.map(ch => {
                                    const detail = data[ch.field];
                                    const on = channels.includes(ch.id);
                                    return (
                                        <button type="button" key={ch.id} className="choice" aria-pressed={on}
                                            disabled={!detail} onClick={() => toggleChannel(ch.id)}
                                            style={!detail ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}>
                                            <span className="tick"><Icon name="check" size={11} strokeWidth={2.6} /></span>
                                            <Icon name={ch.icon} size={16} style={{ color: on ? 'var(--accent)' : 'var(--ink-3)' }} />
                                            <span style={{ minWidth: 0 }}>
                                                <span style={{ display: 'block', fontWeight: 550, color: 'var(--ink)' }}>{ch.label}</span>
                                                <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)' }}>{detail || 'no address on file'}</span>
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </Field>

                        {dialog?.mode !== 'retrigger' && (
                            <div className="well" style={{ marginTop: 14 }}>
                                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 7 }}>Still outstanding</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {docs.filter(d => d.status === 'pending' || d.status === 'rejected').map((d, i) => (
                                        <Pill key={i} status={d.status}>{docLabel(d)}</Pill>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div style={{ marginTop: 14 }}>
                            <Field
                                label={dialog?.mode === 'retrigger' ? 'Why are you asking again?' : 'Note to the applicant'}
                                required={dialog?.mode === 'retrigger'}
                                htmlFor="remark"
                                hint={dialog?.mode === 'retrigger' ? 'Included in the message so they know what to fix.' : 'Optional — appears in the message.'}
                            >
                                <textarea id="remark" className="textarea" value={remark} onChange={e => setRemark(e.target.value)}
                                    placeholder={dialog?.mode === 'retrigger'
                                        ? 'e.g. The Aadhaar scan was too blurry to read — please send a sharper photo.'
                                        : 'e.g. Please upload before Friday so we can close your file.'} />
                            </Field>
                        </div>
                    </>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <Notice tone="ok" title="Sent">
                            Delivered on {result.channels.map(c => c.toUpperCase()).join(', ')}. The previous link is now expired.
                        </Notice>
                        <Field label="Link" hint="Share manually if the applicant says nothing arrived.">
                            <CopyRow value={result.uploadUrl} />
                        </Field>
                        <div>
                            <div style={{ fontSize: 12.5, fontWeight: 550, color: 'var(--ink)', marginBottom: 7 }}>Message preview</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {result.notifications.map((n, i) => (
                                    <div className="well" key={i}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-3)', marginBottom: 5 }}>
                                            <Icon name={CHANNEL_ICON[n.channel] || 'link'} size={13} />
                                            <span style={{ textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.02em' }}>{n.channel}</span>
                                            <span>→ {n.recipient}</span>
                                        </div>
                                        <div style={{ fontSize: 13, color: 'var(--ink-2)', wordBreak: 'break-word' }}>{n.message}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* ══ Revoke manual override ═════════════════════════════ */}
            <Modal
                open={!!revoke} onClose={() => setRevoke(null)} width={480}
                title="Revoke manual override"
                description={revoke ? `${docLabel(revoke)} goes back to Rejected and ${data.customerName} will need to upload it again.` : ''}
                footer={
                    <>
                        <Button onClick={() => setRevoke(null)} disabled={revoking}>Cancel</Button>
                        <Button variant="danger" icon="xCircle" onClick={confirmRevoke}
                            loading={revoking} disabled={revoking || !revokeReason.trim()}>Revoke override</Button>
                    </>
                }
            >
                {revoke?.validationResult?.bypassReason && (
                    <div className="well" style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 3 }}>Reason given when it was overridden</div>
                        <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>{revoke.validationResult.bypassReason}</div>
                    </div>
                )}
                <Field label="Why are you revoking it?" required htmlFor="revoke-reason"
                    error={revokeReason.trim() ? null : 'A reason is required — it is logged and shown to the applicant.'}>
                    <textarea id="revoke-reason" className="textarea" value={revokeReason}
                        aria-invalid={!revokeReason.trim()}
                        onChange={e => setRevokeReason(e.target.value)}
                        placeholder="e.g. The physical copy did not match on second inspection." />
                </Field>
            </Modal>

            {toasts}
        </AppShell>
    );
}

function ContactRow({ icon, label, value }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13 }}>
            <Icon name={icon} size={15} style={{ color: 'var(--ink-3)' }} />
            <span style={{ color: 'var(--ink-3)' }}>{label}</span>
            <span style={{ marginLeft: 'auto', color: 'var(--ink)', fontWeight: 550, textAlign: 'right', minWidth: 0, wordBreak: 'break-word' }}>{value}</span>
        </div>
    );
}
