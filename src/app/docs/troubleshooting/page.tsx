import Link from 'next/link'
import type { Metadata } from 'next'
import { getDoc } from '@/lib/docs/content'
import { DocHero, DocSection, DocList, DocPager, DocFaq, DocCard } from '@/components/docs/doc-ui'
import { breadcrumbSchema, buildFaqSchema } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'عیب‌یابی — راه‌حل مشکلات رایج',
  description:
    'راه‌حل گام‌به‌گام مشکلات رایج آرشام فرم: نرسیدن ایمیل تأیید ثبت‌نام، خطای «Could not find the table» در استقرار Vercel و Supabase، اتمام سهمیه هوش مصنوعی، مشکل خروجی اکسل و پاسخ‌های ثبت‌نشده.',
  alternates: { canonical: '/docs/troubleshooting' },
  keywords: ['مشکلات فرم‌ساز', 'ایمیل تأیید نیامد', 'خطای استقرار ورسل', 'عیب‌یابی پرسشنامه آنلاین', 'Could not find the table schema cache'],
}

const FAQS = [
  { q: 'خطای «Application error: a server-side exception has occurred» چیست؟', a: 'یعنی سمت سرور استقرار شما خطا داده؛ رایج‌ترین علت آن در آرشام فرم، خالی بودن جدول‌های دیتابیس است (اجرا نشدن Migrationها). بخش «خطای جدول در استقرار» همین صفحه را ببینید.' },
  { q: 'چرا خروجی اکسل دانلود نمی‌شود؟', a: 'خروجی فقط برای مالک فرم و از داخل داشبورد کار می‌کند؛ اگر وارد نشده‌اید یا آدرس فرم را دستی باز کرده‌اید، درخواست رد می‌شود. همچنین مطمئن شوید افزونه دانلود مرورگر فایل xlsx/csv را مسدود نکرده است.' },
  { q: 'پاسخ‌دهنده می‌گوید فرم باز نمی‌شود، چه چک کنم؟', a: 'فرم باید «منتشرشده» باشد (نه پیش‌نویس و نه بسته)، بازه زمانی فعالیت شروع شده باشد، و اگر سقف پاسخ تعیین کرده‌اید هنوز پر نشده باشد. وضعیت را در داشبورد فرم ببینید.' },
  { q: 'تحلیل هوش مصنوعی خطای «سهمیه» می‌دهد؟', a: 'پلن رایگان هر روز ۲ ساخت و ۲ تحلیل دارد و شمارش بر اساس روز ایران است. تا فردا صبر کنید یا پلن حرفه‌ای را فعال کنید؛ جزئیات در مستندات «پلن‌ها و سهمیه‌ها».' },
]

