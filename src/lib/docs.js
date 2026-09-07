// Shared document catalogue — one source of truth for labels + iconography.
export const DOC_TYPES = [
    { id: 'pan_card',       label: 'PAN Card',       icon: 'idCard',   hint: 'Permanent Account Number card' },
    { id: 'aadhaar_card',   label: 'Aadhaar Card',   icon: 'idCard',   hint: '12-digit unique identity' },
    { id: 'address_proof',  label: 'Address Proof',  icon: 'building', hint: 'Utility bill, rent agreement, voter ID' },
    { id: 'bank_statement', label: 'Bank Statement', icon: 'bank',     hint: 'Last 6 months' },
    { id: 'passport',       label: 'Passport',       icon: 'globe',    hint: 'Valid passport data page' },
    { id: 'photograph',     label: 'Photograph',     icon: 'user',     hint: 'Passport-size photo' },
    { id: 'salary_slip',    label: 'Salary Slip',    icon: 'file',     hint: 'Last 3 months' },
    { id: 'itr',            label: 'ITR',            icon: 'files',    hint: 'Income tax return / Form 16' },
    { id: 'signature',      label: 'Signature',      icon: 'flag',     hint: 'Specimen signature' },
];

export const DOC_MAP = Object.fromEntries(DOC_TYPES.map(d => [d.id, d]));

export const docLabel = (doc) =>
    doc?.isOther || doc?.docType === 'other'
        ? (doc.label || 'Other document')
        : (DOC_MAP[doc?.docType]?.label || doc?.label || doc?.docType || 'Document');

export const docIcon = (doc) => DOC_MAP[doc?.docType]?.icon || 'file';

export const LOAN_TYPES = ['Personal Loan', 'Home Loan', 'Vehicle Loan', 'Business Loan', 'Education Loan', 'Gold Loan'];

export const CHANNELS = [
    { id: 'sms',      label: 'SMS',      icon: 'chat',     field: 'customerPhone' },
    { id: 'email',    label: 'Email',    icon: 'mail',     field: 'customerEmail' },
    { id: 'whatsapp', label: 'WhatsApp', icon: 'whatsapp', field: 'customerPhone' },
];

export const DIGILOCKER_DOCS = ['pan_card', 'aadhaar_card'];
export const AA_DOCS = ['bank_statement'];
