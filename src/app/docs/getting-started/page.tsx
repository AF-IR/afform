import Link from 'next/link'
import type { Metadata } from 'next'
import { getDoc } from '@/lib/docs/content'
import { DocHero, DocSection, DocList, DocPager, UspBanner, DocFaq } from '@/components/docs/doc-ui'
import { breadcrumbSchema, buildFaqSchema } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'شروع سریع — ساخت اولین فرم در ۵ گام',
  description:
    'آموزش گام‌به‌گام ساخت فرم آنلاین: ثبت‌نام، ایجاد فرم، افزودن سؤال، انتشار با لینک اختصاصی و تحلیل پاسخ‌ها با داشبورد و خروجی اکسل.',
  alternates: { canonical: '/docs/getting-started' },
}

const FAQS = [
  { q: 'ساخت فرم چقدر طول می‌کشد؟', a: 'یک فرم ساده کمتر از ۵ دقیقه: عنوان بدهید، چند سؤال اضافه کنید و دکمه انتشار را بزنید. با قالب‌های آماده حتی سریع‌تر — قالب از قبل پر شده و فقط ویرایش می‌کنید.' },
  { q: 'لینک فرم به چه شکل است؟', a: 'هر فرم منتشرشده لینکی کوتاه و غیرقابل حدس مثل /f/a8d4f2c9 می‌گیرد. این لینک را در پیامک، شبکه اجتماعی یا وب‌سایت خود منتشر کنید.' },
  { q: 'آیا می‌توانم بعداً فرم را ویرایش کنم؟', a: 'بله؛ سؤال‌ها و تنظیمات فرم منتشرشده هم قابل ویرایش است. فقط توجه کنید حذف یک سؤال، پاسخ‌های ثبت‌شده همان سؤال را نیز حذف می‌کند.' },
  { q: 'پاسخ‌ها کجا دیده می‌شوند؟', a: 'در داشبورد، صفحه هر فرم: مرور تک‌تک پاسخ‌ها با جست‌وجو و فیلتر تاریخ، داشبورد نموداری و خروجی CSV، اکسل و JSON.' },
]

