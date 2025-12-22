import { useEffect } from "react";
import { useLocation } from "wouter";

type MetaTagsProps = {
  isNotFound?: boolean;
};

type MetaConfig = {
  title: string;
  description: string;
  robots?: string;
  keywords?: string[];
  image?: string;
  type?: string;
  canonical?: string;
};

const BASE_URL = "https://khadmatak.com";
const DEFAULT_OG_IMAGE = `${BASE_URL}/logo.svg`;
const DEFAULT_OG_TYPE = "website";
const DEFAULT_TWITTER_CARD = "summary_large_image";
const DEFAULT_SITE_NAME = "خدمتك";
const DEFAULT_LOCALE = "ar_AR";
const FALLBACK_KEYWORDS: string[] = [
  "خدمتك",
  "نظام خدمتك",
  "إدارة سجلات الطلبة",
  "دفتر العلامات الإلكتروني",
  "سجل الحضور والغياب",
  "سجلات المدرسة",
  "منصة أجيال",
  "برنامج إدارة المدارس",
  "برنامج تعليمي إلكتروني",
];

function getMetaForPath(pathname: string, isNotFound?: boolean): MetaConfig {
  if (isNotFound) {
    return {
      title: "عذراً، الصفحة غير موجودة - خدمتك",
      description:
        "الصفحة التي تبحث عنها قد تكون محذوفة أو تم نقلها أو غير متاحة مؤقتاً.",
      robots: "noindex, follow",
      keywords: ["صفحة غير موجودة", "خطأ 404", "خدمتك"],
    };
  }

  const map: Record<string, MetaConfig> = {
    "/": {
      title: "خدمتك - نظام إدارة سجلات الطلبة ومنصة أجيال للمدارس",
      description:
        "نظام خدمتك لإدارة سجلات الطلبة والمعلمين يوفر دفتر علامات إلكترونيًا وسجل حضور وغياب وتقارير أكاديمية احترافية متوافقة مع منصة أجيال.",
      robots: "index, follow",
      keywords: [
        "خدمتك",
        "نظام إدارة السجلات",
        "منصة أجيال",
        "دفتر العلامات",
        "سجل الحضور",
        "برنامج المدارس",
        "تقارير الأداء",
        "صفحة المعلم أجيال",
        "StudentsNameReport",
      ],
    },
    "/main-gradebook": {
      title: "دفتر العلامات الرئيسي - خدمتك",
      description: "توليد دفتر علامات إلكتروني متوافق مع منصة أجيال ومسارات المدرسة.",
      robots: "index, follow",
      keywords: [
        "دفتر العلامات الرئيسي",
        "تحميل دفتر العلامات",
        "تصدير درجات الطلبة",
        "نموذج علامات",
        "Excel",
        "أجيال",
      ],
    },
    "/side-gradebook": {
      title: "دفتر العلامات الجانبي - خدمتك",
      description: "إنشاء دفتر علامات جانبي لإدارة درجات الأنشطة والتقييمات المستمرة.",
      robots: "index, follow",
      keywords: [
        "دفتر العلامات الجانبي",
        "درجات الأنشطة",
        "تقييم مستمر",
        "إدارة الصف",
        "دفتر موازٍ",
      ],
    },
    "/dashboard/side-gradebook": {
      title: "دفتر العلامات الجانبي (حسابي) - خدمتك",
      description: "إدارة دفتر العلامات الجانبي مع حفظ التقويمات داخل حسابك.",
      robots: "noindex, follow",
      keywords: ["دفتر العلامات الجانبي", "حساب", "تسجيل الدخول"],
    },
    "/dashboard/performance": {
      title: "سجل الأداء والملاحظات (حسابي) - خدمتك",
      description: "إدارة سجل الأداء والملاحظات مع حفظ الأرشيف داخل حسابك.",
      robots: "noindex, follow",
      keywords: ["سجل أداء", "ملاحظات المعلم", "أرشيف", "حساب"],
    },
    "/performance": {
      title: "تقارير الأداء الأكاديمي - خدمتك",
      description: "تحليل أداء الطلبة وإعداد تقارير مفصلة وفق المعايير الأكاديمية.",
      robots: "index, follow",
      keywords: [
        "سجل أداء",
        "تقرير أداء",
        "تقييم أكاديمي",
        "ملاحظات المعلم",
        "تحليل أداء الطلبة",
      ],
    },
    "/attendance": {
      title: "سجل الحضور والغياب - خدمتك",
      description: "تتبع حضور وغياب الطلبة باستخدام سجلات إلكترونية مرنة.",
      robots: "index, follow",
      keywords: [
        "سجل الحضور",
        "سجل الغياب",
        "متابعة حضور الطلبة",
        "دفتر الحضور",
        "تتبع الغياب",
        "تصدير الحضور",
        "كشف حضور شهري",
      ],
    },
    "/lesson-attendance": {
      title: "سجل الحصة الصفية - خدمتك",
      description: "توثيق تفاصيل الحصة الصفية وتسجيل المشاركة والملاحظات اليومية.",
      robots: "index, follow",
      keywords: [
        "سجل الحصة الصفية",
        "متابعة الحصة",
        "ملاحظات يومية",
        "إدارة الحصة",
        "خطة درس",
      ],
    },
    "/schedule": {
      title: "جدول الحصص - خدمتك",
      description: "إنشاء وتصدير جداول الحصص للطلبة والمعلمين بشكل احترافي.",
      robots: "index, follow",
      keywords: [
        "جدول الحصص",
        "جدول الطلاب",
        "جدول المعلمين",
        "إدارة الجدول",
        "تصدير جدول",
      ],
    },
    "/settings": {
      title: "الإعدادات - خدمتك",
      description: "تخصيص إعدادات النظام والقوالب بما يناسب مدرستك.",
      robots: "index, follow",
      keywords: [
        "إعدادات النظام",
        "تخصيص القوالب",
        "ضبط النظام",
        "تجهيز خدمتك",
      ],
    },
    "/templates": {
      title: "القوالب - خدمتك",
      description: "استعراض القوالب الجاهزة للدفاتر والسجلات وتخصيصها.",
      robots: "index, follow",
      keywords: [
        "قوالب مدرسية",
        "نموذج سجلات",
        "نموذج علامات",
        "قالب Excel",
        "تحميل قوالب",
      ],
    },
    "/instructions": {
      title: "دليل الاستخدام - خدمتك",
      description: "إرشادات مبسطة لبدء الاستخدام ورفع ملفات منصة أجيال.",
      robots: "index, follow",
      keywords: [
        "دليل الاستخدام",
        "شرح خدمتك",
        "كيفية الاستخدام",
        "رفع ملفات أجيال",
        "خطوات التجهيز",
        "صفحة المعلم أجيال",
      ],
    },
    "/tutorials": {
      title: "الفيديوهات التعليمية - خدمتك",
      description: "مشاهدة دروس فيديو توضح خطوات إعداد السجلات والدفاتر في نظام خدمتك.",
      robots: "index, follow",
      keywords: [
        "فيديوهات خدمتك",
        "شروحات خدمتك",
        "فيديو تدريبي",
        "دروس منصة أجيال",
        "تعليمات فيديو",
      ],
    },
    "/about": {
      title: "عن المنصة - خدمتك",
      description: "تعرف على رؤية ورسالة منصة خدمتك لإدارة السجلات الأكاديمية.",
      robots: "index, follow",
      keywords: [
        "عن خدمتك",
        "رؤية خدمتك",
        "منصة خدمتك",
        "معلومات عن النظام",
      ],
    },
    "/privacy": {
      title: "سياسة الخصوصية - خدمتك",
      description: "اطلع على سياسة الخصوصية وكيفية حماية بيانات الطلبة في نظام خدمتك.",
      robots: "index, follow",
      keywords: [
        "سياسة الخصوصية",
        "حماية البيانات",
        "خصوصية الطلبة",
        "أمان البيانات",
      ],
    },
    "/gradebook-analyzer": {
      title: "إنشاء الشهادات وتحليل الدرجات - خدمتك",
      description:
        "قم بتحليل جدول العلامات وإنشاء شهادات الطلاب تلقائياً مع الحفاظ على القوالب والصور.",
      robots: "index, follow",
      keywords: [
        "إنشاء الشهادات",
        "تحليل الدرجات",
        "توليد شهادات",
        "تصدير شهادة",
        "Excel شهادات",
      ],
    },
    "/teacher-agial": {
      title: "صفحة المعلم أجيال - خدمتك",
      description:
        "ارفع ملف StudentsNameReport لتحليل الصفوف والشعب، حفظ التجهيزات، وإنشاء دفاتر العلامات المتوافقة مع منصة أجيال.",
      robots: "index, follow",
      keywords: [
        "صفحة المعلم أجيال",
        "StudentsNameReport",
        "كشف المعلم",
        "تحليل كشف أجيال",
        "فلترة التحذيرات",
        "رفع ملف المعلم",
      ],
    },
  };

  return (
    map[pathname] || {
      title: "خدمتك - نظام إدارة سجلات الطلبة",
      description: "منصة إلكترونية متكاملة لإدارة السجلات الأكاديمية.",
      robots: "index, follow",
      keywords: FALLBACK_KEYWORDS,
    }
  );
}

