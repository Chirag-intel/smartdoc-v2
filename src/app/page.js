'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import Icon from '@/components/Icon';
import { Button, Pill, Empty, initials, fmtDate, fmtTime, elapsed } from '@/components/ui';

const FILTERS = [
    { id: 'all',       label: 'All' },
    { id: 'pending',   label: 'Pending' },
    { id: 'partial',   label: 'In progress' },
    { id: 'rejected',  label: 'Needs action' },
    { id: 'completed', label: 'Completed' },
];

function SkeletonRows() {
    return Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} style={{ cursor: 'default' }}>
            <td><div className="skel" style={{ width: 96, height: 13 }} /></td>
            <td>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div className="skel" style={{ width: 28, height: 28, borderRadius: '50%' }} />
                    <div>
                        <div className="skel" style={{ width: 116, height: 12, marginBottom: 5 }} />
                        <div className="skel" style={{ width: 84, height: 10 }} />
                    </div>
                </div>
            </td>
            <td><div className="skel" style={{ width: 88, height: 13 }} /></td>
            <td><div className="skel" style={{ width: 110, height: 13 }} /></td>
            <td><div className="skel" style={{ width: 78, height: 21, borderRadius: 20 }} /></td>
            <td><div className="skel" style={{ width: 70, height: 13 }} /></td>
            <td><div className="skel" style={{ width: 54, height: 24, marginLeft: 'auto' }} /></td>
        </tr>
    ));
}

