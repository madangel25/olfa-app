-- Quiz questions table for admin-managed onboarding quiz (AR/EN).
-- Replaces hardcoded quiz in translations for dynamic editing.

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  order_index integer not null default 0,
  category text not null default '',
  title_en text not null default '',
  title_ar text not null default '',
  subtitle_en text not null default '',
  subtitle_ar text not null default '',
  options jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.quiz_questions is 'Onboarding quiz questions and options (AR/EN), editable by admins.';
comment on column public.quiz_questions.options is 'Array of { value, label_en, label_ar, helper_en?, helper_ar? }';

create index if not exists idx_quiz_questions_order on public.quiz_questions(order_index);
alter table public.quiz_questions add constraint quiz_questions_category_key unique (category);

alter table public.quiz_questions enable row level security;

-- Authenticated users can read (for quiz page).
create policy "Authenticated can read quiz_questions"
  on public.quiz_questions for select
  to authenticated
  using (true);

-- Only admins can modify.
create policy "Admins can insert quiz_questions"
  on public.quiz_questions for insert
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

create policy "Admins can update quiz_questions"
  on public.quiz_questions for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

create policy "Admins can delete quiz_questions"
  on public.quiz_questions for delete
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Seed default 5 questions (EN/AR) from current app.
insert into public.quiz_questions (order_index, category, title_en, title_ar, subtitle_en, subtitle_ar, options)
values
  (0, 'financial_views',
   'How do you view financial responsibility in marriage?',
   'كيف تنظر إلى المسؤولية المالية في الزواج؟',
   'Think about provision, saving, and decision-making around money.',
   'فكّر في النفقة والادخار واتخاذ القرار في الشؤون المالية.',
   '[
     {"value":"traditional_provider","label_en":"One primary provider, shared consultation on big decisions","label_ar":"معيل واحد أساسي مع مشورة مشتركة في القرارات الكبرى","helper_en":"Clear roles, but decisions are made together with shura.","helper_ar":"أدوار واضحة مع اتخاذ القرار معاً بالشورى."},
     {"value":"shared_contribution","label_en":"Both can contribute, with agreed responsibilities","label_ar":"كلا الطرفين يساهمان بمسؤوليات متفق عليها","helper_en":"Flexible contribution as long as expectations are clear.","helper_ar":"مساهمة مرنة طالما التوقعات واضحة."},
     {"value":"fully_joint","label_en":"Everything is fully joint with equal say","label_ar":"كل شيء مشترك بمساواة في الرأي","helper_en":"No separation of income, all financial choices are shared.","helper_ar":"لا فصل في الدخل، كل الخيارات المالية مشتركة."},
     {"value":"independent_budgets","label_en":"Largely independent budgets with some shared costs","label_ar":"ميزانيات مستقلة إلى حد كبير مع تكاليف مشتركة","helper_en":"More autonomy around money, minimal shared pooling.","helper_ar":"مزيد من الاستقلالية مالياً مع حد أدنى من التجمع."}
   ]'::jsonb),
  (1, 'social_roles',
   'How do you see social and household roles?',
   'كيف ترى الأدوار الاجتماعية والأسرية؟',
   'Consider responsibilities inside and outside the home, informed by deen.',
   'فكّر في المسؤوليات داخل المنزل وخارجه، وفقاً للدين.',
   '[
     {"value":"clearly_defined_roles","label_en":"Prefer clearly defined, traditional roles","label_ar":"أفضل أدواراً تقليدية محددة بوضوح","helper_en":"Roles are mostly set, with occasional flexibility.","helper_ar":"أدوار ثابتة في الغالب مع مرونة عرضية."},
     {"value":"complementary_roles","label_en":"Complementary roles based on strengths","label_ar":"أدوار مكملة حسب القدرات","helper_en":"You discuss and divide roles according to ability and season.","helper_ar":"تتحدثان وتقسمان الأدوار حسب القدرة والمرحلة."},
     {"value":"fully_shared_roles","label_en":"Most roles are shared and negotiated regularly","label_ar":"معظم الأدوار مشتركة ومتفاوض عليها بانتظام","helper_en":"You prefer frequent renegotiation of who does what.","helper_ar":"تفضّل إعادة التفاوض المتكررة على من يفعل ماذا."},
     {"value":"case_by_case","label_en":"Case-by-case, not attached to specific labels","label_ar":"حسب الحالة، دون التزام بتسميات محددة","helper_en":"You prioritise practicality more than structure.","helper_ar":"تعطي الأولوية للجدوى العملية أكثر من الهيكل."}
   ]'::jsonb),
  (2, 'anger_management',
   'How do you typically handle anger and conflict?',
   'كيف تتعامل عادة مع الغضب والخلاف؟',
   'Be honest about how you react under pressure, not just how you wish to be.',
   'كن صريحاً في كيفية رد فعلك تحت الضغط، وليس فقط كما تتمنى.',
   '[
     {"value":"cooling_off_first","label_en":"I prefer to cool off alone, then talk calmly","label_ar":"أفضل أن أهدأ وحدي ثم أتحدث بهدوء","helper_en":"You need space before you can resolve issues.","helper_ar":"تحتاج مسافة قبل حل المشكلة."},
     {"value":"structured_discussion","label_en":"I like structured, respectful discussion soon after","label_ar":"أفضل نقاشاً منظماً ومحترماً قريباً من الحدث","helper_en":"You want to resolve things before they linger too long.","helper_ar":"تريد حل الأمور قبل أن تتراكم."},
     {"value":"avoidant","label_en":"I tend to avoid conflict and hope it passes","label_ar":"أميل لتجنب الخلاف وأتمنى أن يمر","helper_en":"You may need encouragement to address recurring issues.","helper_ar":"قد تحتاج تشجيعاً لمعالجة المشاكل المتكررة."},
     {"value":"expressive_then_regret","label_en":"I may react strongly, then regret it and apologise","label_ar":"قد أتفاعل بقوة ثم أندم وأعتذر","helper_en":"You are working on emotional regulation and repair.","helper_ar":"تعمل على ضبط المشاعر والإصلاح."}
   ]'::jsonb),
  (3, 'lifestyle',
   'Which lifestyle pace feels most natural to you?',
   'أي وتيرة حياة تشعرك بأنها طبيعية؟',
   'Think about daily routine, socialising, work–life balance, and rest.',
   'فكّر في الروتين اليومي والاختلاط والتوازن بين العمل والحياة والراحة.',
   '[
     {"value":"quiet_and_routine","label_en":"Quiet, predictable, and routine-focused","label_ar":"هادئة ومنتظمة ومركزة على الروتين","helper_en":"You value calm, stability, and familiar rhythms.","helper_ar":"تقدر الهدوء والاستقرار والإيقاع المألوف."},
     {"value":"balanced","label_en":"Balanced mix of routine and occasional activity","label_ar":"مزيج متوازن من الروتين والنشاط العرضي","helper_en":"You enjoy some socialising but need regular downtime.","helper_ar":"تستمتع بالاختلاط لكن تحتاج وقت راحة منتظم."},
     {"value":"very_active","label_en":"Very active, social, and externally engaged","label_ar":"نشطة جداً واجتماعية ومنفتحة على الخارج","helper_en":"You enjoy events, travel, and frequent outings.","helper_ar":"تستمتع بالفعاليات والسفر والتنقل المتكرر."},
     {"value":"highly_ambitious","label_en":"Highly ambitious, driven, and goal-oriented","label_ar":"طموحة جداً وموجهة نحو الأهداف","helper_en":"You prioritise projects and growth, sometimes over rest.","helper_ar":"تعطي الأولوية للمشاريع والنمو أحياناً على الراحة."}
   ]'::jsonb),
  (4, 'interests',
   'What kind of shared interests matter most to you?',
   'أي نوع من الاهتمامات المشتركة يهمك أكثر؟',
   'This is about how you prefer to connect and spend time together.',
   'هذا عن كيفية تفضيلك للتواصل وقضاء الوقت معاً.',
   '[
     {"value":"spiritual_growth","label_en":"Spiritual growth and Islamic learning together","label_ar":"النمو الروحي والتعلم الإسلامي معاً","helper_en":"Circles, classes, Qur''an, and mutual reminders are central.","helper_ar":"الحلقات والدروس والقرآن والمواعظ المشتركة أساسية."},
     {"value":"intellectual_and_creative","label_en":"Intellectual or creative pursuits","label_ar":"الميول الفكرية أو الإبداعية","helper_en":"Books, ideas, building things, or creative projects.","helper_ar":"الكتب والأفكار وبناء المشاريع أو الإبداع."},
     {"value":"experiences","label_en":"Experiences and activities","label_ar":"التجارب والأنشطة","helper_en":"Travel, food, nature, and shared adventures.","helper_ar":"السفر والطعام والطبيعة والمغامرات المشتركة."},
     {"value":"home_and_family","label_en":"Home, family, and close-knit gatherings","label_ar":"المنزل والعائلة واللقاءات الحميمة","helper_en":"You value a deep, private, family-centred life.","helper_ar":"تقدر حياة عميقة وخاصة ومركزة على العائلة."}
   ]'::jsonb)
on conflict (category) do update set
  order_index = excluded.order_index,
  title_en = excluded.title_en,
  title_ar = excluded.title_ar,
  subtitle_en = excluded.subtitle_en,
  subtitle_ar = excluded.subtitle_ar,
  options = excluded.options,
  updated_at = now();
