import type { FormType, Question, QuestionConfig, QuestionScoring, QuestionType } from '@/types'

export interface TemplateQuestion {
  type: QuestionType
  title: string
  description?: string
  required?: boolean
  config?: QuestionConfig
  scoring?: QuestionScoring | null
}

export interface TemplateDef {
  id: string
  title: string
  description: string
  category: string
  formType: FormType
  questions: TemplateQuestion[]
}

export const TEMPLATE_CATEGORIES = [
  'رضایت‌سنجی', 'ثبت‌نام و درخواست', 'پژوهش', 'آزمون', 'سازمانی',
] as const

export const templates: TemplateDef[] = [
  {
    id: 'customer-satisfaction',
    title: 'رضایت‌سنجی مشتری',
    description: 'سنجش رضایت مشتریان از محصول یا خدمت شما با امتیازدهی و پرسش‌های باز.',
    category: 'رضایت‌سنجی',
    formType: 'survey',
    questions: [
      { type: 'rating_5', title: 'به‌طور کلی، از محصول/خدمت ما چقدر رضایت دارید؟', required: true },
      { type: 'rating_5', title: 'کیفیت پاسخ‌گویی پشتیبانی را چگونه ارزیابی می‌کنید؟' },
      { type: 'likert', title: '«این محصول ارزش پولش را دارد.» چقدر موافقید؟', required: true },
      { type: 'multi_choice', title: 'کدام ویژگی‌ها برای شما مفید بوده‌اند؟ (چند گزینه مجاز است)',
        config: { choices: [
          { id: 'c1', label: 'سهولت استفاده' }, { id: 'c2', label: 'سرعت' },
          { id: 'c3', label: 'پشتیبانی' }, { id: 'c4', label: 'قیمت مناسب' },
        ], minSelects: 1 } },
      { type: 'long_text', title: 'چه چیزی را می‌توانیم بهبود دهیم؟', config: { maxLength: 1000 } },
    ],
  },
  {
    id: 'service-evaluation',
    title: 'ارزیابی خدمات',
    description: 'ارزیابی کیفیت خدمات یک مجموعه از دید مراجعه‌کنندگان.',
    category: 'رضایت‌سنجی',
    formType: 'survey',
    questions: [
      { type: 'single_choice', title: 'برای چندمین بار از خدمات ما استفاده کرده‌اید؟', required: true,
        config: { choices: [ { id: 'c1', label: 'اولین بار' }, { id: 'c2', label: '۲ تا ۳ بار' }, { id: 'c3', label: 'بیش از ۳ بار' } ] } },
      { type: 'rating_10', title: 'احتمال توصیه ما به دیگران (از ۰ تا ۱۰) چقدر است؟', required: true },
      { type: 'stars', title: 'به برخورد کارکنان چه امتیازی می‌دهید؟', required: true },
      { type: 'boolean', title: 'آیا مشکلی در فرایند ارائه خدمات تجربه کردید؟' },
      { type: 'long_text', title: 'اگر بله، لطفاً توضیح دهید:', config: { maxLength: 1500 } },
    ],
  },
  {
    id: 'event-registration',
    title: 'فرم ثبت‌نام رویداد',
    description: 'ثبت‌نام شرکت‌کنندگان در همایش، وبینار یا کارگاه آموزشی.',
    category: 'ثبت‌نام و درخواست',
    formType: 'form',
    questions: [
      { type: 'short_text', title: 'نام و نام خانوادگی', required: true, config: { minLength: 3, maxLength: 100 } },
      { type: 'email', title: 'ایمیل', required: true },
      { type: 'phone', title: 'شماره تماس', required: true },
      { type: 'single_choice', title: 'نحوه حضور', required: true,
        config: { choices: [ { id: 'c1', label: 'حضوری' }, { id: 'c2', label: 'آنلاین' } ] } },
      { type: 'boolean', title: 'آیا برای دریافت گواهی حضور نیاز دارید؟' },
      { type: 'long_text', title: 'پیام یا پرسش خود را بنویسید (اختیاری)', config: { maxLength: 800 } },
    ],
  },
  {
    id: 'research-questionnaire',
    title: 'پرسشنامه پژوهشی',
    description: 'پرسشنامه استاندارد برای جمع‌آوری داده‌های پژوهشی با مقیاس لیکرت.',
    category: 'پژوهش',
    formType: 'survey',
    questions: [
      { type: 'info', title: 'درباره این پرسشنامه', description: 'پاسخ‌های شما کاملاً محرمانه و فقط برای اهداف پژوهشی استفاده می‌شود. تکمیل پرسشنامه حدود ۵ دقیقه زمان می‌برد.' },
      { type: 'single_choice', title: 'گروه سنی شما', required: true,
        config: { choices: [ { id: 'c1', label: 'زیر ۲۵ سال' }, { id: 'c2', label: '۲۵ تا ۴۰ سال' }, { id: 'c3', label: '۴۰ تا ۶۰ سال' }, { id: 'c4', label: 'بالای ۶۰ سال' } ] } },
      { type: 'single_choice', title: 'جنسیت', config: { choices: [ { id: 'c1', label: 'زن' }, { id: 'c2', label: 'مرد' }, { id: 'c3', label: 'ترجیح می‌دهم نگویم' } ] } },
      { type: 'matrix', title: 'به گزاره‌های زیر چقدر موافقید؟', required: true,
        config: { rows: ['کار با این ابزار آسان است', 'به نتیجه مطلوب رسیده‌ام', 'آن را به دیگران پیشنهاد می‌کنم'], cols: ['کاملاً موافقم', 'موافقم', 'نظری ندارم', 'مخالفم', 'کاملاً مخالفم'] } },
      { type: 'long_text', title: 'نظرات تکمیلی شما درباره موضوع پژوهش:', config: { maxLength: 2000 } },
    ],
  },
  {
    id: 'general-knowledge-quiz',
    title: 'آزمون اطلاعات عمومی',
    description: 'آزمون ۵ سؤالی با نمره‌دهی خودکار و نمایش نتیجه به شرکت‌کننده.',
    category: 'آزمون',
    formType: 'quiz',
    questions: [
      { type: 'single_choice', title: 'پایتخت ایران کدام شهر است؟', required: true,
        config: { choices: [ { id: 'c1', label: 'اصفهان' }, { id: 'c2', label: 'تهران' }, { id: 'c3', label: 'شیراز' }, { id: 'c4', label: 'تبریز' } ] },
        scoring: { points: 20, correctChoices: ['c2'] } },
      { type: 'boolean', title: 'آب در دمای صفر درجه سانتی‌گراد یخ می‌زند.', required: true,
        scoring: { points: 20, correctBoolean: true } },
      { type: 'number', title: 'جذر عدد ۱۴۴ چند است؟', required: true, config: { min: 0, max: 100, integer: true },
        scoring: { points: 20, correctNumber: 12 } },
      { type: 'single_choice', title: 'کدام سیاره به خورشید نزدیک‌تر است؟', required: true,
        config: { choices: [ { id: 'c1', label: 'زمین' }, { id: 'c2', label: 'عطارد' }, { id: 'c3', label: 'زهره' }, { id: 'c4', label: 'مریخ' } ] },
        scoring: { points: 20, correctChoices: ['c2'] } },
      { type: 'multi_choice', title: 'کدام‌ها از استان‌های ایران هستند؟ (دو گزینه صحیح)', required: true,
        config: { choices: [ { id: 'c1', label: 'فارس' }, { id: 'c2', label: 'آذربایجان شرقی' }, { id: 'c3', label: 'آنکارا' }, { id: 'c4', label: 'هرات' } ] },
        scoring: { points: 20, correctChoices: ['c1', 'c2'] } },
    ],
  },
  {
    id: 'course-quiz',
    title: 'آزمون آموزشی درس',
    description: 'آزمون پایان فصل با زمان‌بندی، نمره قبولی و ترتیب تصادفی سؤالات.',
    category: 'آزمون',
    formType: 'quiz',
    questions: [
      { type: 'short_text', title: 'نام و نام خانوادگی', required: true, config: { minLength: 3, maxLength: 100 } },
      { type: 'single_choice', title: 'واحد اندازه‌گیری نیرو در SI کدام است؟', required: true,
        config: { choices: [ { id: 'c1', label: 'ژول' }, { id: 'c2', label: 'نیوتن' }, { id: 'c3', label: 'وات' }, { id: 'c4', label: 'پاسکال' } ] },
        scoring: { points: 25, correctChoices: ['c2'] } },
      { type: 'number', title: '۲ به توان ۱۰ برابر است با:', required: true, config: { min: 0, max: 10000, integer: true },
        scoring: { points: 25, correctNumber: 1024 } },
      { type: 'boolean', title: 'سرعت نور در خلأ حدود ۳۰۰ هزار کیلومتر بر ثانیه است.', required: true,
        scoring: { points: 25, correctBoolean: true } },
      { type: 'multi_choice', title: 'کدام‌ها سیاره‌های منظومه شمسی هستند؟', required: true,
        config: { choices: [ { id: 'c1', label: 'مشتری' }, { id: 'c2', label: 'زمین' }, { id: 'c3', label: 'زحل' }, { id: 'c4', label: 'پروکسیمای قنطورس' } ] },
        scoring: { points: 25, correctChoices: ['c1', 'c3'] } },
    ],
  },
  {
    id: 'employee-review',
    title: 'ارزیابی کارکنان',
    description: 'چک‌لیست ارزیابی دوره‌ای عملکرد همکاران توسط مدیران.',
    category: 'سازمانی',
    formType: 'survey',
    questions: [
      { type: 'short_text', title: 'نام همکار مورد ارزیابی', required: true, config: { minLength: 3, maxLength: 100 } },
      { type: 'rating_10', title: 'کیفیت انجام کارها را چگونه ارزیابی می‌کنید؟', required: true },
      { type: 'rating_10', title: 'همکاری و کار تیمی این همکار را چگونه ارزیابی می‌کنید؟', required: true },
      { type: 'matrix', title: 'سطح توافق شما با گزاره‌های زیر:',
        config: { rows: ['تعهد به زمان‌بندی مشخص دارد', 'در حل مسائل ابتکار عمل نشان می‌دهد'], cols: ['خیلی کم', 'کم', 'متوسط', 'زیاد', 'خیلی زیاد'] } },
      { type: 'long_text', title: 'نقاط قوت:', config: { maxLength: 1000 } },
      { type: 'long_text', title: 'پیشنهادهای بهبود:', config: { maxLength: 1000 } },
    ],
  },
  {
    id: 'job-application',
    title: 'فرم درخواست همکاری',
    description: 'دریافت رزومه و اطلاعات متقاضیان همکاری با فرم ساختاریافته.',
    category: 'ثبت‌نام و درخواست',
    formType: 'form',
    questions: [
      { type: 'short_text', title: 'نام و نام خانوادگی', required: true, config: { minLength: 3, maxLength: 100 } },
      { type: 'email', title: 'ایمیل', required: true },
      { type: 'phone', title: 'شماره تماس', required: true },
      { type: 'single_choice', title: 'سطح تجربه کاری', required: true,
        config: { choices: [ { id: 'c1', label: 'تازه‌کار (زیر ۱ سال)' }, { id: 'c2', label: 'میان‌کار (۱ تا ۵ سال)' }, { id: 'c3', label: 'باتجربه (بیش از ۵ سال)' } ] } },
      { type: 'multi_choice', title: 'مهارت‌های شما', config: { choices: [ { id: 'c1', label: 'برنامه‌نویسی' }, { id: 'c2', label: 'طراحی' }, { id: 'c3', label: 'بازاریابی' }, { id: 'c4', label: 'مدیریت پروژه' } ], allowOther: true } },
      { type: 'long_text', title: 'چرا مایل به همکاری با ما هستید؟', required: true, config: { maxLength: 2000 } },
    ],
  },
  {
    id: 'feedback-form',
    title: 'فرم دریافت بازخورد',
    description: 'جمع‌آوری بازخورد کوتاه کاربران درباره تجربه استفاده از محصول.',
    category: 'رضایت‌سنجی',
    formType: 'survey',
    questions: [
      { type: 'rating_5', title: 'تجربه کلی شما از استفاده ما چقدر خوب بود؟', required: true },
      { type: 'single_choice', title: 'به کدام بخش بیشتر اهمیت می‌دهید؟', required: true,
        config: { choices: [ { id: 'c1', label: 'سرعت' }, { id: 'c2', label: 'سادگی' }, { id: 'c3', label: 'امکانات' }, { id: 'c4', label: 'پشتیبانی' } ] } },
      { type: 'long_text', title: 'مشکل یا پیشنهاد خود را بنویسید:', config: { maxLength: 1200 } },
      { type: 'email', title: 'اگر مایل هستید پاسخ را برایتان ارسال کنیم، ایمیل بگذارید (اختیاری)' },
    ],
  },
  {
    id: 'request-form',
    title: 'فرم ثبت درخواست',
    description: 'ثبت و پیگیری درخواست‌های مشتریان با اولویت‌بندی.',
    category: 'ثبت‌نام و درخواست',
    formType: 'form',
    questions: [
      { type: 'short_text', title: 'عنوان درخواست', required: true, config: { minLength: 5, maxLength: 150 } },
      { type: 'single_choice', title: 'نوع درخواست', required: true,
        config: { choices: [ { id: 'c1', label: 'پشتیبانی فنی' }, { id: 'c2', label: 'امور مالی' }, { id: 'c3', label: 'پیشنهاد همکاری' }, { id: 'c4', label: 'سایر' } ], allowOther: true } },
      { type: 'single_choice', title: 'اولویت شما', required: true,
        config: { choices: [ { id: 'c1', label: 'کم' }, { id: 'c2', label: 'متوسط' }, { id: 'c3', label: 'فوری' } ] } },
      { type: 'long_text', title: 'توضیح کامل درخواست', required: true, config: { minLength: 20, maxLength: 3000 } },
      { type: 'email', title: 'ایمیل جهت پاسخ‌گویی', required: true },
    ],
  },
]

export function templateById(id: string): TemplateDef | undefined {
  return templates.find((t) => t.id === id)
}

/** Convert a template into full Question objects ready to persist. */
export function instantiateTemplate(tpl: TemplateDef): Question[] {
  return tpl.questions.map((tq, i) => ({
    id: `q_${Math.random().toString(36).slice(2, 10)}${i}`,
    type: tq.type,
    title: tq.title,
    description: tq.description ?? '',
    required: tq.required ?? false,
    position: i,
    config: { ...(tq.config ?? {}) },
    scoring: tq.scoring ?? null,
    conditionalRules: null,
    conditionalMode: 'any' as const,
  }))
}
