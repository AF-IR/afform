/**
 * Documentation hub data — single source of truth for /docs navigation,
 * metadata and the shared USP block rendered on every doc page.
 * Icons are lucide names mapped in components/docs/docs-sidebar.tsx.
 */

export interface DocMeta {
  slug: string
  title: string
  /** short description for cards, sidebar and meta */
  description: string
  icon: string
  /** rough reading time in minutes */
  minutes: number
  keywords: string[]
}

export const DOCS: DocMeta[] = [
  {
    slug: '',
    title: 'مستندات آرشام فرم',
    description: 'مرجع کامل و جامع کار با پلتفرم: انواع سؤال، آزمون امن، خروجی Excel و JSON، هوش مصنوعی، مدیریت پاسخ‌ها، امنیت داده و عیب‌یابی.',
    icon: 'BookOpen',
    minutes: 3,
    keywords: ['مستندات آرشام فرم', 'آموزش ساخت فرم آنلاین', 'راهنمای پرسشنامه فارسی', 'راهنمای کامل فرم‌ساز'],
  },
  {
    slug: 'getting-started',
    title: 'شروع سریع',
    description: 'از ثبت‌نام و تأیید ایمیل تا ساخت اولین فرم با هوش مصنوعی یا قالب آماده، انتشار و دریافت پاسخ — قدم‌به‌قدم.',
    icon: 'Rocket',
    minutes: 6,
    keywords: ['آموزش ساخت فرم', 'ساخت پرسشنامه آنلاین', 'شروع کار با آرشام فرم', 'ساخت پرسشنامه با هوش مصنوعی'],
  },
  {
    slug: 'form-builder',
    title: 'سازنده فرم',
    description: 'راهنمای کامل سازنده: افزودن و ویرایش سؤال، تنظیمات هر سؤال، منطق شرطی، پیش‌نمایش، ذخیره و انتشار، تکرار فرم.',
    icon: 'SlidersHorizontal',
    minutes: 8,
    keywords: ['سازنده فرم آنلاین', 'ویرایش سوال پرسشنامه', 'پیش‌نمایش فرم', 'انتشار فرم آنلاین'],
  },
  {
    slug: 'question-types',
    title: 'انواع سؤال (۲۲ نوع)',
    description: 'مرجع کامل ۲۲ نوع سؤال: کاربرد هر نوع، تنظیمات مخصوص، انواع سؤال آزمون با پاسخ صحیح و امتیاز، و نمونه‌های واقعی.',
    icon: 'ListChecks',
    minutes: 14,
    keywords: ['انواع سوال آزمون آنلاین', 'نوع سوال پرسشنامه', 'سوال چهارگزینه‌ای آنلاین', 'مقیاس لیکرت', 'سوال تشریحی آنلاین'],
  },
  {
    slug: 'exam-mode',
    title: 'آزمون امن و نمره‌دهی',
    description: 'راهنمای کامل آزمون: تعریف اکانت دانش‌آموز (نام کاربری و رمز)، زمان‌سنج سروری، ورود تک‌بار، صفحه مشاهده نتیجه با سیاست زمان اعلام، سؤال تصویری و عبارات ریاضی.',
    icon: 'ShieldCheck',
    minutes: 10,
    keywords: ['آزمون آنلاین امن', 'آزمون آنلاین با نام کاربری', 'جلوگیری از تقلب در آزمون آنلاین', 'نمره‌دهی خودکار آزمون', 'آزمون آنلاین مدرسه', 'سوال ریاضی آنلاین'],
  },
  {
    slug: 'ai-features',
    title: 'هوش مصنوعی',
    description: 'ساخت پرسشنامه با هوش مصنوعی از یک موضوع و تحلیل خودکار نتایج با مدل زبانی — به فارسی، با سهمیه روزانه شفاف.',
    icon: 'Sparkles',
    minutes: 8,
    keywords: ['ساخت پرسشنامه با هوش مصنوعی', 'تحلیل نتایج نظرسنجی با AI', 'هوش مصنوعی فارسی فرم', 'پرسشنامه هوش مصنوعی رایگان'],
  },
  {
    slug: 'exports-reports',
    title: 'خروجی Excel، CSV و JSON',
    description: 'دریافت نتایج در سه قالب استاندارد، ایمن‌سازی فایل‌ها، گزارش‌های نموداری و تحلیل آسان در اکسل — ویژگی امضای آرشام فرم.',
    icon: 'FileSpreadsheet',
    minutes: 8,
    keywords: ['خروجی اکسل نتایج پرسشنامه', 'خروجی JSON فرم', 'دانلود نتایج نظرسنجی', 'خروجی CSV فارسی', 'گزارش نموداری نظرسنجی'],
  },
  {
    slug: 'responses',
    title: 'مدیریت پاسخ‌ها',
    description: 'مرور پاسخ‌ها با جست‌وجو و فیلتر تاریخ، جزئیات هر پاسخ‌دهنده، نتایج آزمون هر شرکت‌کننده و ویرایش پاسخ پس از ثبت.',
    icon: 'Table2',
    minutes: 6,
    keywords: ['مدیریت پاسخ‌های فرم', 'مشاهده جواب‌های نظرسنجی', 'دریافت پاسخ فرم آنلاین'],
  },
  {
    slug: 'logic-rules',
    title: 'منطق شرطی و انتشار',
    description: 'نمایش سؤال بر اساس پاسخ قبلی، اعتبارسنجی سروری و کنترل کامل انتشار: زمان‌بندی، سقف پاسخ، دسترسی و بستن فرم.',
    icon: 'GitBranch',
    minutes: 8,
    keywords: ['منطق شرطی فرم', 'سوال شرطی پرسشنامه', 'زمان‌بندی انتشار فرم', 'بستن فرم'],
  },
  {
    slug: 'plans-limits',
    title: 'پلن‌ها و سهمیه‌ها',
    description: 'پلن رایگان و حرفه‌ای، سهمیه روزانهٔ هوش مصنوعی (۲ ساخت و ۲ تحلیل)، ثبت مصرف در دیتابیس و نحوهٔ ارتقا.',
    icon: 'Gauge',
    minutes: 4,
    keywords: ['پلن رایگان فرم‌ساز', 'سهمیه هوش مصنوعی', 'ارتقا به پلن حرفه‌ای'],
  },
  {
    slug: 'security-privacy',
    title: 'امنیت و حریم خصوصی',
    description: 'جداسازی داده در سطح دیتابیس (RLS)، لینک غیرقابل حدس، محدودسازی نرخ، ایمن‌سازی خروجی‌ها و حفاظت از هویت پاسخ‌دهندگان.',
    icon: 'Lock',
    minutes: 7,
    keywords: ['امنیت داده فرم آنلاین', 'حریم خصوصی پاسخ‌دهندگان', 'Row Level Security', 'امنیت آزمون آنلاین'],
  },
  {
    slug: 'best-practices',
    title: 'اصول طراحی پرسشنامه',
    description: 'چگونه سؤال بنویسیم که نرخ پاسخ و کیفیت داده بالا برود: اصل‌های طراحی، خطاهای رایج و چک‌لیست پیش از انتشار.',
    icon: 'Star',
    minutes: 9,
    keywords: ['طراحی پرسشنامه حرفه‌ای', 'اصول نوشتن سوال نظرسنجی', 'افزایش نرخ پاسخ پرسشنامه'],
  },
  {
    slug: 'troubleshooting',
    title: 'عیب‌یابی',
    description: 'راه‌حل مشکلات رایج: نرسیدن ایمیل تأیید، خطای جدول در استقرار، تمام‌شدن سهمیه هوش مصنوعی، مشکل خروجی و پاسخ‌های ثبت‌نشده.',
    icon: 'Info',
    minutes: 7,
    keywords: ['مشکلات فرم‌ساز', 'ایمیل تأیید نیامد', 'خطای استقرار ورسل', 'عیب‌یابی پرسشنامه آنلاین'],
  },
]

/** Doc page URL for a slug ('' → /docs hub). */
export function docHref(slug: string): string {
  return slug ? `/docs/${slug}` : '/docs'
}

/** Flat nav list without the hub itself (used in sidebar and prev/next). */
export const DOC_PAGES: DocMeta[] = DOCS.filter((d) => d.slug !== '')

export function getDoc(slug: string): DocMeta | undefined {
  return DOCS.find((d) => d.slug === slug)
}

/** Prev/next neighbours for pager navigation at the bottom of each doc page. */
export function docNeighbours(slug: string): { prev?: DocMeta; next?: DocMeta } {
  const idx = DOC_PAGES.findIndex((d) => d.slug === slug)
  if (idx === -1) return {}
  return {
    prev: idx > 0 ? DOC_PAGES[idx - 1] : undefined,
    next: idx < DOC_PAGES.length - 1 ? DOC_PAGES[idx + 1] : undefined,
  }
}
