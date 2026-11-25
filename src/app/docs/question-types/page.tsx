import Link from 'next/link'
import type { Metadata } from 'next'
import { ALL_QUESTION_TYPES, QUESTION_TYPE_META } from '@/types'
import { getDoc } from '@/lib/docs/content'
import { DocHero, DocSection, DocList, DocPager, UspBanner, DocFaq } from '@/components/docs/doc-ui'
import { DocIcon } from '@/components/docs/doc-icon'
import { breadcrumbSchema, buildFaqSchema } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'انواع سؤال آزمون و پرسشنامه — مرجع کامل ۲۲ نوع',
  description:
    'مرجع کامل انواع سؤال آزمون آنلاین و پرسشنامه در آرشام فرم: چهارگزینه‌ای، چندگزینه‌ای، درست/غلط، عددی، لیکرت، ستاره‌ای، ماتریس، بارگذاری فایل و ۱۳ نوع دیگر با تنظیمات هر نوع.',
  alternates: { canonical: '/docs/question-types' },
}

/** Per-type documentation data (checked against the real builder config). */
const TYPE_DOCS: Record<string, { usage: string; config: string; exam?: string }> = {
  short_text: {
    usage: 'پاسخ کوتاه تک‌خطی؛ برای نام، نام شرکت، شهر یا هر پاسخ یک‌خطی.',
    config: 'حداقل و حداکثر تعداد نویسه، متن راهنما (Placeholder) و اجباری بودن.',
  },
  long_text: {
    usage: 'پاسخ تشریحی چندخطی؛ برای دیدگاه‌ها، پیشنهادها و توضیح آزاد.',
    config: 'حداقل و حداکثر نویسه؛ در گزارش‌ها نمونه متن پاسخ‌ها نمایش داده می‌شود و تحلیل هوش مصنوعی محتوای آن را می‌خواند.',
    exam: 'سؤال تشریحی نمره خودکار نمی‌گیرد؛ برای نمره‌دهی دستی در کنار سؤال‌های خودکار مناسب است.',
  },
  email: {
    usage: 'دریافت ایمیل معتبر برای پیگیری یا ارسال نتیجه.',
    config: 'اعتبارسنجی خودکار قالب ایمیل در مرورگر و سرور.',
  },
  phone: {
    usage: 'شماره تماس برای هماهنگی جلسه یا اطلاع‌رسانی.',
    config: 'اعتبارسنجی قالب شماره؛ ارقام فارسی هم پذیرفته می‌شود.',
  },
  number: {
    usage: 'دریافت عدد؛ سن، معدل، تعداد، مبلغ.',
    config: 'کمینه، بیشینه، فقط عدد صحیح، واحد (مثل «کیلوگرم») و اعتبارسنجی بازه.',
    exam: 'نمره‌دهی خودکار با پاسخ دقیق (عدد صحیح) یا بازه قابل قبول (حداقل و حداکثر) — مناسب سؤال‌های محاسباتی.',
  },
  url: {
    usage: 'لینک نمونه‌کار، وب‌سایت یا پروفایل.',
    config: 'اعتبارسنجی قالب URL.',
  },
  single_choice: {
    usage: 'سؤال چهارگزینه‌ای کلاسیک؛ انتخاب تنها یک گزینه از لیست.',
    config: '۲ تا ۱۲ گزینه، گزینه «سایر» با پاسخ آزاد، ترتیب تصادفی گزینه‌ها (تنظیمات فرم).',
    exam: 'نمره‌دهی خودکار: گزینه صحیح + امتیاز سؤال را در سازنده تعیین می‌کنید.',
  },
  multi_choice: {
    usage: 'انتخاب چند گزینه هم‌زمان؛ برای مهارت‌ها، علایق و چک‌لیست‌ها.',
    config: 'حداقل و حداکثر تعداد انتخاب، گزینه «سایر».',
    exam: 'نمره‌دهی خودکار با تطابق کامل مجموعه گزینه‌های صحیح (ناقص یا اضافه = غلط).',
  },
  multi_choice_comment: {
    usage: 'انتخاب چند گزینه به‌همراه توضیح نوشتاری — بازخورد دقیق‌تر.',
    config: 'مانند چندگزینه‌ای به‌علاوه فیلد توضیح.',
    exam: 'امتیازدهی بر اساس گزینه‌های انتخابی است؛ متن توضیح نمره خودکار نمی‌گیرد.',
  },
  dropdown: {
    usage: 'فهرست کشویی برای انتخاب از لیست بلند (استان، سِمت، سال ورود).',
    config: '۲ تا ۱۲ گزینه؛ فضای کمتری نسبت به دکمه‌ها می‌گیرد.',
    exam: 'نمره‌دهی خودکار مانند انتخاب یک گزینه.',
  },
  boolean: {
    usage: 'سؤال دوگانه بله/خیر یا درست/غلط — تأیید قوانین و سؤال‌های صحه‌گذار.',
    config: 'برچسب دو گزینه قابل ویرایش است.',
    exam: 'نمره‌دهی خودکار: پاسخ صحیح (بله یا خیر) + امتیاز؛ رایج برای سؤال «درست/غلط».',
  },
  rating_number: {
    usage: 'امتیازدهی عددی با بازه دلخواه (مثلاً ۰ تا ۱۰۰).',
    config: 'کمینه، بیشینه، فقط عدد صحیح و واحد.',
  },
  likert: {
    usage: 'مقیاس لیکرت استاندارد با برچسب‌های فارسی؛ سنجش نگرش و موافقت.',
    config: 'برچسب‌های مقیاس (پیش‌فرض: خیلی کم تا خیلی زیاد) قابل ویرایش است.',
    exam: 'در آزمون نمره خودکار نمی‌گیرد؛ برای پرسشنامه ارزیابی طراحی شده است.',
  },
  rating_5: {
    usage: 'امتیاز ۱ تا ۵؛ استانداردترین مقیاس رضایت‌سنجی.',
    config: 'میانگین و توزیع هر امتیاز در گزارش و خروجی اکسل محاسبه می‌شود.',
  },
  rating_10: {
    usage: 'امتیاز ۱ تا ۱۰؛ تفکیک بیشتر و شبیه سنجش NPS.',
    config: 'مناسب سؤال «چقدر احتمال دارد ما را به دیگران پیشنهاد کنید؟».',
  },
  stars: {
    usage: 'انتخاب ستاره‌ای (۵ ستاره) — آشناترین رابط برای کاربر موبایل.',
    config: 'نمایش گرافیکی؛ داده ذخیره‌شده عددی است.',
  },
  date: {
    usage: 'انتخاب تاریخ؛ روز رویداد، تاریخ تولد، مهلت تحویل.',
    config: 'کمینه و بیشینه تاریخ مجاز.',
  },
  time: {
    usage: 'انتخاب ساعت؛ زمان ترجیحی شرکت در جلسه.',
    config: 'قالب ساعت استاندارد.',
  },
  file: {
    usage: 'بارگذاری فایل؛ رزومه، تصویر کارت، رسید پرداخت.',
    config: 'سقف حجم (مگابایت) و انواع فایل مجاز؛ فایل‌ها در فضای خصوصی ذخیره و فقط برای سازنده فرم قابل دانلود است.',
  },
  matrix: {
    usage: 'ماتریس سؤال‌ها: چند سطر (گزاره) × چند ستون (گزینه) در یک سؤال.',
    config: 'سطرها و ستون‌ها را خودتان تعریف می‌کنید؛ مناسب سنجش چند گزاره با یک مقیاس.',
  },
  info: {
    usage: 'جعبه توضیحی بدون پاسخ؛ اعلام قوانین آزمون، راهنمای پر کردن یا متن مقدمه.',
    config: 'فقط متن؛ در پاسخ‌ها ظاهر نمی‌شود.',
    exam: 'مکان عالی برای اعلام «مدت آزمون ۲۰ دقیقه است؛ پس از شروع، تلاش مجاز ندارید».',
  },
  separator: {
    usage: 'جداکننده بخش‌ها؛ تقسیم فرم بلند به بخش‌های خوانا.',
    config: 'فقط نمایشی.',
  },
}

