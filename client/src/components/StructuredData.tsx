import { useEffect } from 'react';

interface StructuredDataProps {
  type?: 'Organization' | 'WebApplication' | 'BreadcrumbList' | 'FAQPage';
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
        name: 'خدمتك - نظام إدارة سجلات الطلبة',
        alternateName: 'Khadmatak',
        url: 'https://khadmatak.com',
        logo: {
          '@type': 'ImageObject',
          url: 'https://khadmatak.com/social/khadmatak-logo.png',
          width: '512',
          height: '512',
        },
        description: 'نظام متكامل لإدارة سجلات الطلبة والمعلمين متوافق مع منصة أجيال - وزارة التربية والتعليم',
        foundingDate: '2024',
        areaServed: {
          '@type': 'Country',
          name: 'فلسطين',
        },
        serviceType: 'نظام إدارة تعليمي',
        ...customData,
      };

    case 'WebApplication':
      return {
        ...baseSchema,
        name: 'نظام خدمتك لإدارة سجلات الطلبة',
        alternateName: 'Khadmatak Student Records System',
        url: 'https://khadmatak.com',
        description: 'نظام متكامل وسهل الاستخدام لإدارة سجلات الطلبة والمعلمين مع معالجة ملفات Excel من منصة أجيال. يوفر دفتر علامات إلكتروني، سجل حضور وغياب، وتقارير أكاديمية شاملة',
        applicationCategory: 'EducationalApplication',
        browserRequirements: 'Requires JavaScript. Requires HTML5.',
        softwareVersion: '1.0',
        operatingSystem: 'Web Browser, Windows, macOS, Linux, Android, iOS',
        permissions: 'browser',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
          priceValidUntil: '2025-12-31',
        },
        featureList: [
          'معالجة ملفات Excel من منصة أجيال',
          'دفتر العلامات الإلكتروني',
          'سجل الحضور والغياب',
          'تقارير الأداء الأكاديمي',
          'دفتر العلامات الرئيسي',
          'جداول الطلبة',
          'قوالب جاهزة للطباعة',
          'تخزين محلي آمن للبيانات',
        ],
        screenshot: 'https://khadmatak.com/social/khadmatak-logo.png',
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.8',
          ratingCount: '150',
          bestRating: '5',
          worstRating: '1',
        },
        ...customData,
      };

    case 'BreadcrumbList':
      return {
        ...baseSchema,
        itemListElement: customData?.items || [],
      };

    case 'FAQPage':
      return {
        ...baseSchema,
        mainEntity: customData?.questions || [],
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
