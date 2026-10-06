export const AVATAR_PALETTES = [
    { bg: '#4A6572', text: '#FFFFFF' }, // muted slate teal
    { bg: '#435860', text: '#FFFFFF' }, // muted blue gray
    { bg: '#5260A4', text: '#FFFFFF' }, // muted periwinkle
    { bg: '#5C4033', text: '#FFFFFF' }, // muted warm copper
    { bg: '#3B6056', text: '#FFFFFF' }, // muted pine
    { bg: '#5B415A', text: '#FFFFFF' }, // muted plum
    { bg: '#5E503F', text: '#FFFFFF' }, // muted bronze
    { bg: '#3C5A71', text: '#FFFFFF' }, // muted steel
];

export function getAvatarStyle(str: string) {
    let hash = 0;
    const clean = str.trim();
    for (let i = 0; i < clean.length; i++) {
        hash = clean.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % AVATAR_PALETTES.length;
    return AVATAR_PALETTES[idx];
}

export function formatTransactionHistoryDate(timestamp: number | string | Date): string {
    const d = new Date(timestamp);
    const day = d.getDate();
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${day} ${month} • ${time}`;
}