export default function QueuePage() {
    const router = useRouter();
    const [data, setData] = useState({ cases: [], stats: {} });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');

    // Initial fetch: state lands in the promise continuation, never synchronously.
    useEffect(() => {
        let alive = true;
        fetch('/api/cases')
            .then(r => r.json())
            .then(json => { if (alive) setData(json); })
            .catch(() => { /* keep the empty shell; the retry button re-fetches */ })
            .finally(() => { if (alive) setLoading(false); });
        return () => { alive = false; };
    }, []);

    const refresh = useCallback(async () => {
        setRefreshing(true);
        try { setData(await (await fetch('/api/cases')).json()); }
        catch { /* keep last good data */ }
        finally { setRefreshing(false); }
    }, []);

    const counts = useMemo(() => {
        const c = { all: data.cases.length };
        FILTERS.slice(1).forEach(f => { c[f.id] = data.cases.filter(x => x.status === f.id).length; });
        return c;
    }, [data.cases]);

    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();
        return data.cases.filter(c => {
            const hit = !q
                || c.customerName.toLowerCase().includes(q)
                || c.loanId.toLowerCase().includes(q)
                || (c.customerEmail || '').toLowerCase().includes(q)
                || (c.customerPhone || '').includes(q);
            return hit && (filter === 'all' || c.status === filter);
        });
    }, [data.cases, search, filter]);

    const s = data.stats || {};
    const openCases = (s.pending || 0) + (s.partial || 0);
    const docPct = s.totalDocs ? Math.round((s.collectedDocs / s.totalDocs) * 100) : 0;

    return (
        <AppShell
            crumbs={[{ label: 'Pendency queue' }]}
            actions={
                <>
                    <Button size="sm" icon="refresh" onClick={refresh} loading={refreshing}>Refresh</Button>
                    <Link href="/cases/new" className="btn btn-primary btn-sm"><Icon name="plus" size={15} />New case</Link>
                </>
            }
        >
            <div className="page">
                <div className="page-head">
                    <div>
                        <h1>Pendency queue</h1>
                        <p className="lede">Every open document request, and what each one is waiting on.</p>
                    </div>
                </div>

                <div className="metrics">
                    <div className="metric">
                        <div className="metric-top"><span className="metric-label">Open cases</span></div>
                        <div className="metric-val tnum">{openCases}</div>
                        <div className="metric-note">of {s.total || 0} total</div>
                    </div>
                    <div className="metric">
                        <div className="metric-top">
                            <span className="dot" style={{ background: 'var(--pending)' }} />
                            <span className="metric-label">Awaiting customer</span>
                        </div>
                        <div className="metric-val tnum">{s.pending || 0}</div>
                        <div className="metric-note">no document received yet</div>
                    </div>
                    <div className="metric">
                        <div className="metric-top">
                            <span className="dot" style={{ background: 'var(--bad)' }} />
                            <span className="metric-label">Needs action</span>
                        </div>
                        <div className="metric-val tnum">{s.rejected || 0}</div>
                        <div className="metric-note">validation failed or overridden</div>
                    </div>
                    <div className="metric">
                        <div className="metric-top">
                            <span className="dot" style={{ background: 'var(--ok)' }} />
                            <span className="metric-label">Documents collected</span>
                        </div>
                        <div className="metric-val tnum">{s.collectedDocs || 0}<small> / {s.totalDocs || 0}</small></div>
                        <div className="track ok" style={{ marginTop: 7 }}><i style={{ width: `${docPct}%` }} /></div>
                    </div>
                    <div className="metric">
                        <div className="metric-top"><span className="metric-label">Completed</span></div>
                        <div className="metric-val tnum">{s.completed || 0}</div>
                        <div className="metric-note">fully verified cases</div>
                    </div>
                </div>

                <div className="toolbar">
                    <div className="search">
                        <Icon name="search" size={15} />
                        <input
                            className="input" type="search" value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search name, loan ID, phone or email"
                            aria-label="Search cases"
                        />
                    </div>
                    <div className="segment" role="group" aria-label="Filter by status">
                        {FILTERS.map(f => (
                            <button
                                key={f.id} aria-pressed={filter === f.id}
                                onClick={() => setFilter(f.id)}
                            >
                                {f.label}<span className="n">{counts[f.id] ?? 0}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="panel">
                    <div className="table-wrap">
                        <table className="data">
                            <thead>
                                <tr>
                                    <th scope="col">Loan ID</th>
                                    <th scope="col">Applicant</th>
                                    <th scope="col">Product</th>
                                    <th scope="col">Documents</th>
                                    <th scope="col">Status</th>
                                    <th scope="col">Raised</th>
                                    <th scope="col"><span className="sr-only">Open</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? <SkeletonRows /> : rows.map(c => {
                                    return (
                                        <tr
                                            key={c.id} tabIndex={0}
                                            onClick={() => router.push(`/cases/${c.id}`)}
                                            onKeyDown={e => e.key === 'Enter' && router.push(`/cases/${c.id}`)}
                                        >
                                            <td><span className="mono cell-strong">{c.loanId}</span></td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                                    <span className="avatar">{initials(c.customerName)}</span>
                                                    <span style={{ minWidth: 0 }}>
                                                        <span className="cell-strong" style={{ display: 'block' }}>{c.customerName}</span>
                                                        <span className="cell-sub">{c.customerEmail || c.customerPhone}</span>
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                <div>{c.loanType}</div>
                                                <div className="cell-sub">{c.customerType}</div>
                                            </td>
                                            <td style={{ minWidth: 132 }}>
                                                <div className="cell-strong tnum" style={{ fontSize: 13, marginBottom: 5 }}>
                                                    {c.completedDocs}<span style={{ color: 'var(--ink-3)', fontWeight: 500 }}> / {c.totalDocs} verified</span>
                                                </div>
                                                <div className="seg" aria-hidden="true">
                                                    {Array.from({ length: c.totalDocs }).map((_, i) => (
                                                        <i key={i} className={i < c.completedDocs ? 'ok' : (c.status === 'rejected' && i < c.completedDocs + 1) ? 'bad' : 'wait'} />
                                                    ))}
                                                </div>
                                            </td>
                                            <td><Pill status={c.status} /></td>
                                            <td>
                                                <div className="tnum" style={{ fontSize: 13 }}>{fmtDate(c.createdAt)}</div>
                                                <div className="cell-sub tnum">{fmtTime(c.createdAt)} · {elapsed(c.createdAt, c.completedAt)} TAT</div>
                                            </td>
                                            <td>
                                                <Link
                                                    href={`/cases/${c.id}`} className="btn btn-sm"
                                                    onClick={e => e.stopPropagation()}
                                                >Open<Icon name="arrowRight" size={14} /></Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {!loading && rows.length === 0 && (
                        data.cases.length === 0 ? (
                            <Empty
                                icon="inbox" title="No cases yet"
                                actions={<Link href="/cases/new" className="btn btn-primary"><Icon name="plus" size={15} />Create the first case</Link>}
                            >
                                A case bundles one applicant with the documents you need from them. Create one, then send an
                                upload link over SMS, email or WhatsApp.
                            </Empty>
                        ) : (
                            <Empty
                                icon="search" title="Nothing matches those filters"
                                actions={<Button icon="rotate" onClick={() => { setSearch(''); setFilter('all'); }}>Clear filters</Button>}
                            >
                                {search ? <>No case matches <b>&ldquo;{search}&rdquo;</b>{filter !== 'all' && ' in this status'}.</> : 'No case is in this status right now.'}
                            </Empty>
                        )
                    )}
                </div>
            </div>
        </AppShell>
    );
}
