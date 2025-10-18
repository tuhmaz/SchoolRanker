import { useEffect } from 'react';

interface StructuredDataProps {
  type?: 'Organization' | 'WebApplication' | 'BreadcrumbList';
  data?: Record<string, any>;
}

export function StructuredData({ type = 'Organization', data }: StructuredDataProps) {
  useEffect(() => {
    const schema = getSchema(type, data);
    addSchemaToHead(schema);

    return () => {
      removeSchemaFromHead(schema['@context']);
    };
  }, [type, data]);

  return null;
}

function getSchema(type: string, customData?: Record<string, any>) {
  const baseSchema = {
    '@context': 'https://schema.org',
    '@type': type,
  };

  switch (type) {
    case 'Organization':
      return {
        ...baseSchema,
        name: 'نظام إدارة السجلات',
        url: 'https://khadmatak.com',
        logo: 'https://khadmatak.com/logo.png',
        description: 'نظام متكامل لإدارة سجلات الطلبة والمعلمين',
        sameAs: [
          'https://www.facebook.com/khadmatak',
          'https://twitter.com/khadmatak',
        ],
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'Customer Service',
          email: 'support@khadmatak.com',
        },
        ...customData,
      };

    case 'WebApplication':
      return {
        ...baseSchema,
        name: 'نظام إدارة سجلات الطلبة',
        url: 'https://khadmatak.com',
        applicationCategory: 'EducationalApplication',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'SAR',
        },
        operatingSystem: 'Web',
        ...customData,
      };

    case 'BreadcrumbList':
      return {
        ...baseSchema,
        itemListElement: customData?.items || [],
      };

    default:
      return baseSchema;
  }
}

function addSchemaToHead(schema: Record<string, any>) {
  let script = document.querySelector(
    `script[type="application/ld+json"][data-schema="${schema['@type']}"]`
  ) as HTMLScriptElement;

  if (!script) {
    script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-schema', schema['@type']);
    document.head.appendChild(script);
  }

  script.textContent = JSON.stringify(schema);
}

function removeSchemaFromHead(context: string) {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  scripts.forEach((script) => {
    if (script.textContent?.includes(context)) {
      script.remove();
    }
  });
}
