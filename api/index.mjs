import app from '../server/index.mjs';

const normalizePathSegment = (value) => String(value || '').replace(/^\/+|\/+$/g, '');

const buildQueryEntries = (query) => {
    const entries = [];

    for (const [key, value] of Object.entries(query || {})) {
        if (key === 'route') continue;

        if (Array.isArray(value)) {
            for (const item of value) {
                if (item !== undefined) entries.push([key, String(item)]);
            }
            continue;
        }

        if (value !== undefined) {
            entries.push([key, String(value)]);
        }
    }

    return entries;
};

export default function handler(req, res) {
    const routeParam = req.query?.route;
    const joinedRoute = Array.isArray(routeParam) ? routeParam.join('/') : routeParam;
    const normalizedRoute = normalizePathSegment(joinedRoute);
    const pathname = normalizedRoute ? `/api/${normalizedRoute}` : '/api';
    const searchParams = new URLSearchParams(buildQueryEntries(req.query));
    const search = searchParams.toString();
    const rewrittenUrl = `${pathname}${search ? `?${search}` : ''}`;

    req.url = rewrittenUrl;
    req.originalUrl = rewrittenUrl;
    req.query = Object.fromEntries(searchParams.entries());

    return app(req, res);
}
