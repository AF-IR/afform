export const SITE_NAME = 'آرشام فرم'
export const SITE_TAGLINE = 'سامانه طراحی پرسشنامه و آزمون آنلاین'

/**
 * The PRIMARY selling proposition (main SEO keyword family):
 * free AI questionnaire building + free AI analysis — repeated across
 * the hero, docs banner and landing sections.
 */
export const USP_HEADLINE = 'ساخت پرسشنامه با هوش مصنوعی — رایگان بساز، رایگان تحلیل کن'
export const USP_TEXT =
  'فقط موضوع را بنویسید؛ آرشام فرم با هوش مصنوعی یک پرسشنامه کامل فارسی می‌سازد، پاسخ‌ها را با مدل زبانی تحلیل می‌کند و خلاصه، یافته‌ها و پیشنهاد عملی به شما می‌دهد — بدون هزینه، بدون کدنویسی.'

/**
 * The SECONDARY USP (kept deliberately for the exports doc page and the
 * features page): free standard-format exports of questionnaire results.
 */
export const EXPORT_USP_HEADLINE = 'تنها پلتفرم فارسی رایگان که خروجی JSON، اکسل و CSV از نتایج پرسشنامه می‌دهد'
export const EXPORT_USP_TEXT =
  'پاسخ‌ها را در قالب Excel و JSON و CSV دانلود کنید و تحلیل را در ابزار خودتان آسان انجام دهید — بدون هزینه و بدون محدودیت.'

/** JSON-LD breadcrumb trail for any page. */
export function breadcrumbSchema(items: { name: string; href?: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      ...(item.href ? { item: item.href } : {}),
    })),
  }
}

/** Build a FAQPage schema from simple q/a pairs (used per doc/use-case page). */
export function buildFaqSchema(faqs: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }
}

export const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'آیا برای ساخت فرم باید برنامه‌نویسی بلد باشم؟',
      acceptedAnswer: { '@type': 'Answer', text: 'خیر. سازنده فرم آرشام کاملاً بصری است؛ سؤال اضافه می‌کنید، تنظیمات را مشخص می‌کنید و با یک کلیک منتشر می‌کنید.' },
    },
    {
      '@type': 'Question',
      name: 'تفاوت پرسشنامه و آزمون در آرشام فرم چیست؟',
      acceptedAnswer: { '@type': 'Answer', text: 'در حالت آزمون پاسخ صحیح و امتیاز هر سؤال تعیین می‌شود و نمره نهایی، درصد قبولی، مدت آزمون و سقف تلاش سمت سرور محاسبه و کنترل می‌شود.' },
    },
    {
      '@type': 'Question',
      name: 'پاسخ‌دهندگان برای پاسخ‌دادن باید ثبت‌نام کنند؟',
      acceptedAnswer: { '@type': 'Answer', text: 'خیر. فرم منتشرشده با لینک اختصاصی در دسترس همه است؛ مگر اینکه سازنده، پاسخ ناشناس را غیرفعال کند.' },
    },
    {
      '@type': 'Question',
      name: 'آزمون‌های زمان‌دار چطور کنترل می‌شوند؟',
      acceptedAnswer: { '@type': 'Answer', text: 'زمان شروع هر تلاش با مُهر سمت سرور ثبت می‌شود و هنگام ثبت پاسخ، مدت مجاز روی سرور بررسی می‌شود.' },
    },
    {
      '@type': 'Question',
      name: 'آیا می‌توانم پاسخ‌ها را در اکسل داشته باشم؟',
      acceptedAnswer: { '@type': 'Answer', text: 'بله؛ خروجی CSV، Excel و JSON از داشبورد فرم در دسترس است.' },
    },
    {
      '@type': 'Question',
      name: 'اطلاعات پاسخ‌دهندگان محفوظ است؟',
      acceptedAnswer: { '@type': 'Answer', text: 'پاسخ‌ها فقط برای سازنده فرم قابل مشاهده است و دسترسی‌ها با Row Level Security در سطح دیتابیس کنترل می‌شود.' },
    },
  ],
}
