'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import Icon from '@/components/Icon';
import { Button, Field, Notice, useToasts } from '@/components/ui';
import { DOC_TYPES, LOAN_TYPES } from '@/lib/docs';

const newId = () => `doc_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

export default function NewCasePage() {
    const router = useRouter();
    const [toasts, toast] = useToasts();
    const [busy, setBusy] = useState(null);
    const [touched, setTouched] = useState(false);
    const [form, setForm] = useState({
        customerName: '', customerPhone: '', customerEmail: '',
        customerType: 'Customer', loanType: 'Personal Loan', loanId: '',
        pendingDocuments: [],
    });

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
    const docs = form.pendingDocuments;

    const toggleDoc = (type) => setForm(f => {
        const found = f.pendingDocuments.find(d => !d.isOther && d.docType === type.id);
        return {
            ...f,
            pendingDocuments: found
                ? f.pendingDocuments.filter(d => d !== found)
                : [...f.pendingDocuments, { id: newId(), docType: type.id, isOther: false, label: type.label, adminComment: '' }],
        };
    });

    const addOther = () => setForm(f => ({
        ...f,
        pendingDocuments: [...f.pendingDocuments, { id: newId(), docType: 'other', isOther: true, label: '', adminComment: '' }],
    }));

    const updateDoc = (id, k, v) => setForm(f => ({
        ...f, pendingDocuments: f.pendingDocuments.map(d => d.id === id ? { ...d, [k]: v } : d),
    }));

    const removeDoc = (id) => setForm(f => ({ ...f, pendingDocuments: f.pendingDocuments.filter(d => d.id !== id) }));

    const errors = {
        customerName: !form.customerName.trim() ? 'Enter the applicant name.' : null,
        customerPhone: !form.customerPhone.trim() ? 'A mobile number is required to send the link.' : null,
        docs: docs.length === 0 ? 'Pick at least one document to request.' : null,
        otherLabels: docs.some(d => d.isOther && !d.label.trim()) ? 'Name every custom document.' : null,
    };
    const firstError = Object.values(errors).find(Boolean);

    const submit = async (action) => {
        setTouched(true);
        if (firstError) { toast('error', firstError); return; }
        setBusy(action);
        try {
            const res = await fetch('/api/cases', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, loanId: form.loanId.trim() || `LN-${Date.now().toString().slice(-6)}` }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error || 'Request failed');
            toast('success', 'Case created.');
            router.push(action === 'send' ? `/cases/${json.case.id}?send_link=1` : `/cases/${json.case.id}`);
        } catch (err) {
            toast('error', `Could not create the case — ${err.message}`);
            setBusy(null);
        }
    };

    return (
        <AppShell crumbs={[{ label: 'Pendency queue', href: '/' }, { label: 'New case' }]}>
            <div className="page" style={{ maxWidth: 1100 }}>
                <div className="page-head">
                    <div>
                        <h1>New pendency case</h1>
                        <p className="lede">Tell us who the applicant is and what they still owe you. You can send the upload link right away.</p>
                    </div>
                </div>

                <div className="cols">
                    <div className="stack">
                        <section className="panel">
                            <div className="panel-head">
                                <Icon name="user" size={16} style={{ color: 'var(--ink-3)' }} />
                                <h2>Applicant</h2>
                            </div>
                            <div className="panel-body">
                                <Field label="Full name" required htmlFor="name" error={touched ? errors.customerName : null}>
                                    <input id="name" className="input" value={form.customerName} placeholder="e.g. Rajesh Kumar"
                                        aria-invalid={touched && !!errors.customerName}
                                        onChange={e => set('customerName', e.target.value)} />
                                </Field>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginTop: 14 }}>
                                    <Field label="Mobile number" required htmlFor="phone"
                                        error={touched ? errors.customerPhone : null}
                                        hint="Used for the SMS and WhatsApp link.">
                                        <input id="phone" className="input" type="tel" inputMode="tel" placeholder="+91 98765 43210"
                                            value={form.customerPhone} aria-invalid={touched && !!errors.customerPhone}
                                            onChange={e => set('customerPhone', e.target.value)} />
                                    </Field>
                                    <Field label="Email address" htmlFor="email" hint="Optional — enables the email channel.">
                                        <input id="email" className="input" type="email" placeholder="rajesh@example.com"
                                            value={form.customerEmail} onChange={e => set('customerEmail', e.target.value)} />
                                    </Field>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginTop: 14 }}>
                                    <Field label="Applicant type" htmlFor="ctype">
                                        <select id="ctype" className="select" value={form.customerType} onChange={e => set('customerType', e.target.value)}>
                                            <option>Customer</option><option>DSA</option><option>Connector</option>
                                        </select>
                                    </Field>
                                    <Field label="Loan product" htmlFor="ltype">
                                        <select id="ltype" className="select" value={form.loanType} onChange={e => set('loanType', e.target.value)}>
                                            {LOAN_TYPES.map(l => <option key={l}>{l}</option>)}
                                        </select>
                                    </Field>
                                    <Field label="Loan ID" htmlFor="lid" hint="Left blank, we generate one.">
                                        <input id="lid" className="input mono" placeholder="PL-2026-00142"
                                            value={form.loanId} onChange={e => set('loanId', e.target.value)} />
                                    </Field>
                                </div>
                            </div>
                        </section>

                        <section className="panel">
                            <div className="panel-head">
                                <Icon name="files" size={16} style={{ color: 'var(--ink-3)' }} />
                                <h2>Documents to request</h2>
                                <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }} className="tnum">{docs.length} selected</span>
                            </div>
                            <div className="panel-body">
                                <div className="choice-grid">
                                    {DOC_TYPES.map(t => {
                                        const on = docs.some(d => !d.isOther && d.docType === t.id);
                                        return (
                                            <button type="button" key={t.id} className="choice" aria-pressed={on} onClick={() => toggleDoc(t)}>
                                                <span className="tick"><Icon name="check" size={11} strokeWidth={2.6} /></span>
                                                <Icon name={t.icon} size={16} style={{ color: on ? 'var(--accent)' : 'var(--ink-3)' }} />
                                                <span style={{ minWidth: 0 }}>
                                                    <span style={{ display: 'block', fontWeight: 550, color: 'var(--ink)' }}>{t.label}</span>
                                                    <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.hint}</span>
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                                    <Button size="sm" icon="plus" onClick={addOther}>Add custom document</Button>
                                    {docs.length > 0 && <Button size="sm" variant="ghost" icon="rotate" onClick={() => set('pendingDocuments', [])}>Clear all</Button>}
                                </div>

                                {touched && errors.docs && <div style={{ marginTop: 12 }}><Notice tone="bad">{errors.docs}</Notice></div>}
                            </div>

                            {docs.length > 0 && (
                                <div className="panel-body">
                                    <h3 style={{ marginBottom: 4 }}>Checklist</h3>
                                    <p style={{ fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 12 }}>
                                        Add a note to any document and the applicant sees it on the upload page — the fastest way to prevent a re-upload.
                                    </p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {docs.map((d, i) => (
                                            <div key={d.id} className="well" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                                <span className="avatar" style={{ width: 22, height: 22, fontSize: 10.5, marginTop: 4 }}>{i + 1}</span>
                                                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
                                                    {d.isOther ? (
                                                        <input className="input" placeholder="Document name — e.g. Employer letter"
                                                            value={d.label} aria-label="Custom document name"
                                                            aria-invalid={touched && !d.label.trim()}
                                                            onChange={e => updateDoc(d.id, 'label', e.target.value)} />
                                                    ) : (
                                                        <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 13.5 }}>{d.label}</div>
                                                    )}
                                                    <input className="input" placeholder="Note for the applicant (optional) — e.g. last 3 months, both sides"
                                                        value={d.adminComment} aria-label={`Note for ${d.label || 'document'}`}
                                                        onChange={e => updateDoc(d.id, 'adminComment', e.target.value)} />
                                                </div>
                                                <Button size="sm" variant="ghost" className="btn-icon" aria-label={`Remove ${d.label || 'document'}`}
                                                    onClick={() => removeDoc(d.id)} icon="trash" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </section>
                    </div>

                    <aside className="stack" style={{ position: 'sticky', top: 73 }}>
                        <section className="panel">
                            <div className="panel-head"><h2>Summary</h2></div>
                            <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <Row k="Applicant" v={form.customerName || '—'} />
                                <Row k="Product" v={form.loanType} />
                                <Row k="Loan ID" v={form.loanId.trim() || 'auto-generated'} mono={!!form.loanId.trim()} />
                                <Row k="Documents" v={`${docs.length}`} />
                                <Row k="Channels ready" v={[form.customerPhone && 'SMS', form.customerPhone && 'WhatsApp', form.customerEmail && 'Email'].filter(Boolean).join(', ') || 'none yet'} />
                            </div>
                            <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <Button variant="primary" className="btn-block" icon="link"
                                    loading={busy === 'send'} disabled={!!busy}
                                    onClick={() => submit('send')}>Create &amp; send link</Button>
                                <Button className="btn-block" icon="check"
                                    loading={busy === 'save'} disabled={!!busy}
                                    onClick={() => submit('save')}>Save without sending</Button>
                                <Link href="/" className="btn btn-ghost btn-block">Cancel</Link>
                            </div>
                        </section>

                        <Notice tone="info" title="Validation runs on upload">
                            Each file is OCR-checked against the document type it was requested for. Mismatches come back as
                            <b> Needs action</b> instead of quietly landing in your queue.
                        </Notice>
                    </aside>
                </div>
            </div>
            {toasts}
        </AppShell>
    );
}

function Row({ k, v, mono }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
            <span style={{ color: 'var(--ink-3)' }}>{k}</span>
            <span className={mono ? 'mono' : ''} style={{ color: 'var(--ink)', fontWeight: 550, textAlign: 'right', minWidth: 0 }}>{v}</span>
        </div>
    );
}