const GROUPS = [
  { key: 'text', title: 'سؤال‌های متنی و عددی', desc: 'پاسخ آزاد و داده‌های پایه — اعتبارسنجی خودکار در مرورگر و سرور.' },
  { key: 'choice', title: 'سؤال‌های انتخابی', desc: 'قلب آزمون‌ها و پرسشنامه‌ها؛ از چهارگزینه‌ای تا چندگزینه‌ای با توضیح.' },
  { key: 'rating', title: 'سؤال‌های امتیازی و مقیاسی', desc: 'سنجش رضایت و نگرش با داده قابل محاسبه — میانگین و توزیع خودکار.' },
  { key: 'advanced', title: 'سؤال‌های پیشرفته و نمایشی', desc: 'فایل، تاریخ، ماتریس و عناصر ساختاری فرم.' },
] as const

const FAQS = [
  { q: 'برای آزمون آنلاین چه نوع سؤال‌هایی بهتر است؟', a: 'برای نمره‌دهی خودکار از چهارگزینه‌ای (انتخاب یک گزینه)، فهرست کشویی، چندگزینه‌ای، بله/خیر و عددی استفاده کنید؛ این انواع پاسخ صحیح و امتیاز می‌پذیرند و در لحظه ثبت، نمره سمت سرور محاسبه می‌شود. سؤال تشریحی هم مجاز است اما نمره خودکار نمی‌گیرد.' },
  { q: 'در سؤال عددی آزمون می‌توانم بازه قابل قبول تعریف کنم؟', a: 'بله؛ به‌جای پاسخ دقیق می‌توانید حداقل و حداکثر بازه را مشخص کنید — مثلاً «هر عدد بین ۳/۱۴ تا ۳/۱۶ صحیح است».' },
  { q: 'تفاوت چندگزینه‌ای و چندگزینه‌ای با توضیح چیست؟', a: 'در نوع دوم، پاسخ‌دهنده علاوه بر انتخاب گزینه‌ها یک توضیح نوشتاری هم می‌نویسد؛ برای بازخورد دقیق‌تر و سؤال‌های «چرا؟».' },
  { q: 'سؤال ماتریس چیست و کی به‌درد می‌خورد؟', a: 'یک سؤال با چند سطر گزاره و چند ستون گزینه مشترک؛ مثلاً ۵ گزاره لیکرت در یک سؤال. فرم را کوتاه‌تر و مقایسه گزاره‌ها را آسان‌تر می‌کند.' },
  { q: 'آیا گزینه «سایر» می‌توانم اضافه کنم؟', a: 'بله؛ در سؤال‌های انتخابی می‌توانید گزینه «سایر» را فعال کنید تا پاسخ‌دهنده متن آزاد خودش را بنویسد؛ این متن در گزارش‌ها و خروجی اکسل هم می‌آید.' },
]

