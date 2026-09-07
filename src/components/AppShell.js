'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import Icon from './Icon';

const NAV = [
    { group: 'Workspace', items: [
        { href: '/', icon: 'dashboard', label: 'Pendency queue' },
        { href: '/cases/new', icon: 'plus', label: 'New case' },
    ] },
];

export default function AppShell({ crumbs = [], actions, children }) {
    const pathname = usePathname();
    const [navOpen, setNavOpen] = useState(false);

    return (
        <div className="shell">
            {navOpen && <div className="nav-scrim" onClick={() => setNavOpen(false)} />}

            <aside className="sidebar" data-open={navOpen} aria-label="Primary">
                <Link href="/" className="brand">
                    <span className="brand-mark"><Icon name="shield" size={17} strokeWidth={1.9} /></span>
                    <span>
                        <span className="brand-name">SmartDoc</span>
                        <span className="brand-sub">Pendency console</span>
                    </span>
                </Link>

                <nav>
                    {NAV.map(g => (
                        <div className="nav-group" key={g.group}>
                            <div className="nav-label">{g.group}</div>
                            {g.items.map(it => (
                                <Link
                                    key={it.href} href={it.href}
                                    className={`nav-item ${pathname === it.href ? 'active' : ''}`}
                                    aria-current={pathname === it.href ? 'page' : undefined}
                                    onClick={() => setNavOpen(false)}
                                >
                                    <Icon name={it.icon} size={16} />
                                    {it.label}
                                </Link>
                            ))}
                        </div>
                    ))}
                </nav>

                <div className="sidebar-foot">
                    <div className="env"><span className="env-dot" />UAT environment</div>
                    <div className="nav-item" style={{ cursor: 'default' }}>
                        <span className="avatar" style={{ width: 24, height: 24, fontSize: 9.5 }}>OP</span>
                        <span style={{ minWidth: 0 }}>
                            <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>Ops desk</span>
                            <span style={{ display: 'block', fontSize: 11, color: 'var(--ink-3)' }}>Credit operations</span>
                        </span>
                    </div>
                </div>
            </aside>

            <div className="main">
                <header className="topbar">
                    <button
                        className="btn btn-ghost btn-icon btn-sm nav-toggle"
                        onClick={() => setNavOpen(v => !v)}
                        aria-label="Toggle navigation" aria-expanded={navOpen}
                    >
                        <Icon name="menu" size={17} />
                    </button>

                    <nav className="crumbs" aria-label="Breadcrumb">
                        {crumbs.map((c, i) => (
                            <span key={i} style={{ display: 'contents' }}>
                                {i > 0 && <Icon name="chevronRight" size={13} className="sep" />}
                                {c.href
                                    ? <Link href={c.href}>{c.label}</Link>
                                    : <span className="cur">{c.label}</span>}
                            </span>
                        ))}
                    </nav>

                    {actions && <div className="topbar-actions">{actions}</div>}
                </header>

                {children}
            </div>
        </div>
    );
}
