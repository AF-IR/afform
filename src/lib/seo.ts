export const SITE_NAME = 'آرشام فرم'
export const SITE_TAGLINE = 'سامانه طراحی پرسشنامه و آزمون آنلاین'

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
