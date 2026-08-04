-- Þjónustukönnun: extends the surveys feature with richer question types,
-- English columns, an AI-summary cache table, and seeds the service survey.
-- Idempotent — safe to run more than once. Apply in the Supabase SQL editor.

-- 1. Bilingual survey-level columns (per-question EN lives in questions JSONB),
--    plus display layout and per-survey institution branding (logo + name), so
--    the same survey engine can be branded for HSU, other institutions, etc.
alter table public.surveys add column if not exists title_en text;
alter table public.surveys add column if not exists description_en text;
alter table public.surveys add column if not exists layout text not null default 'list';
alter table public.surveys add column if not exists brand_name text;
alter table public.surveys add column if not exists brand_logo_url text;

-- 2. Cached AI summary, one row per survey (regenerate = upsert). All reads and
--    writes go through the service-role API, so RLS is enabled with no policies
--    (denies anon/authenticated; the service role bypasses RLS).
create table if not exists public.survey_ai_summaries (
  survey_id         uuid primary key references public.surveys(id) on delete cascade,
  summary_md        text,
  themes_jsonb      jsonb not null default '[]',
  praise_jsonb      jsonb not null default '[]',
  concerns_jsonb    jsonb not null default '[]',
  action_items_jsonb jsonb not null default '[]',
  responses_count   integer not null default 0,
  model             text,
  generated_by      uuid references public.staff(id) on delete set null,
  generated_by_name text,
  generated_at      timestamptz not null default now()
);
alter table public.survey_ai_summaries enable row level security;

