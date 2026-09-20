# Service evaluation

`/admin/evaluation` — what we want to be able to say about the HSU partnership,
and the evidence for it.

| Part | Where |
|---|---|
| Overview, library, modules, setup, data, results | `/admin/evaluation` (admin) |
| Module catalogue | `src/lib/evaluation/modules.ts` + `modules-extra.ts` |
| Derivation from the enabled set | `src/lib/evaluation/programme.ts` |
| Aggregation | `src/lib/evaluation/totals.ts` |
| Medalia import | `src/lib/evaluation/import.ts` |
| CSV, report, charts, slides | `src/lib/evaluation/export.ts` |
| Tables | `supabase/evaluation-schema.sql`, `evaluation-modules-2.sql` |

Stations come from the rollout module (`site_settings.station_onboarding`) so
there is one truth about which stations exist.

## The idea

The programme is **assembled from research modules** rather than fixed in code,
because what to measure is a clinical decision and not an engineering one. Each
module is one thing a medical advisor can accept or reject on its own merits,
and it carries everything that decision needs: the question it answers, the
claim it earns, the practical benefit, the argument for it, what it cannot
show, the protocol, its monthly fields, its documents and its metrics.

**Everything the interface shows is derived from the enabled set.** The data
entry fields, the documents you are asked for, the setup steps and the
dashboard metrics are projections of the same source — never a second list to
keep in step. Switch a module off and its fields, documents, steps and numbers
all go with it. Measured: core modules alone ask for 12 fields and show 6
metrics; all 29 ask for 58 and show 41.

Three modules are **core** and cannot be removed — resolution, incidents and
response time. Without them there is no evaluation, only anecdote.

## The five categories

| Category | Question | Headline |
|---|---|---|
| **Effectiveness** | Do the cases get resolved? | Resolution rate |
| **Safety** *(gate)* | Is anyone harmed? | Serious incidents |
| **Workload relief** | Does this take work off the health centre? | Workload relief, net |
| **Patient experience** | Was this better for the person? | Said it was simple |
| **Scalability** *(gate)* | Can this be repeated at the next site? | Shift coverage |

Safety and scalability are **gates rather than scales**: an excellent
resolution rate alongside one serious incident is a failed project, and no good
number elsewhere offsets it. The dashboard says so rather than leaving it to be
inferred from a colour.

## Three conventions worth knowing

**Blank is not zero.** An unmeasured field is stored as null and shown as
*Pending* with the source that is missing. "No serious incidents" and "we did
not look for serious incidents" are different statements.

**Derived figures carry their assumption.** Workload relief is resolved cases ×
minutes, so the assumption is part of the claim and appears with it. Until the
time-and-motion study is ticked off, the figure is labelled an **estimate** and
says it does not belong in a presentation.

**Two orderings, both right.** Data entry is grouped by *where the number comes
from* — that is who you have to ask, and the order the work happens in. The
dashboard is grouped by *what the figure proves* — that is the conversation.

## Staffing comes from our own rota

Coverage, doctors on shift, swaps and the independent patient count come from
`roster_*` (Rota, under Staff) — **not** `hsu_*`, which is the on-call system we
built *for* HSU and says nothing about whether our service was covered.

These figures are **service-wide, not per station**: the same doctor covers
every site, so they do not change when a station is selected. The page says so,
because otherwise somebody reads "100% covered" on a station tab and believes
it is about that station. Distinct doctors are counted over the selected
window, never summed between months — one doctor in August and three in
September is three, not four.

`roster_shifts.patients_seen` is an **independent counter** against Medalia's
case count. Two counters that agree are much stronger than one that cannot be
checked; if they diverge, one is wrong and you need to know before the figure
reaches a report.

## The Medalia export

**One line per station × month × case type.** The finest grain that is still
entirely non-identifying, and it delivers both the per-case-type breakdown and
the station totals in one file. Nine stations by thirteen case types is 117
lines a month for the whole of HSU.

**No personal data — by design, not by caution.** Every line is a count, not a
person: no national ID, no date (a month is precise enough; a date at a small
station is identifying), no free text, no age band, no sex. Response time is a
duration in minutes, never a timestamp. There is nothing in the file to
protect, which is what keeps the table plainly under quality assurance.

