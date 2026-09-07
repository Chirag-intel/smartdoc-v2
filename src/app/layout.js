import './globals.css';

export const metadata = {
    title: 'SmartDoc — Document Pendency Console',
    description: 'Collect, validate and track loan documents across every case.',
};

export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#fbfbfd' };

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            {/* Browser extensions inject attributes onto <body> before React
                hydrates; ignore attribute mismatches on this element only. */}
            <body suppressHydrationWarning>{children}</body>
        </html>
    );
}
