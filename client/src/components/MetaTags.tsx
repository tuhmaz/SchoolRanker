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

  const map: Record<string, { title: string; description: string; robots?: string }> = {
    "/": {
      title: "خدمتك - نظام إدارة سجلات الطلبة ومنصة أجيال للمدارس",
      description:
        "نظام خدمتك لإدارة سجلات الطلبة والمعلمين يوفر دفتر علامات إلكترونيًا وسجل حضور وغياب وتقارير أكاديمية احترافية متوافقة مع منصة أجيال.",
      robots: "index, follow",
    },
    "/main-gradebook": {
      title: "دفتر العلامات الرئيسي - خدمتك",
      description: "توليد دفتر علامات إلكتروني متوافق مع منصة أجيال ومسارات المدرسة.",
    },
    "/side-gradebook": {
      title: "دفتر العلامات الجانبي - خدمتك",
      description: "إنشاء دفتر علامات جانبي لإدارة درجات الأنشطة والتقييمات المستمرة.",
    },
    "/performance": {
      title: "تقارير الأداء الأكاديمي - خدمتك",
      description: "تحليل أداء الطلبة وإعداد تقارير مفصلة وفق المعايير الأكاديمية.",
    },
    "/attendance": {
      title: "سجل الحضور والغياب - خدمتك",
      description: "تتبع حضور وغياب الطلبة باستخدام سجلات إلكترونية مرنة.",
    },
    "/schedule": {
      title: "جدول الحصص - خدمتك",
      description: "إنشاء وتصدير جداول الحصص للطلبة والمعلمين بشكل احترافي.",
    },
    "/settings": {
      title: "الإعدادات - خدمتك",
      description: "تخصيص إعدادات النظام والقوالب بما يناسب مدرستك.",
    },
    "/templates": {
      title: "القوالب - خدمتك",
      description: "استعراض القوالب الجاهزة للدفاتر والسجلات وتخصيصها.",
    },
    "/instructions": {
      title: "دليل الاستخدام - خدمتك",
      description: "إرشادات مبسطة لبدء الاستخدام ورفع ملفات منصة أجيال.",
    },
    "/about": {
      title: "عن المنصة - خدمتك",
      description: "تعرف على رؤية ورسالة منصة خدمتك لإدارة السجلات الأكاديمية.",
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
    if (meta.robots) {
      let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
      if (!robots) {
        robots = document.createElement("meta");
        robots.setAttribute("name", "robots");
        document.head.appendChild(robots);
      }
      robots.setAttribute("content", meta.robots);
    }

    // Open Graph
    const ogTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", meta.title);
    const ogDesc = document.querySelector<HTMLMetaElement>('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute("content", meta.description);

    // Twitter
    const twTitle = document.querySelector<HTMLMetaElement>('meta[name="twitter:title"]');
    if (twTitle) twTitle.setAttribute("content", meta.title);
    const twDesc = document.querySelector<HTMLMetaElement>('meta[name="twitter:description"]');
    if (twDesc) twDesc.setAttribute("content", meta.description);
  }, [location, isNotFound, meta.title, meta.description, meta.robots]);

  return null;
}