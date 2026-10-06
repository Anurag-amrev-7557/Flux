/**
 * Hybrid logical clock used only for field conflict resolution. Server
 * timestamps remain the source of truth for replication checkpoints.
 */
export const MAX_CLOCK_DRIFT_MS = 24 * 60 * 60 * 1000;

export type Hlc = `${string}:${string}:${string}`;

export function compareHlc(a: string | undefined, b: string | undefined): number {
    return (a ?? '').localeCompare(b ?? '');
}

export function deviceId(): string {
    if (typeof window === 'undefined') return 'server00';
    const key = 'flux.sync.device-id';
    const current = localStorage.getItem(key);
    if (current) return current;
    const value = crypto.randomUUID().replaceAll('-', '').slice(0, 8);
    localStorage.setItem(key, value);
    return value;
}

export class HybridLogicalClock {
    private wallMs = 0;
    private counter = 0;

    constructor(private readonly id = deviceId(), private readonly now = () => Date.now()) {}

    tick(serverNow = this.now()): Hlc {
        const current = this.now();
        const bounded = Math.min(current, serverNow + MAX_CLOCK_DRIFT_MS);
        if (bounded > this.wallMs) {
            this.wallMs = bounded;
            this.counter = 0;
        } else {
            this.counter += 1;
        }
        return this.format();
    }

    receive(remote: string | undefined, serverNow = this.now()): void {
        if (!remote) return;
        const [wallPart, counterPart] = remote.split(':');
        const remoteWall = Number(wallPart);
        const remoteCounter = Number(counterPart);
        if (!Number.isFinite(remoteWall) || !Number.isFinite(remoteCounter)) return;
        const boundedRemote = Math.min(remoteWall, serverNow + MAX_CLOCK_DRIFT_MS);
        if (boundedRemote > this.wallMs) {
            this.wallMs = boundedRemote;
            this.counter = remoteCounter;
        } else if (boundedRemote === this.wallMs) {
            this.counter = Math.max(this.counter, remoteCounter);
        }
    }

    private format(): Hlc {
        return `${String(this.wallMs).padStart(13, '0')}:${String(this.counter).padStart(4, '0')}:${this.id}`;
    }
}

export const hlc = new HybridLogicalClock();
