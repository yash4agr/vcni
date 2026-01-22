/**
 * TokenManager - Pre-fetches and caches AssemblyAI tokens
 * 
 * Tokens are fetched eagerly on page load and cached for reuse.
 */

interface CachedToken {
    token: string;
    expiresAt: number;
}

class TokenManager {
    private cache: CachedToken | null = null;
    private fetchPromise: Promise<string> | null = null;

    // Cache tokens for 9 minutes (tokens are valid for 10 minutes)
    private readonly TOKEN_TTL_MS = 9 * 60 * 1000;

    /**
     * Pre-fetch token on initialization
     * Call this when the app loads to warm the cache
     */
    async prefetch(): Promise<void> {
        try {
            console.log('[TokenManager] Pre-fetching token...');
            await this.getToken();
            console.log('[TokenManager] Token pre-fetched and cached');
        } catch (error) {
            console.warn('[TokenManager] Pre-fetch failed, will retry on demand:', error);
        }
    }

    /**
     * Get a valid token, using cache if available
     */
    async getToken(): Promise<string> {
        // Return cached token if still valid
        if (this.cache && Date.now() < this.cache.expiresAt) {
            console.log('[TokenManager] Using cached token');
            return this.cache.token;
        }

        // If already fetching, wait for that promise
        if (this.fetchPromise) {
            console.log('[TokenManager] Waiting for in-flight fetch');
            return this.fetchPromise;
        }

        // Fetch new token
        console.log('[TokenManager] Fetching new token...');
        this.fetchPromise = this.fetchToken();

        try {
            const token = await this.fetchPromise;
            this.cache = {
                token,
                expiresAt: Date.now() + this.TOKEN_TTL_MS,
            };
            return token;
        } finally {
            this.fetchPromise = null;
        }
    }

    private async fetchToken(): Promise<string> {
        const res = await fetch('/api/assemblyai/token');

        if (!res.ok) {
            const error = await res.text();
            throw new Error(`Failed to fetch token: ${error}`);
        }

        const data = await res.json();

        if (!data.token) {
            throw new Error('No token in response');
        }

        return data.token;
    }

    /**
     * Invalidate the cache (e.g., after a connection error)
     */
    invalidate(): void {
        console.log('[TokenManager] Cache invalidated');
        this.cache = null;
    }
}

// Singleton instance
export const tokenManager = new TokenManager();

// Auto-prefetch when module loads (runs on page load)
if (typeof window !== 'undefined') {
    // Delay slightly to not block initial render
    setTimeout(() => {
        tokenManager.prefetch();
    }, 100);
}