Two columns deserve attention. `referred_urgent` is emergency care or 112
*after* the patient passed the questionnaire — a near miss of the screen, not
an ordinary referral, and the sharpest safety signal we hold. `screening_stops`
is the only evidence that the safety net works; **if Medalia does not record
stopped questionnaires today, that is the most urgent fix**, and it cannot be
reconstructed later.

The importer checks that `resolved + referred` accounts for the total and
reports the gap. A mismatch usually means the outcome field is not mandatory
yet. That arithmetic is the only defence against a broken export — which is
also why the format is a fixed contract rather than "send whatever".

### AI or CSV?

**CSV is the contract. AI never touches the numbers.** These figures go into a
report to the institution, into abstracts and possibly into a tender. If a
model misreads one you will never find out: there is no checksum and nothing to
compare against. And it is not defensible — "a model read the export" is not an
answer to give a procurement evaluator or an ethics committee. Re-running the
same file could also give different numbers, which breaks the one property a
measurement system must have.

AI belongs in three places: proposing the **column mapping** once at setup
(then frozen, with no model in the monthly loop), **categorising the free-text
general cases** that did not resolve, and **drafting the quarterly report** from
figures that already exist in the database. The rule is to use it where being
wrong is cheap and recoverable, never where the output becomes a published
claim nobody re-checks.

## Documents

The paperwork is what actually blocks an evaluation — the agreed code set, the
ethics ruling, the data-sharing agreement, the survey instrument — and it had
nowhere to live. Each module declares the documents it needs and they are
uploaded against it, in the same card as its protocol.

Files go to the private `research-docs` bucket and are served by 60-second
signed URLs. They can name a contact and carry a signature, so nothing is
public.

## Export and presentation

Three shapes, because three different people ask:

- **CSV** — every stored column for the selected window. Deliberately
  everything rather than just the enabled modules' fields, so somebody can
  check a figure you did not think to include.
- **Quarterly report (Markdown)** — the figures already filled in, with each
  module's limitation printed next to its result. Write it quarterly: four of
  these plus a summary *are* the annual report, and each is a rehearsal at
  defending the numbers in front of people who know the service.
- **Presentation** — generates a deck into `/admin/presentations` with charts,
  then edit it like any other. Charts are rendered as SVG and uploaded to the
  public `presentation-assets` bucket, so a slide references them by URL and a
  chart once written down does not silently change when next month's data
  arrives.

The generated deck ends on a **limitations slide before the closing one**, on
purpose. An audience that hears the limitations from you owns none of the
discussion afterwards; one that spots them itself owns all of it.

## The legal position

Evaluating and improving your own service is **internal quality assurance**
under the Directorate of Health Act (nr. 41/2007). It requires neither patient
consent nor an ethics committee, and it covers everything this system does:
reports to the institution, the dashboard, cost figures, tender material.

Publishing brings it under nr. 44/2014 — but that act lets the National
Bioethics Committee **waive informed consent for register studies**, and such
waivers are granted routinely for exactly this kind of work. So it is not a
question of consent but of one letter, sent early rather than at an abstract
deadline.

**Do not add a consent checkbox.** In a care relationship consent is a weak
lawful basis, because the patient is not in a position to refuse. Worse, you
would then have to exclude everyone who declines — biasing the sample — and
maintain a consent register forever. Update the privacy notice instead: that is
an information duty, not consent.

**Return visits within 7 days** would require linking two patient records,
which is research processing and does not pass as quality assurance. The
institution runs the query at their end and hands over the count only. Then
each party works in its own data and nothing crosses but a number. The same
arrangement covers diagnostic concordance.

**Small cells:** suppress or combine anything with fewer than five cases in
material that leaves the building. The dashboard greys those rates as a
reminder.

## Where to start

If you do one thing from the whole catalogue: **agree the ICD-10 code sets with
a clinician, and get the institution to run the baseline on them.** The codes
are the join key between our numerator and their denominator. Without them
every number we produce is self-referential — "400 cases" means nothing to a
listener. With them you can set your figures against the national contact
register and say what share of the expected volume for a population this size
you handled, which is an entirely different claim.

The time-critical steps are flagged throughout and counted on the overview.
They are the ones that cannot be recovered: a baseline not collected while
goodwill is fresh is not collected at all, and a time study that starts after
people have got used to the service no longer measures what it was meant to.
