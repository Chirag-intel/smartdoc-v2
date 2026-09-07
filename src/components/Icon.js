// A single stroke-based icon set (Lucide geometry, 1.75 stroke, 24 grid).
// One icon family, everywhere — no emoji in the chrome.

const P = {
    dashboard: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></>,
    refresh: <><path d="M21 12a9 9 0 1 1-2.6-6.4" /><path d="M21 3v5h-5" /></>,
    link: <><path d="M10.5 13.5a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 0 0-5.7-5.7l-1.6 1.6" /><path d="M13.5 10.5a4 4 0 0 0-5.7 0l-2.8 2.8a4 4 0 1 0 5.7 5.7l1.6-1.6" /></>,
    bell: <><path d="M18 8a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7" /><path d="M13.7 20a2 2 0 0 1-3.4 0" /></>,
    check: <><path d="m4.5 12.5 5 5 10-11" /></>,
    checkCircle: <><circle cx="12" cy="12" r="9" /><path d="m8.5 12.2 2.5 2.5 4.7-5.2" /></>,
    x: <><path d="M6 6l12 12M18 6 6 18" /></>,
    xCircle: <><circle cx="12" cy="12" r="9" /><path d="m9 9 6 6M15 9l-6 6" /></>,
    alert: <><path d="M12 3.7 2.8 19.3a1.4 1.4 0 0 0 1.2 2.1h16a1.4 1.4 0 0 0 1.2-2.1L12 3.7Z" /><path d="M12 9.5v4.2M12 17.6h.01" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 16v-4.5M12 8h.01" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5.3l3.2 1.9" /></>,
    file: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" /><path d="M14 3v5h5" /></>,
    files: <><path d="M15 2H8a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V5l-3-3Z" /><path d="M15 2v4h4" /><path d="M4 7v13a2 2 0 0 0 2 2h9" /></>,
    upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7.5 8.5 12 4l4.5 4.5M12 4v12" /></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7.5 11.5 12 16l4.5-4.5M12 16V4" /></>,
    user: <><circle cx="12" cy="8" r="3.6" /><path d="M4.5 20.2a7.5 7.5 0 0 1 15 0" /></>,
    users: <><circle cx="9" cy="8" r="3.4" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16.5 5.2a3.4 3.4 0 0 1 0 5.6M18 14.6a6.5 6.5 0 0 1 3.5 5.4" /></>,
    mail: <><rect x="2.5" y="5" width="19" height="14" rx="2" /><path d="m3.5 7 8.5 6 8.5-6" /></>,
    phone: <><path d="M5 3h4l2 5-2.5 1.5a12 12 0 0 0 5 5L15 12l5 2v4a2 2 0 0 1-2.2 2A17 17 0 0 1 3 5.2 2 2 0 0 1 5 3Z" /></>,
    chat: <><path d="M21 11.5a8 8 0 0 1-11.6 7.2L3 20.5l1.8-6A8 8 0 1 1 21 11.5Z" /></>,
    whatsapp: <><path d="M21 11.6a8.5 8.5 0 0 1-12.4 7.6L3 20.8l1.7-5.4A8.5 8.5 0 1 1 21 11.6Z" /><path d="M9 9.2c.4 2.5 2.4 4.4 4.8 4.8l.9-1.5 1.9.7v1.6c-2.9.5-6.9-2.4-8.2-6.1l1.5-.4Z" /></>,
    copy: <><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M15 6V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h1" /></>,
    shield: <><path d="M12 21s7-3.2 7-9V6l-7-3-7 3v6c0 5.8 7 9 7 9Z" /><path d="m9.2 12 2 2 3.6-3.8" /></>,
    bank: <><path d="M3 9.5 12 4l9 5.5" /><path d="M5 10v8M9.7 10v8M14.3 10v8M19 10v8" /><path d="M3 21h18" /></>,
    idCard: <><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><circle cx="8.5" cy="11.5" r="2" /><path d="M5.4 16a3.4 3.4 0 0 1 6.2 0M14.5 10h4.5M14.5 13.5h4.5" /></>,
    arrowRight: <><path d="M5 12h13M12.5 5.5 19 12l-6.5 6.5" /></>,
    arrowLeft: <><path d="M19 12H6M11.5 5.5 5 12l6.5 6.5" /></>,
    chevronDown: <><path d="m6 9.5 6 6 6-6" /></>,
    chevronRight: <><path d="m9.5 6 6 6-6 6" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    sparkle: <><path d="M12 3.5 13.8 9l5.5 1.8-5.5 1.8L12 18.2 10.2 12.6 4.7 10.8 10.2 9 12 3.5Z" /><path d="M18.5 3.5v3M20 5h-3" /></>,
    inbox: <><path d="M3 12h4.5l1.8 3h5.4l1.8-3H21" /><path d="M5.4 5h13.2l2.4 7v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5l2.4-7Z" /></>,
    volume: <><path d="M11 5 6.5 9H3v6h3.5L11 19V5Z" /><path d="M15 9.5a3.5 3.5 0 0 1 0 5M17.8 7a7 7 0 0 1 0 10" /></>,
    pause: <><rect x="7" y="5" width="3.5" height="14" rx="1" /><rect x="13.5" y="5" width="3.5" height="14" rx="1" /></>,
    play: <><path d="M7 4.8 19 12 7 19.2V4.8Z" /></>,
    globe: <><circle cx="12" cy="12" r="9" /><path d="M3.2 9.5h17.6M3.2 14.5h17.6" /><path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18Z" /></>,
    loader: <><path d="M12 3v4M12 17v4M5.6 5.6l2.9 2.9M15.5 15.5l2.9 2.9M3 12h4M17 12h4M5.6 18.4l2.9-2.9M15.5 8.5l2.9-2.9" /></>,
    trash: <><path d="M4 7h16M9.5 7V5.5A1.5 1.5 0 0 1 11 4h2a1.5 1.5 0 0 1 1.5 1.5V7" /><path d="M6.5 7 7.4 19a2 2 0 0 0 2 1.9h5.2a2 2 0 0 0 2-1.9L17.5 7" /></>,
    rotate: <><path d="M3 12a9 9 0 1 1 2.6 6.4" /><path d="M3 21v-5h5" /></>,
    filter: <><path d="M3.5 5.5h17l-6.6 7.6V19l-3.8 2v-7.9L3.5 5.5Z" /></>,
    building: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 7.5h2M13 7.5h2M9 11.5h2M13 11.5h2M10.5 21v-4h3v4" /></>,
    lock: <><rect x="4.5" y="10" width="15" height="11" rx="2.5" /><path d="M8 10V7.5a4 4 0 0 1 8 0V10" /></>,
    external: <><path d="M14 4h6v6M20 4l-8.5 8.5" /><path d="M18 14.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4.5" /></>,
    paperclip: <><path d="M20 11.5 12.4 19a5 5 0 0 1-7-7l8-8a3.5 3.5 0 0 1 5 5l-8 8a2 2 0 0 1-2.8-2.8l7.3-7.3" /></>,
    flag: <><path d="M5 21V4M5 4h11l-1.6 3.5L16 11H5" /></>,
};

export default function Icon({ name, size = 16, strokeWidth = 1.75, className, style, ...rest }) {
    const d = P[name];
    if (!d) return null;
    return (
        <svg
            width={size} height={size} viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth={strokeWidth}
            strokeLinecap="round" strokeLinejoin="round"
            className={className} style={style} aria-hidden="true" focusable="false"
            {...rest}
        >{d}</svg>
    );
}

export const CHANNEL_ICON = { email: 'mail', sms: 'chat', whatsapp: 'whatsapp' };
