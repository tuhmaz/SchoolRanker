import { useEffect } from "react";
import { useLocation } from "wouter";

type MetaTagsProps = {
  isNotFound?: boolean;
};

function getMetaForPath(pathname: string, isNotFound?: boolean) {
  if (isNotFound) {
    return {
      title: "عذراً، الصفحة غير موجودة - خدمتك",
      description:
        "الصفحة التي تبحث عنها قد تكون محذوفة أو تم نقلها أو غير متاحة مؤقتاً.",
      robots: "noindex, follow",
    };
  }

  const map: Record<string, { title: string; description: string; robots: string }> = {
    "/": {
      title: "خدمتك - نظام إدارة سجلات الطلبة ومنصة أجيال للمدارس",
      description:
        "نظام خدمتك لإدارة سجلات الطلبة والمعلمين يوفر دفتر علامات إلكترونيًا وسجل حضور وغياب وتقارير أكاديمية احترافية متوافقة مع منصة أجيال.",
      robots: "index, follow",
    },
    "/main-gradebook": {
      title: "دفتر العلامات الرئيسي - خدمتك",
      description: "توليد دفتر علامات إلكتروني متوافق مع منصة أجيال ومسارات المدرسة.",
      robots: "index, follow",
    },
    "/side-gradebook": {
      title: "دفتر العلامات الجانبي - خدمتك",
      description: "إنشاء دفتر علامات جانبي لإدارة درجات الأنشطة والتقييمات المستمرة.",
      robots: "index, follow",
    },
    "/performance": {
      title: "تقارير الأداء الأكاديمي - خدمتك",
      description: "تحليل أداء الطلبة وإعداد تقارير مفصلة وفق المعايير الأكاديمية.",
      robots: "index, follow",
    },
    "/attendance": {
      title: "سجل الحضور والغياب - خدمتك",
      description: "تتبع حضور وغياب الطلبة باستخدام سجلات إلكترونية مرنة.",
      robots: "index, follow",
    },
    "/schedule": {
      title: "جدول الحصص - خدمتك",
      description: "إنشاء وتصدير جداول الحصص للطلبة والمعلمين بشكل احترافي.",
      robots: "index, follow",
    },
    "/settings": {
      title: "الإعدادات - خدمتك",
      description: "تخصيص إعدادات النظام والقوالب بما يناسب مدرستك.",
      robots: "index, follow",
    },
    "/templates": {
      title: "القوالب - خدمتك",
      description: "استعراض القوالب الجاهزة للدفاتر والسجلات وتخصيصها.",
      robots: "index, follow",
    },
    "/instructions": {
      title: "دليل الاستخدام - خدمتك",
      description: "إرشادات مبسطة لبدء الاستخدام ورفع ملفات منصة أجيال.",
      robots: "index, follow",
    },
    "/about": {
      title: "عن المنصة - خدمتك",
      description: "تعرف على رؤية ورسالة منصة خدمتك لإدارة السجلات الأكاديمية.",
      robots: "index, follow",
    },
  };

  return (
    map[pathname] || {
      title: "خدمتك - نظام إدارة سجلات الطلبة",
      description: "منصة إلكترونية متكاملة لإدارة السجلات الأكاديمية.",
      robots: "index, follow",
    }
  );
}

export function MetaTags({ isNotFound }: MetaTagsProps) {
  const [location] = useLocation();
  const meta = getMetaForPath(location || "/", isNotFound);

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
    ogUrl.setAttribute("content", window.location.href);

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
    twUrl.setAttribute("content", window.location.href);

    // Canonical
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", window.location.href);
  }, [location, isNotFound, meta.title, meta.description, meta.robots]);

  return null;
}