export default async function TroubleshootingDocPage() {
  const doc = getDoc('troubleshooting')!
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            breadcrumbSchema([
              { name: 'آرشام فرم', href: '/' },
              { name: 'مستندات', href: '/docs' },
              { name: 'عیب‌یابی', href: '/docs/troubleshooting' },
            ]),
            buildFaqSchema(FAQS),
          ]),
        }}
      />
      <DocHero
        doc={doc}
        lead="اگر چیزی طبق انتظار کار نمی‌کند، این صفحه رایج‌ترین حالت‌ها را با راه‌حل مشخص پوشش می‌دهد. اگر راه‌حل را پیدا نکردید، از راه‌های تماس در پایین سایت با ما در میان بگذارید."
      />

      <div className="mt-8 space-y-10">
        <DocSection id="email" title="ایمیل تأیید ثبت‌نام نرسید">
          <DocList items={[
            <>پوشه Spam / Junk و تب «تبلیغات» را بررسی کنید؛ گاهی تأخیر تا چند دقیقه طبیعی است.</>,
            <>ایمیل را با املای درست وارد کرده باشید؟ از صفحه ورود «فراموشی رمز عبور» را بزنید؛ اگر حساب وجود داشته باشد ایمیل می‌آید.</>,
            <>در استقرار خودتان (Vercel + Supabase)، تنظیمات SMTP و قالب ایمیل را از پنل Supabase → Authentication → Emails بررسی کنید و آدرس فرستنده را سفارشی کنید.</>,
            <>حد فاصل «Rate limit» ایمیل Supabase را چک کنید؛ در پلن رایگان سقف ارسال ایمیل در ساعت وجود دارد.</>,
          ]} />
        </DocSection>

        <DocSection id="table-error" title="خطای «Could not find the table … in the schema cache» در استقرار">
          <p>
            این خطا یعنی دیتابیس متصل به استقرار شما، جدول‌های برنامه (مثل <span dir="ltr">forms</span>) را ندارد —
            یعنی <strong>Migrationها روی همان پروژه Supabase اجرا نشده‌اند</strong>. راه‌حل به ترتیب:
          </p>
          <DocList items={[
            <>وارد پنل Supabase همان پروژه‌ای شوید که متغیرهای محیطی Vercel به آن اشاره می‌کنند (چک کنید <span dir="ltr">NEXT_PUBLIC_SUPABASE_URL</span> و کلیدهای anon/service-role دقیقاً همان پروژه باشند).</>,
            <>فایل <span dir="ltr">supabase/migrations/all-in-one.sql</span> را در SQL Editor همان پروژه اجرا کنید (یا Migrationها را با Supabase CLI اعمال کنید). همه Migrationها تا ۰۰۰۴ یک‌بار اجرا می‌شوند و تکرارشان بی‌خطر است.</>,
            <>برای پاک شدن کش PostgREST: پنل Supabase → Settings → API را باز کنید و پروژه را Restart کنید، سپس در Vercel یک Redeploy بزنید.</>,
            <>اگر باز خطا داشتید، در پنل Supabase → Table Editor مطمئن شوید جدول‌های forms، questions، responses، answers و profiles دیده می‌شوند.</>,
          ]} />
          <p>
            نکته مهم: پوشه بیلد برای Vercel لازم نیست — Vercel خودش از سورس بیلد می‌گیرد؛ کلید کارِ استقرار،
            اجرای Migration روی دیتابیسِ همان پروژه است.
          </p>
        </DocSection>

        <DocSection id="quota" title="پیام «سهمیه روزانه تمام شده» هوش مصنوعی">
          <DocList items={[
            <>پلن رایگان: ۲ ساخت پرسش‌نامه + ۲ تحلیل نتایج در روز (روز تقویمی ایران). فقط عملیات موفق شمرده می‌شود.</>,
            <>سهمیه باقی‌مانده در رابط کاربری نشان داده می‌شود؛ پس از نیمه‌شب به‌وقت ایران تازه می‌شود.</>,
            <>برای سقف نامحدود، پلن حرفه‌ای را فعال کنید — جزئیات در مستندات «پلن‌ها و سهمیه‌ها».</>,
          ]} />
        </DocSection>

        <DocSection id="public-form" title="پاسخ‌دهنده نمی‌تواند پاسخ دهد">
          <div className="grid gap-4 sm:grid-cols-2">
            <DocCard icon="Info" title="وضعیت فرم" text="فرم باید منتشرشده باشد؛ پیش‌نویس فقط برای شماست و فرم بسته پیام بستگی می‌دهد." />
            <DocCard icon="CalendarClock" title="بازه زمانی" text="اگر تاریخ شروع تعیین کرده‌اید، تا آن لحظه فرم پیام «هنوز شروع نشده» می‌دهد؛ تاریخ پایان هم همین‌طور." />
            <DocCard icon="Ban" title="سقف پاسخ" text="اگر سقف تعداد پاسخ پر شده باشد، ثبت جدید پذیرفته نمی‌شود؛ سقف را افزایش دهید یا فرم را ببندید." />
            <DocCard icon="Fingerprint" title="دروازه هویت آزمون" text="نام، نام خانوادگی و کد ملی باید با لیست مجازین مطابقت داشته باشد و هر کد ملی فقط یک بار مجاز به ورود است." />
          </div>
        </DocSection>

        <DocSection id="exports" title="خروجی اکسل / CSV / JSON دانلود نمی‌شود">
          <DocList items={[
            <>خروجی فقط از داخل داشبورد و برای مالک فرم معتبر است؛ لینک خروجی برای دیگران کار نمی‌کند.</>,
            <>در بعضی مرورگرها، دانلود چندگانه سریع مسدود می‌شود؛ یک‌بار منتظر بمانید و دوباره بزنید.</>,
            <>اگر فایل CSV در اکسل فارسی به‌هم‌ریخت: فایل با BOM استاندارد ساخته می‌شود؛ حتماً با «Data → From Text/CSV» و انکودینگ UTF-8 باز کنید.</>,
            <>فایل JSON برای ابزارهای تحلیلی (پایتون، Power BI، …) است؛ اگر فقط اکسل می‌خواهید، همان گزینه xlsx را بگیرید.</>,
          ]} />
        </DocSection>

        <DocSection id="quiz" title="آزمون: زمان تمام شد / نمره ثبت نشد">
          <DocList items={[
            <>زمان آزمون با مُهر سمت سرور کنترل می‌شود؛ اگر پاسخ بعد از مهلت برسد پذیرفته نمی‌شود و پیام «زمان تمام شد» می‌دهد — این رفتار عمدی و ضدتقلب است.</>,
            <>اگر سؤال تشریحی دارید، نمره آن سؤال‌ها خودکار نیست؛ در نتایج فقط سؤال‌های نمره‌دار در نمره کل دیده می‌شوند.</>,
            <>حد قبولی را در تنظیمات آزمون تعیین کنید تا وضعیت قبول/مردود محاسبه شود.</>,
          ]} />
        </DocSection>

        <DocSection id="still-stuck" title="هنوز حل نشد؟">
          <p>
            از لینک‌های تماس در فوتر سایت (ایمیل و کانال‌های اطلاع‌رسانی‌شده) استفاده کنید و این‌ها را بفرستید:
            آدرس دقیق صفحه، زمان رخداد، متن کامل پیام خطا و (اگر مربوط است) شناسه فرم. با همین اطلاعات،
            بیشتر مشکلات در یک پاسخ مشخص می‌شود.
          </p>
        </DocSection>

        <DocSection id="faq" title="پرسش‌های متداول عیب‌یابی">
          <DocFaq faqs={FAQS} />
        </DocSection>

        <DocPager slug="troubleshooting" />
      </div>
    </>
  )
}
