import type { APIRoute } from 'astro';

const BACKEND_URL = process.env.API_URL || 'http://localhost:8000';

export const GET: APIRoute = async () => {
    try {
        console.log(`[API] Fetching token from: ${BACKEND_URL}/api/assemblyai/token`);
        const response = await fetch(`${BACKEND_URL}/api/assemblyai/token`);

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
        console.error('[API] Failed to get AssemblyAI token:', error);
        return new Response(JSON.stringify({ error: 'Failed to connect to backend' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
