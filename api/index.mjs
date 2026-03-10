import app from '../server/index.mjs';

const normalizePathSegment = (value) => String(value || '').replace(/^\/+|\/+$/g, '');
const ROUTE_KEYS = ['s1', 's2', 's3', 's4', 's5', 's6'];

const buildQueryEntries = (query) => {
    const entries = [];

    for (const [key, value] of Object.entries(query || {})) {
        if (key === 'route' || ROUTE_KEYS.includes(key)) continue;

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

const extractRouteSegments = (query) => {
    const routeParam = query?.route;
    if (routeParam) {
        const joinedRoute = Array.isArray(routeParam) ? routeParam.join('/') : routeParam;
        return normalizePathSegment(joinedRoute)
            .split('/')
            .map((segment) => normalizePathSegment(segment))
            .filter(Boolean);
    }

    return ROUTE_KEYS.map((key) => normalizePathSegment(query?.[key]))
        .filter(Boolean);
};

export default function handler(req, res) {
    const routeSegments = extractRouteSegments(req.query);
    const pathname = routeSegments.length > 0 ? `/api/${routeSegments.join('/')}` : '/api';
    const searchParams = new URLSearchParams(buildQueryEntries(req.query));
    const search = searchParams.toString();
    const rewrittenUrl = `${pathname}${search ? `?${search}` : ''}`;

    req.url = rewrittenUrl;
    req.originalUrl = rewrittenUrl;
    req.query = Object.fromEntries(searchParams.entries());

    return app(req, res);
}
