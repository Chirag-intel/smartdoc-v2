'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Icon from './Icon';

/* ── Status vocabulary ─────────────────────────────────────────── */
export const STATUS = {
    pending:   { label: 'Pending',   icon: 'clock' },
    partial:   { label: 'Partial',   icon: 'loader' },
    uploaded:  { label: 'Uploaded',  icon: 'upload' },
    validated: { label: 'Validated', icon: 'checkCircle' },
    completed: { label: 'Completed', icon: 'checkCircle' },
    rejected:  { label: 'Rejected',  icon: 'xCircle' },
    expired:   { label: 'Expired',   icon: 'clock' },
};

export function Pill({ status, children, tone, icon, className = '' }) {
    const meta = STATUS[status];
    const cls = tone || status || 'neutral';
    return (
        <span className={`pill ${cls} ${className}`}>
            {icon !== false && <Icon name={icon || meta?.icon || 'info'} size={12} />}
            {children || meta?.label || status}
        </span>
    );
}

/* ── Buttons ───────────────────────────────────────────────────── */
export function Button({ variant = '', size = '', icon, iconRight, loading, disabled, children, className = '', ...rest }) {
    // `loading` blocks input like `disabled` does, but keeps the button's own
    // colours so the label stays readable while the request is in flight.
    return (
        <button
            className={`btn ${variant ? 'btn-' + variant : ''} ${size ? 'btn-' + size : ''} ${loading ? 'is-loading' : ''} ${className}`}
            disabled={disabled || loading}
            aria-busy={loading || undefined}
            {...rest}
        >
            {loading
                ? <Icon name="loader" size={15} className="spin" />
                : icon && <Icon name={icon} size={15} />}
            {children}
            {iconRight && !loading && <Icon name={iconRight} size={15} />}
        </button>
    );
}

/* ── Toasts ────────────────────────────────────────────────────── */
export function useToasts() {
    const [items, setItems] = useState([]);
    const push = useCallback((type, message) => {
        const id = Math.random().toString(36).slice(2);
        setItems(p => [...p, { id, type, message }]);
        setTimeout(() => setItems(p => p.filter(t => t.id !== id)), 4200);
    }, []);
    const view = (
        <div className="toasts" role="status" aria-live="polite">
            {items.map(t => (
                <div key={t.id} className={`toast ${t.type}`}>
                    <Icon name={t.type === 'success' ? 'checkCircle' : t.type === 'error' ? 'xCircle' : 'info'} size={16} />
                    <span>{t.message}</span>
                </div>
            ))}
        </div>
    );
    return [view, push];
}

/* ── Modal (focus-trapped, esc to close, scroll-locked) ────────── */
export function Modal({ open, onClose, title, description, children, footer, width = 520, labelledBy = 'modal-title' }) {
    const ref = useRef(null);
    const closeRef = useRef(onClose);
    useEffect(() => { closeRef.current = onClose; });

    useEffect(() => {
        if (!open) return;
        const prevFocus = document.activeElement;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const node = ref.current;
        const focusables = () => node?.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
        ) || [];
        setTimeout(() => (focusables()[0] || node)?.focus(), 30);

        const onKey = (e) => {
            if (e.key === 'Escape') { e.stopPropagation(); closeRef.current?.(); return; }
            if (e.key !== 'Tab') return;
            const f = Array.from(focusables());
            if (!f.length) return;
            const first = f[0], last = f[f.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        };
        document.addEventListener('keydown', onKey, true);
        return () => {
            document.removeEventListener('keydown', onKey, true);
            document.body.style.overflow = prevOverflow;
            prevFocus?.focus?.();
        };
    }, [open]);

    if (!open) return null;
    return (
        <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
            <div
                className="modal" style={{ maxWidth: width }} ref={ref} tabIndex={-1}
                role="dialog" aria-modal="true" aria-labelledby={labelledBy}
            >
                <button className="btn btn-ghost btn-icon btn-sm modal-close" onClick={onClose} aria-label="Close dialog">
                    <Icon name="x" size={15} />
                </button>
                {(title || description) && (
                    <div className="modal-head">
                        {title && <h2 id={labelledBy}>{title}</h2>}
                        {description && <p>{description}</p>}
                    </div>
                )}
                <div className="modal-body">{children}</div>
                {footer && <div className="modal-foot">{footer}</div>}
            </div>
        </div>
    );
}

/* ── Notice ────────────────────────────────────────────────────── */
export function Notice({ tone = '', icon, title, children, className = '' }) {
    const fallback = { ok: 'checkCircle', bad: 'xCircle', warn: 'alert', info: 'info' }[tone] || 'info';
    return (
        <div className={`notice ${tone} ${className}`}>
            <Icon name={icon || fallback} size={16} />
            <div style={{ minWidth: 0 }}>
                {title && <strong>{title}</strong>}
                {children}
            </div>
        </div>
    );
}

/* ── Field ─────────────────────────────────────────────────────── */
export function Field({ label, hint, error, required, htmlFor, children }) {
    return (
        <div className="field">
            {label && (
                <label htmlFor={htmlFor}>
                    {label}{required && <span className="req" aria-hidden="true"> *</span>}
                </label>
            )}
            {children}
            {error
                ? <span className="err"><Icon name="alert" size={12} />{error}</span>
                : hint && <span className="hint">{hint}</span>}
        </div>
    );
}

/* ── Empty state ───────────────────────────────────────────────── */
export function Empty({ icon = 'inbox', title, children, actions }) {
    return (
        <div className="empty">
            <div className="empty-art"><Icon name={icon} size={20} /></div>
            <h3>{title}</h3>
            {children && <p>{children}</p>}
            {actions && <div className="empty-actions">{actions}</div>}
        </div>
    );
}

/* ── Copy-to-clipboard row ─────────────────────────────────────── */
export function CopyRow({ value, label = 'Upload link' }) {
    const [done, setDone] = useState(false);
    return (
        <div className="copy-row">
            <input className="input" readOnly value={value} aria-label={label}
                onFocus={(e) => e.target.select()} />
            <Button
                size="sm" icon={done ? 'check' : 'copy'}
                style={{ height: 34 }}
                onClick={async () => {
                    try { await navigator.clipboard.writeText(value); } catch { /* clipboard blocked */ }
                    setDone(true); setTimeout(() => setDone(false), 1800);
                }}
            >{done ? 'Copied' : 'Copy'}</Button>
        </div>
    );
}

/* ── Formatting helpers ────────────────────────────────────────── */
export const initials = (name = '') =>
    name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';

export const fmtDate = (iso) =>
    new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export const fmtTime = (iso) =>
    new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

export const fmtDateTime = (iso) => `${fmtDate(iso)} · ${fmtTime(iso)}`;

export function relative(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return d < 30 ? `${d}d ago` : fmtDate(iso);
}

export function elapsed(fromIso, toIso) {
    const ms = (toIso ? new Date(toIso) : new Date()) - new Date(fromIso);
    const h = Math.floor(ms / 3600000);
    if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
    return `${h}h ${Math.floor((ms % 3600000) / 60000)}m`;
}
