const GA_MEASUREMENT_ID = 'G-95KQT6LNRX';

declare global {
    interface Window {
        gtag?: (...args: unknown[]) => void;
    }
}

type AnalyticsValue = string | number | boolean;
type AnalyticsParams = Record<string, AnalyticsValue | undefined>;

const sanitizeParams = (params?: AnalyticsParams): Record<string, AnalyticsValue> => {
    if (!params) return {};

    return Object.entries(params).reduce<Record<string, AnalyticsValue>>((acc, [key, value]) => {
        if (value === undefined) return acc;
        acc[key] = value;
        return acc;
    }, {});
};

export const trackEvent = (eventName: string, params?: AnalyticsParams): void => {
    if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;

    window.gtag('event', eventName, {
        send_to: GA_MEASUREMENT_ID,
        ...sanitizeParams(params),
    });
};

export const trackPageView = (pagePath: string, pageLocation: string, pageTitle: string): void => {
    trackEvent('page_view', {
        page_path: pagePath,
        page_location: pageLocation,
        page_title: pageTitle,
    });
};