export default async function GettingStartedDocPage() {
  const doc = getDoc('getting-started')!
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            breadcrumbSchema([
              { name: 'آرشام فرم', href: '/' },
              { name: 'مستندات', href: '/docs' },
              { name: 'شروع سریع', href: '/docs/getting-started' },
            ]),
            buildFaqSchema(FAQS),
          ]),
        }}
      />
      <DocHero doc={doc} lead="در این راهنما، از صفر تا دریافت اولین پاسخ را در پنج گام طی می‌کنید. هیچ کدنویسی، نصب یا راه‌اندازی لازم نیست؛ همه چیز داخل مرورگر انجام می‌شود." />

      <div className="mt-8 space-y-10">
        <DocSection id="step-1" title="گام ۱ — ثبت‌نام، تأیید ایمیل و ورود">
          <p>
            در صفحه <Link className="font-bold text-primary hover:underline" href="/register">ثبت‌نام رایگان</Link> فقط
            ایمیل، نام نمایشی و رمز عبور می‌خواهیم؛ کمتر از یک دقیقه. سپس این اتفاق‌ها می‌افتد:
          </p>
          <DocList items={[
            <>ایمیل تأیید برای شما ارسال می‌شود؛ روی لینک آن کلیک کنید.</>,
            <>پس از تأیید، صفحه «ثبت‌نام انجام شد — خوش آمدید» باز می‌شود که شما را به ورود راهنمایی می‌کند.</>,
            <>از <Link className="font-bold text-primary hover:underline" href="/login">صفحه ورود</Link> با همان ایمیل و رمز عبور وارد شوید؛ داشبورد خانه با نمای کلی فرم‌ها و پاسخ‌های اخیر باز می‌شود.</>,
          ]} />
          <p>
            اگر ایمیل تأیید نیامد، راه‌حل‌های رایج در <Link className="font-bold text-primary hover:underline" href="/docs/troubleshooting">عیب‌یابی</Link> آمده است.
          </p>
        </DocSection>

        <DocSection id="step-2" title="گام ۲ — ایجاد فرم، پرسشنامه یا آزمون">
          <p>
            از داشبورد «ایجاد فرم جدید» را بزنید. سه مسیر دارید:
          </p>
          <DocList items={[
            <>از صفر: عنوان، توضیحات و نوع (فرم / پرسشنامه / آزمون) را انتخاب می‌کنید.</>,
            <>از <Link className="font-bold text-primary hover:underline" href="/templates">قالب آماده</Link>: ۱۰ قالب کاربردی در ۵ دسته (رضایت‌سنجی، ثبت‌نام، پژوهش، آزمون، سازمانی) از قبل پر شده‌اند و فقط ویرایش می‌کنید.</>,
            <>با هوش مصنوعی: موضوع را بنویسید تا پرسشنامه کامل با سؤال‌های پیشنهادی ساخته شود (راهنمای کامل در بخش <Link className="font-bold text-primary hover:underline" href="/docs/ai-features">هوش مصنوعی</Link>).</>,
          ]} />
          <p>
            نوع فرم مهم است: در حالت <strong>آزمون</strong>، امکان تعیین پاسخ صحیح، امتیاز، زمان و سقف تلاش اضافه می‌شود
            (شرح کامل در <Link className="font-bold text-primary hover:underline" href="/docs/exam-mode">آزمون امن و نمره‌دهی</Link>).
          </p>
        </DocSection>

        <DocSection id="step-3" title="گام ۳ — افزودن سؤال‌ها از پلت انواع سؤال">
          <p>
            در سازنده، از پلت کنار فرم یکی از <strong>۲۲ نوع سؤال</strong> را انتخاب و اضافه کنید. برای هر سؤال می‌توانید:
          </p>
          <DocList items={[
            <>عنوان، توضیح کمکی و اجباری/اختیاری بودن را تعیین کنید.</>,
            <>تنظیمات مخصوص همان نوع را تنظیم کنید: گزینه‌ها، حداقل/حداکثر انتخاب، محدودیت طول متن، بازه عددی، انواع فایل مجاز و … .</>,
            <>با منطق شرطی، نمایش سؤال را به پاسخ سؤال قبلی وابسته کنید (<Link className="font-bold text-primary hover:underline" href="/docs/logic-rules">منطق شرطی و انتشار</Link>).</>,
            <>در حالت آزمون، پاسخ صحیح و امتیاز سؤال را وارد کنید.</>,
          ]} />
          <p>
            مرجع کامل هر ۲۲ نوع سؤال با کاربرد و تنظیماتش در <Link className="font-bold text-primary hover:underline" href="/docs/question-types">انواع سؤال</Link> آمده است.
          </p>
        </DocSection>

        <DocSection id="step-4" title="گام ۴ — انتشار با کنترل کامل">
          <p>
            فرم ذخیره‌شده را «منتشر» کنید تا لینک عمومی غیرقابل حدس بگیرد. پیش از انتشار می‌توانید در تنظیمات تعیین کنید:
          </p>
          <DocList items={[
            <>بازه زمانی فعالیت فرم (تاریخ و ساعت شروع و پایان).</>,
            <>سقف تعداد پاسخ (مثلاً برای ظرفیت رویداد).</>,
            <>اجازه پاسخ ناشناس یا الزام هویت؛ در آزمون، دروازه هویت با کد ملی و لیست مجازین.</>,
            <>نوار پیشرفت، پیام تشکر سفارشی و اجازه ایندکس شدن یا نشدن صفحه فرم توسط موتورهای جست‌وجو.</>,
          ]} />
        </DocSection>

        <DocSection id="step-5" title="گام ۵ — دریافت، تحلیل و خروجی گرفتن از پاسخ‌ها">
          <p>
            از لحظه انتشار، پاسخ‌ها زنده در داشبورد ثبت می‌شوند:
          </p>
          <DocList items={[
            <>مرور پاسخ‌ها با جست‌وجو، فیلتر تاریخ و مرتب‌سازی.</>,
            <>داشبورد نموداری: توزیع گزینه‌ها، میانگین امتیازها، روند ۳۰ روزه و در آزمون‌ها میانگین نمره و درصد قبولی.</>,
            <>تحلیل هوش مصنوعی نتایج با یک کلیک — به فارسی و بر اساس داده واقعی.</>,
            <>خروجی CSV، اکسل (xlsx) و JSON برای تحلیل دلخواه شما؛ همه رایگان و با ایمن‌سازی فایل.</>,
          ]} />
        </DocSection>

        <UspBanner />

        <DocSection id="faq" title="پرسش‌های متداول شروع سریع">
          <DocFaq faqs={FAQS} />
        </DocSection>

        <DocPager slug="getting-started" />
      </div>
    </>
  )
}
