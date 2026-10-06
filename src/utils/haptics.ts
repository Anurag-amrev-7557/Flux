/**
 * Tactile Web Haptics Utility
 * Safely triggers subtle native vibration patterns on supported mobile devices.
 */
export type HapticType = 'light' | 'medium' | 'selection' | 'success' | 'warning' | 'error';

export function triggerHaptic(type: HapticType = 'light') {
    if (typeof window === 'undefined' || !navigator.vibrate) return;
    try {
        switch (type) {
            case 'selection':
                navigator.vibrate(5);
                break;
            case 'light':
                navigator.vibrate(8);
                break;
            case 'medium':
                navigator.vibrate(16);
                break;
            case 'success':
                navigator.vibrate([10, 40, 15]);
                break;
            case 'warning':
                navigator.vibrate([15, 40, 15]);
                break;
            case 'error':
                navigator.vibrate([20, 50, 20]);
                break;
        }
    } catch {
        // Silently ignore if disabled or restricted by browser
    }
}