/** Types actually auto-scored by lib/scoring/grade.ts (single source of truth). */
const AUTO_SCORED: ReadonlySet<string> = new Set([
  'single_choice', 'dropdown', 'multi_choice', 'multi_choice_comment',
  'boolean', 'number', 'rating_number',
])

function TypeRow({ type }: { type: (typeof ALL_QUESTION_TYPES)[number] }) {
  const meta = QUESTION_TYPE_META[type]
  const info = TYPE_DOCS[type]
  if (!info) return null
  return (
    <div id={type} className="scroll-mt-28 rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <DocIcon name={meta.icon} className="h-4 w-4" />
        </span>
        <h3 className="font-extrabold">{meta.label}</h3>
        {AUTO_SCORED.has(type) && (
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            نمره‌دهی خودکار در آزمون
          </span>
        )}
        <a href={`#${type}`} className="mr-auto text-xs text-muted-foreground hover:text-primary" aria-label={`لینک مستقیم به ${meta.label}`}>#</a>
      </div>
      <p className="mt-3 text-sm leading-7"><strong>کاربرد:</strong> {info.usage}</p>
      <p className="mt-1.5 text-sm leading-7"><strong>تنظیمات:</strong> {info.config}</p>
      {info.exam && <p className="mt-1.5 text-sm leading-7"><strong>در آزمون:</strong> {info.exam}</p>}
    </div>
  )
}

