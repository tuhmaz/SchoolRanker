import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  ogUrl?: string;
  canonical?: string;
}

export function useSEO({
  title,
  description,
  keywords,
  ogImage,
  ogUrl,
  canonical,
}: SEOProps) {
  useEffect(() => {
    // Update title
    if (title) {
      document.title = title;
      updateMetaTag('name', 'title', title);
      updateMetaTag('property', 'og:title', title);
      updateMetaTag('property', 'twitter:title', title);
    }

    // Update description
    if (description) {
      updateMetaTag('name', 'description', description);
      updateMetaTag('property', 'og:description', description);
      updateMetaTag('property', 'twitter:description', description);
    }

    // Update keywords
    if (keywords) {
      updateMetaTag('name', 'keywords', keywords);
    }

    // Update Open Graph image
    if (ogImage) {
      updateMetaTag('property', 'og:image', ogImage);
      updateMetaTag('property', 'twitter:image', ogImage);
    }

    // Update Open Graph URL
    if (ogUrl) {
      updateMetaTag('property', 'og:url', ogUrl);
      updateMetaTag('property', 'twitter:url', ogUrl);
    }

    // Update canonical URL
    if (canonical) {
      updateCanonicalLink(canonical);
    }
  }, [title, description, keywords, ogImage, ogUrl, canonical]);
}

function updateMetaTag(
  attribute: 'name' | 'property',
  value: string,
  content: string
) {
  let element = document.querySelector(
    `meta[${attribute}="${value}"]`
  ) as HTMLMetaElement;

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, value);
    document.head.appendChild(element);
  }

  element.content = content;
}

function updateCanonicalLink(href: string) {
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;

  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }

  link.href = href;
}
