import type { APIRoute } from 'astro';
import { calculatorListings } from '../data/calculators';
import { absoluteUrl } from '../lib/seo/site';

export const GET: APIRoute = () => {
  const staticPublicPaths = ['/', '/calculators/', '/about/', '/contact/', '/privacy/', '/terms/'];
  const availableCalculatorPaths = calculatorListings
    .filter((calculator) => calculator.status === 'available')
    .map((calculator) => calculator.href);
  const paths = [...new Set([...staticPublicPaths, ...availableCalculatorPaths])];
  const urls = paths.map((path) => `<url><loc>${absoluteUrl(path)}</loc></url>`).join('');
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
};
