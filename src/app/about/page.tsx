import type { Metadata } from 'next'
import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { FooterContactLinks } from '@/components/layout/footer-contact-links'
import { getCurrentUser } from '@/lib/auth/service'

export const metadata: Metadata = {
  title: 'درباره ما',
  description: 'آشنایی با آرشام فرم — مأموریت، مخاطبان و رویکرد محصول.',
  alternates: { canonical: '/about' },
}

export default async function AboutPage() {
  const user = await getCurrentUser()
  return (
    <>
      <SiteHeader isAuthenticated={Boolean(user)} />
      <main className="mx-auto max-w-3xl flex-1 px-4 py-12">
        <h1 className="text-3xl font-extrabold">درباره آرشام فرم</h1>
        <div className="mt-6 space-y-6 leading-8 text-muted-foreground">
          <p>
            آرشام فرم یک سامانه آنلاین برای طراحی، انتشار و مدیریت پرسشنامه‌ها، آزمون‌ها، نظرسنجی‌ها و فرم‌های جمع‌آوری
            اطلاعات است. هدف ما ساده است: هر کسی — معلم، دانشجو، پژوهشگر، صاحب کسب‌وکار یا تیم کوچک — بتواند بدون
            دانش برنامه‌نویسی، فرمی حرفه‌ای بسازد، لینک اختصاصی بگیرد و پاسخ‌ها را در داشبورد خود تحلیل کند.
          </p>
          <p>
            شعار ما «فرم بساز، آزمون برگزار کن، پاسخ‌ها را تحلیل کن» خلاصه سه بخش اصلی محصول است: یک سازنده فرم بصری
            با انواع متنوع سؤال، سیستم آزمون با نمره‌دهی خودکار و کنترل سمت سرور، و داشبورد گزارش‌هایی که بر اساس
            داده واقعی ساخته می‌شود.
          </p>
          <h2 className="text-xl font-bold text-foreground">رویکرد ما به داده و حریم خصوصی</h2>
          <p>
            فرم‌های عمومی ممکن است شامل اطلاعات شخصی پاسخ‌دهندگان باشند؛ به همین دلیل از روز اول امنیت و حریم خصوصی
            در معماری محصول لحاظ شده است: جداسازی داده هر کاربر در سطح دیتابیس، کنترل دسترسی سمت سرور برای همه
            عملیات‌ها، عدم درج اطلاعات محرمانه در آدرس‌ها و مستندات شفاف درباره رفتار حذف داده‌ها.
          </p>
          <h2 className="text-xl font-bold text-foreground">مخاطبان محصول</h2>
          <p>
            آرشام فرم برای افراد، معلمان، دانشجویان، پژوهشگران، شرکت‌ها، صاحبان کسب‌وکارها و تیم‌های کوچک طراحی شده
            است؛ هر جا نیاز به جمع‌آوری ساختارمند اطلاعات، سنجش نظر یا برگزاری آزمون وجود داشته باشد.
          </p>
          <h2 className="text-xl font-bold text-foreground">ارتباط با ما</h2>
          <p>
            برای پرسش‌ها، گزارش مشکل فنی یا پیشنهاد قابلیت جدید، از کانال‌های زیر استفاده کنید. هر کانالی که توسط
            مدیر سرویس تنظیم شده باشد در این بخش و فوتر سایت نمایش داده می‌شود.
          </p>
          <div className="rounded-xl border bg-card p-4">
            <FooterContactLinks />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
