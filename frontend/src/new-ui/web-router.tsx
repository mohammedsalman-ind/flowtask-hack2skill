import { useNavigate, useParams } from 'react-router-dom';

function normalizeHref(href: string | { pathname: string }): string {
  const value = typeof href === 'string' ? href : href.pathname;
  return value.replace(/^\/\((tabs|onboarding)\)/, '') || '/';
}

/** Small navigation adapter for screens originally written with Expo Router. */
export function useRouter() {
  const navigate = useNavigate();
  return {
    push: (href: string | { pathname: string }) => navigate(normalizeHref(href)),
    replace: (href: string | { pathname: string }) => navigate(normalizeHref(href), { replace: true }),
    back: () => navigate(-1),
  };
}

export function useLocalSearchParams<T extends Record<string, string | string[] | undefined>>() {
  return useParams() as T;
}