-- 3. Seed the þjónustukönnun (draft; publish it from the admin when ready).
insert into public.surveys (slug, title, title_en, description, description_en, status, questions)
values (
  'thjonustukonnun',
  'Þjónustukönnun',
  'Service survey',
  'Takk fyrir að nota Fjarlækningar. Það tekur um 2 mínútur að svara könnunina. Svör þín hjálpa okkur að bæta þjónustuna. Öll svör eru meðhöndluð sem trúnaðarupplýsingar og eru nafnlaus.',
  'Thank you for using Fjarlækningar. The survey takes about 2 minutes. Your answers help us improve the service. All answers are treated as confidential and anonymous.',
  'draft',
  $json$[
    {
      "id": "resolution",
      "type": "single_choice",
      "required": true,
      "label": "Fékkstu lausn á erindinu sem þú leitaðir í fjarlækningaþjónustuna með?",
      "labelEn": "Did you get a resolution for the issue you sought telemedicine care for?",
      "options": ["Já, að fullu", "Já, að hluta", "Nei"],
      "optionsEn": ["Yes, fully", "Yes, partly", "No"]
    },
    {
      "id": "sought_other",
      "type": "yes_no",
      "required": true,
      "label": "Þurftir þú að leita í aðra heilbrigðisþjónustu vegna sama erindis?",
      "labelEn": "Did you have to seek other healthcare for the same issue?"
    },
    {
      "id": "where",
      "type": "single_choice",
      "required": false,
      "label": "Hvert þurftir þú að leita?",
      "labelEn": "Where did you have to go?",
      "options": ["Á heilsugæslu", "Á bráðamóttöku", "Læknavakt", "Annað"],
      "optionsEn": ["Primary care", "Emergency room", "Out-of-hours clinic", "Other"],
      "showIf": { "questionId": "sought_other", "equals": ["Já"] }
    },
    {
      "id": "where_other",
      "type": "text",
      "required": false,
      "label": "Hvert þurftir þú að leita? (ef valið er annað)",
      "labelEn": "Where did you have to go? (if other)",
      "showIf": { "questionId": "where", "equals": ["Annað"] }
    },
    {
      "id": "service",
      "type": "single_choice",
      "required": false,
      "label": "Hvaða þjónustu fórstu í?",
      "labelEn": "Which service did you use?",
      "helper": "Mundu að þessar upplýsingar eru trúnaðarupplýsingar og eru nafnlausar.",
      "helperEn": "Remember, this information is confidential and anonymous.",
      "options": ["Kvef, hósti, hálsbólga", "Þvagfæra- og leggangasýkingar", "Getnaðarvörn", "Frjókornaofnæmi", "Frunsa", "Ristill", "Risvandamál", "Njálgur", "Lyfjaendurnýjun", "Læknisvottorð"],
      "optionsEn": ["Cold, cough, sore throat", "Urinary & vaginal infections", "Contraception", "Pollen allergy", "Cold sore", "Shingles", "Erectile dysfunction", "Threadworm", "Prescription renewal", "Medical certificate"]
    },
    {
      "id": "overall",
      "type": "scale",
      "required": true,
      "min": 1, "max": 5,
      "label": "Á heildina litið, hversu ánægð(ur) varstu með þjónustu Fjarlækninga?",
      "labelEn": "Overall, how satisfied were you with Fjarlækningar's service?",
      "minLabel": "Mjög óánægð(ur)", "maxLabel": "Mjög ánægð(ur)",
      "minLabelEn": "Very dissatisfied", "maxLabelEn": "Very satisfied"
    },
    {
      "id": "ease",
      "type": "scale",
      "required": true,
      "min": 1, "max": 5,
      "label": "Hversu einfalt var ferlið í heild?",
      "labelEn": "How simple was the process overall?",
      "minLabel": "Mjög flókið", "maxLabel": "Mjög einfalt",
      "minLabelEn": "Very difficult", "maxLabelEn": "Very simple"
    },
    {
      "id": "waittime",
      "type": "scale",
      "required": true,
      "min": 1, "max": 5,
      "label": "Hversu ánægð(ur) varstu með biðtímann eftir svari frá lækni?",
      "labelEn": "How satisfied were you with the wait time for a reply from the doctor?",
      "minLabel": "Mjög óánægð(ur)", "maxLabel": "Mjög ánægð(ur)",
      "minLabelEn": "Very dissatisfied", "maxLabelEn": "Very satisfied"
    },
    {
      "id": "questionnaire_clear",
      "type": "scale",
      "required": true,
      "min": 1, "max": 5,
      "label": "Spurningalistinn sem ég fyllti út í upphafi var skýr og auðskiljanlegur.",
      "labelEn": "The questionnaire I filled out at the start was clear and easy to understand.",
      "minLabel": "Mjög ósammála", "maxLabel": "Mjög sammála",
      "minLabelEn": "Strongly disagree", "maxLabelEn": "Strongly agree"
    },
    {
      "id": "hometest",
      "type": "yes_no",
      "required": true,
      "label": "Þurftir þú að taka heimapróf?",
      "labelEn": "Did you have to take a home test?"
    },
    {
      "id": "hometest_ease",
      "type": "scale",
      "required": false,
      "min": 1, "max": 5,
      "label": "Hversu einfalt fannst þér ferlið með heimaprófið?",
      "labelEn": "How simple did you find the home-test process?",
      "minLabel": "Mjög flókið", "maxLabel": "Mjög einfalt",
      "minLabelEn": "Very difficult", "maxLabelEn": "Very simple",
      "showIf": { "questionId": "hometest", "equals": ["Já"] }
    },
    {
      "id": "doctor_solution",
      "type": "scale",
      "required": true,
      "min": 1, "max": 5,
      "label": "Hversu ánægð(ur) varstu með úrlausnina og ráðleggingarnar frá lækninum?",
      "labelEn": "How satisfied were you with the resolution and advice from the doctor?",
      "minLabel": "Mjög óánægð(ur)", "maxLabel": "Mjög ánægð(ur)",
      "minLabelEn": "Very dissatisfied", "maxLabelEn": "Very satisfied"
    },
    {
      "id": "doctor_clear",
      "type": "scale",
      "required": true,
      "min": 1, "max": 5,
      "label": "Læknirinn útskýrði niðurstöðuna og næstu skref á skýran hátt.",
      "labelEn": "The doctor explained the outcome and next steps clearly.",
      "minLabel": "Mjög ósammála", "maxLabel": "Mjög sammála",
      "minLabelEn": "Strongly disagree", "maxLabelEn": "Strongly agree"
    },
    {
      "id": "recommend",
      "type": "nps",
      "required": true,
      "min": 0, "max": 5,
      "label": "Hversu líklegt er að þú mælir með Fjarlækningum við vin eða fjölskyldu?",
      "labelEn": "How likely are you to recommend Fjarlækningar to a friend or family member?",
      "minLabel": "Mjög ólíklegt", "maxLabel": "Mjög líklegt",
      "minLabelEn": "Very unlikely", "maxLabelEn": "Very likely"
    },
    {
      "id": "open",
      "type": "textarea",
      "required": false,
      "label": "Er eitthvað sem við hefðum getað gert betur — eða viltu hrósa einhverju?",
      "labelEn": "Is there anything we could have done better — or would you like to praise something?",
      "helper": "Ef þú hefur ekkert til að skrifa hér getur þú haldið áfram.",
      "helperEn": "If you have nothing to add here, you can continue."
    }
  ]$json$::jsonb
)
on conflict (slug) do nothing;
