/**
 * Utilitaires pour extraire les informations d'une requête HTTP
 */

export interface RequestInfo {
    ip: string;
    userAgent: string;
    timestamp: string;
}

/**
 * Extrait l'IP et les infos du client depuis une requête Next.js
 */
export function getRequestInfo(request: Request): RequestInfo {
    // Récupérer l'IP depuis les headers (supporte proxy/cloudflare)
    const headers = request.headers;
    const ip =
        headers.get('x-forwarded-for')?.split(',')[0].trim() ||
        headers.get('x-real-ip') ||
        headers.get('cf-connecting-ip') || // Cloudflare
        'unknown';

    const userAgent = headers.get('user-agent') || 'unknown';
    const timestamp = new Date().toISOString();

    return {
        ip,
        userAgent,
        timestamp
    };
}

/**
 * Formate les infos de requête pour l'affichage
 */
export function formatRequestInfo(info: RequestInfo): string {
    return [
        `IP: ${info.ip}`,
        `User-Agent: ${info.userAgent}`,
        `Time: ${info.timestamp}`
    ].join('\n');
}