export function MetaTags({ isNotFound }: MetaTagsProps) {
  const [location] = useLocation();
  const currentPath = location || "/";
  const normalizedPath = currentPath.startsWith("/") ? currentPath : `/${currentPath}`;
  const absoluteUrl = `${BASE_URL}${normalizedPath === "/" ? "" : normalizedPath}`;
  const meta = getMetaForPath(normalizedPath, isNotFound);
  const keywords = meta.keywords && meta.keywords.length > 0 ? meta.keywords : FALLBACK_KEYWORDS;
  const ogImage = meta.image || DEFAULT_OG_IMAGE;
  const ogType = meta.type || DEFAULT_OG_TYPE;
  const canonicalHref = meta.canonical || absoluteUrl;

  useEffect(() => {
    // Title
    if (meta.title) {
      document.title = meta.title;
    }

    // Description
    let desc = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!desc) {
      desc = document.createElement("meta");
      desc.setAttribute("name", "description");
      document.head.appendChild(desc);
    }
    desc.setAttribute("content", meta.description);

    // Keywords
    let keywordsMeta = document.querySelector<HTMLMetaElement>('meta[name="keywords"]');
    if (!keywordsMeta) {
      keywordsMeta = document.createElement("meta");
      keywordsMeta.setAttribute("name", "keywords");
      document.head.appendChild(keywordsMeta);
    }
    keywordsMeta.setAttribute("content", keywords.join(", "));

    // Robots (optional override)
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement("meta");
      robots.setAttribute("name", "robots");
      document.head.appendChild(robots);
    }
    robots.setAttribute("content", meta.robots || "index, follow");

    // Open Graph
    let ogTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
    if (!ogTitle) {
      ogTitle = document.createElement("meta");
      ogTitle.setAttribute("property", "og:title");
      document.head.appendChild(ogTitle);
    }
    ogTitle.setAttribute("content", meta.title);

    let ogDesc = document.querySelector<HTMLMetaElement>('meta[property="og:description"]');
    if (!ogDesc) {
      ogDesc = document.createElement("meta");
      ogDesc.setAttribute("property", "og:description");
      document.head.appendChild(ogDesc);
    }
    ogDesc.setAttribute("content", meta.description);

    let ogUrl = document.querySelector<HTMLMetaElement>('meta[property="og:url"]');
    if (!ogUrl) {
      ogUrl = document.createElement("meta");
      ogUrl.setAttribute("property", "og:url");
      document.head.appendChild(ogUrl);
    }
    ogUrl.setAttribute("content", absoluteUrl);

    let ogImageMeta = document.querySelector<HTMLMetaElement>('meta[property="og:image"]');
    if (!ogImageMeta) {
      ogImageMeta = document.createElement("meta");
      ogImageMeta.setAttribute("property", "og:image");
      document.head.appendChild(ogImageMeta);
    }
    ogImageMeta.setAttribute("content", ogImage);

    let ogTypeMeta = document.querySelector<HTMLMetaElement>('meta[property="og:type"]');
    if (!ogTypeMeta) {
      ogTypeMeta = document.createElement("meta");
      ogTypeMeta.setAttribute("property", "og:type");
      document.head.appendChild(ogTypeMeta);
    }
    ogTypeMeta.setAttribute("content", ogType);

    let ogSiteName = document.querySelector<HTMLMetaElement>('meta[property="og:site_name"]');
    if (!ogSiteName) {
      ogSiteName = document.createElement("meta");
      ogSiteName.setAttribute("property", "og:site_name");
      document.head.appendChild(ogSiteName);
    }
    ogSiteName.setAttribute("content", DEFAULT_SITE_NAME);

    let ogLocale = document.querySelector<HTMLMetaElement>('meta[property="og:locale"]');
    if (!ogLocale) {
      ogLocale = document.createElement("meta");
      ogLocale.setAttribute("property", "og:locale");
      document.head.appendChild(ogLocale);
    }
    ogLocale.setAttribute("content", DEFAULT_LOCALE);

    // Twitter
    let twTitle = document.querySelector<HTMLMetaElement>('meta[name="twitter:title"]');
    if (!twTitle) {
      twTitle = document.createElement("meta");
      twTitle.setAttribute("name", "twitter:title");
      document.head.appendChild(twTitle);
    }
    twTitle.setAttribute("content", meta.title);

    let twDesc = document.querySelector<HTMLMetaElement>('meta[name="twitter:description"]');
    if (!twDesc) {
      twDesc = document.createElement("meta");
      twDesc.setAttribute("name", "twitter:description");
      document.head.appendChild(twDesc);
    }
    twDesc.setAttribute("content", meta.description);

    let twUrl = document.querySelector<HTMLMetaElement>('meta[name="twitter:url"]');
    if (!twUrl) {
      twUrl = document.createElement("meta");
      twUrl.setAttribute("name", "twitter:url");
      document.head.appendChild(twUrl);
    }
    twUrl.setAttribute("content", absoluteUrl);

    let twCard = document.querySelector<HTMLMetaElement>('meta[name="twitter:card"]');
    if (!twCard) {
      twCard = document.createElement("meta");
      twCard.setAttribute("name", "twitter:card");
      document.head.appendChild(twCard);
    }
    twCard.setAttribute("content", DEFAULT_TWITTER_CARD);

    let twImage = document.querySelector<HTMLMetaElement>('meta[name="twitter:image"]');
    if (!twImage) {
      twImage = document.createElement("meta");
      twImage.setAttribute("name", "twitter:image");
      document.head.appendChild(twImage);
    }
    twImage.setAttribute("content", ogImage);

    // Canonical
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", canonicalHref);
  }, [absoluteUrl, canonicalHref, keywords, meta.description, meta.robots, meta.title, ogImage, ogType]);

  return null;
}
