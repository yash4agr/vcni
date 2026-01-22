/**
 * API Route: NLU Process
 * Proxies NLU processing requests to the backend
 */
import type { APIRoute } from 'astro';

// Use process.env for runtime environment variables in SSR
const BACKEND_URL = process.env.API_URL || 'http://localhost:8000';

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        console.log(`[API] Processing NLU request to: ${BACKEND_URL}/api/nlu/process`);

        const response = await fetch(`${BACKEND_URL}/api/nlu/process`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const error = await response.text();
            console.error(`[API] Backend error: ${error}`);
            return new Response(JSON.stringify({ error }), {
                status: response.status,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const data = await response.json();
        return new Response(JSON.stringify(data), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('[API] Failed to process NLU request:', error);
        return new Response(JSON.stringify({
            error: 'Failed to connect to backend',
            response: 'Sorry, I am having trouble connecting to the server.',
            ui_mode: 'ai_response',
            state: 'error'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
