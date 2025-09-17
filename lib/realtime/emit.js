import 'server-only';

export async function emitSocket({ target, event, payload }) {
    const base = process.env.SOCKET_SERVICE_URL;
    const key = process.env.SOCKET_EMIT_KEY || '';
    const r = await fetch(`${base}/emit`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'x-api-key': key
        },
        body: JSON.stringify({ target, event, payload })
    });
    const body = await r.json().catch(() => ({}));
    return { ok: !!body?.emitted && r.ok, status: r.status, body };
}