export default async function QuestionTypesDocPage() {
  const doc = getDoc('question-types')!
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            breadcrumbSchema([
              { name: 'آرشام فرم', href: '/' },
              { name: 'مستندات', href: '/docs' },
              { name: 'انواع سؤال', href: '/docs/question-types' },
            ]),
            buildFaqSchema(FAQS),
          ]),
        }}
      />
      <DocHero
        doc={doc}
        lead="این صفحه مرجع کامل همه ۲۲ نوع سؤال آرشام فرم است: کاربرد هر نوع، تنظیمات اختصاصی و اینکه در آزمون کدام نوع‌ها نمره خودکار می‌گیرند. اگر آزمون آنلاین برگزار می‌کنید، بخش سؤال‌های انتخابی را کامل بخوانید."
      />

      <div className="mt-8 space-y-10">
        <DocSection id="overview" title="نمای کلی و انتخاب نوع درست">
          <p>
            نوع سؤال را بر اساس <strong>نوع داده‌ای</strong> که می‌خواهید تحلیل کنید انتخاب کنید، نه فقط شکل ظاهری:
          </p>
          <DocList items={[
            <>داده قابل شمارش و نمودارپذیر → سؤال‌های انتخابی (چهارگزینه‌ای، چندگزینه‌ای، کشویی، بله/خیر).</>,
            <>داده قابل میانگین‌گیری → امتیازی (۱ تا ۵، ۱ تا ۱۰، ستاره‌ای، لیکرت، عددی).</>,
            <>متن تحلیل‌پذیر با هوش مصنوعی → کوتاه و بلند؛ پاسخ‌های واقعی به مدل زبانی داده می‌شود.</>,
            <>سند یا تصویر واقعی → بارگذاری فایل.</>,
            <>چند گزاره با یک مقیاس → ماتریس.</>,
          ]} />
          <p>
            همه سؤال‌ها می‌توانند اجباری یا اختیاری باشند و هر نوع، تنظیمات اعتبارسنجی خودش را دارد؛ اعتبارسنجی هم در مرورگر و هم روی سرور انجام می‌شود.
          </p>
        </DocSection>

        <DocSection id="pick" title="جدول انتخاب سریع — هدف → نوع پیشنهادی">
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[36rem] text-right text-sm">
              <thead className="bg-muted/60 text-foreground">
                <tr>
                  <th className="px-4 py-3 font-bold">هدف شما</th>
                  <th className="px-4 py-3 font-bold">نوع‌های پیشنهادی</th>
                  <th className="px-4 py-3 font-bold">چرا</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                {[
                  ['آزمون چندگزینه‌ای مدرسه', 'چهارگزینه‌ای، بله/خیر، عددی', 'نمره‌دهی خودکار لحظه‌ای و سمت سرور'],
                  ['آزمون محاسباتی', 'عددی با بازه قابل قبول', 'پذیرش بازه‌ای مثل ۳/۱۴ تا ۳/۱۶'],
                  ['رضایت‌سنجی مشتری', 'امتیاز ۱ تا ۵، لیکرت، تشریحی', 'میانگین، توزیع و روایت دلایل'],
                  ['سنجش NPS', 'امتیاز ۱ تا ۱۰', 'تفکیک بیشتر برای پیشنهاددهی'],
                  ['ثبت‌نام رویداد', 'متن کوتاه، ایمیل، تلفن، تاریخ', 'اعتبارسنجی خودکار هر فیلد'],
                  ['دریافت رزومه / مدرک', 'بارگذاری فایل', 'فایل خصوصی، فقط برای سازنده'],
                  ['سنجش چند گزاره با یک مقیاس', 'ماتریس', 'فرم کوتاه‌تر، مقایسه آسان'],
                  ['بازخورد محصول', 'چندگزینه‌ای با توضیح', 'هم دسته‌بندی، هم توضیح آزاد'],
                ].map(([goal, types, why]) => (
                  <tr key={goal} className="border-t">
                    <td className="px-4 py-3 font-medium text-foreground">{goal}</td>
                    <td className="px-4 py-3">{types}</td>
                    <td className="px-4 py-3">{why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DocSection>

        <DocSection id="exam-scoring" title="نمره‌دهی خودکار در آزمون — کدام انواع نمره می‌گیرند؟">
          <p>
            در حالت آزمون، برای این ۷ نوع می‌توانید پاسخ صحیح و امتیاز تعیین کنید و نمره در لحظه ثبت، سمت سرور محاسبه می‌شود:
          </p>
          <DocList items={[
            <><strong>چهارگزینه‌ای و فهرست کشویی:</strong> گزینه صحیح + امتیاز؛ رایج‌ترین شکل سؤال آزمون.</>,
            <><strong>بله/خیر (درست/غلط):</strong> پاسخ صحیح بله یا خیر؛ سبک‌ترین سؤال آزمون.</>,
            <><strong>چندگزینه‌ای (و با توضیح):</strong> تطابق کامل مجموعه گزینه‌های صحیح لازم است؛ انتخاب ناقص یا اضافه = غلط.</>,
            <><strong>عدد:</strong> پاسخ دقیق یا بازه قابل قبول (حداقل/حداکثر) — برای محاسبات و رند کردن.</>,
            <><strong>امتیاز عددی:</strong> پاسخ صحیح عددی با بازه دلخواه.</>,
          ]} />
          <p>
            سؤال‌های تشریحی، لیکرت، ستاره‌ای و فایل در نمره خودکار وارد نمی‌شوند؛ می‌توانید آن‌ها را برای ارزیابی کیفی کنار
            نمره خودکار نگه دارید. جزئیات کامل زمان، سقف تلاش و دروازه هویت در
            <Link className="mx-1 font-bold text-primary hover:underline" href="/docs/exam-mode">آزمون امن و نمره‌دهی</Link>.
          </p>
        </DocSection>

        {GROUPS.map((g) => (
          <DocSection key={g.key} id={g.key} title={g.title}>
            <p>{g.desc}</p>
            <div className="space-y-4">
              {ALL_QUESTION_TYPES.filter((t) => QUESTION_TYPE_META[t].group === g.key).map((t) => (
                <TypeRow key={t} type={t} />
              ))}
            </div>
          </DocSection>
        ))}

        <UspBanner />

        <DocSection id="faq" title="پرسش‌های متداول انواع سؤال">
          <DocFaq faqs={FAQS} />
        </DocSection>

        <DocPager slug="question-types" />
      </div>
    </>
  )
}
