/**
 * API Route: TTS Stream
 * Proxies TTS streaming requests to the backend
 */
import type { APIRoute } from 'astro';

// Use process.env for runtime environment variables in SSR
const BACKEND_URL = process.env.API_URL || 'http://localhost:8000';

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        console.log(`[API] Processing TTS request to: ${BACKEND_URL}/api/tts/stream`);

        const response = await fetch(`${BACKEND_URL}/api/tts/stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const error = await response.text();
            console.error(`[API] Backend TTS error: ${error}`);
            return new Response(JSON.stringify({ error }), {
                status: response.status,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Stream the PCM audio through to the client
        return new Response(response.body, {
            status: 200,
            headers: {
                'Content-Type': 'audio/pcm',
                'X-Sample-Rate': '16000',
                'X-Bit-Depth': '16',
                'X-Channels': '1',
            }
        });
    } catch (error) {
        console.error('[API] Failed to process TTS request:', error);
        return new Response(JSON.stringify({
            error: 'Failed to connect to TTS backend',
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
