// Editable content model for /thjonusta.
// Defaults are verbatim from the original hard-coded page.

import { emptyDefaults, type LocaleContent, type SiteField, type SiteSection } from "./types";
// Reorderable bands, in their built-in order. The hero/page header is not
// listed: it is structural and always renders first.
export const THJONUSTA_SECTIONS: SiteSection[] = [
  { id: "erindi", label: "Algeng erindi" },
  { id: "ferlid", label: "Ferlið" },
  { id: "tests", label: "Heimapróf" },
  { id: "live", label: "Virk þjónusta" },
  { id: "limits", label: "Hvenær hentar ekki" },
  { id: "faq", label: "Algengar spurningar" },
];


export const THJONUSTA_FIELDS: SiteField[] = [
  // Hero
  { key: "hero_eyebrow", label: "Merki (lítill borði)", group: "Hetjusvæði", type: "text" },
  { key: "hero_heading", label: "Fyrirsögn", group: "Hetjusvæði", type: "heading" },
  { key: "hero_body", label: "Undirtexti", group: "Hetjusvæði", type: "textarea" },

  // Erindi list
  { key: "erindi_heading", label: "Fyrirsögn", group: "Algeng erindi", type: "heading" },
  { key: "erindi_body", label: "Texti", group: "Algeng erindi", type: "textarea" },
  { key: "erindi_footer", label: "Neðanmálstexti", group: "Algeng erindi", type: "text" },

  // The process — the single canonical description of how the service works.
  // This used to be split in two: five numbered steps on the home page and six
  // feature cards here, which restated the same five things in a different
  // format. Five of the six cards duplicated a step. They are now merged, with
  // each card's specifics folded into the step it belonged to, so a patient
  // reads the process once, in order, in one place.
  { key: "how_heading", label: "Fyrirsögn", group: "Ferlið", type: "heading" },
  { key: "how_body", label: "Texti", group: "Ferlið", type: "textarea" },
  { key: "step1_title", label: "Skref 1 — titill", group: "Ferlið", type: "text" },
  { key: "step1_desc", label: "Skref 1 — lýsing", group: "Ferlið", type: "textarea" },
  { key: "step2_title", label: "Skref 2 — titill", group: "Ferlið", type: "text" },
  { key: "step2_desc", label: "Skref 2 — lýsing", group: "Ferlið", type: "textarea" },
  { key: "step3_title", label: "Skref 3 — titill", group: "Ferlið", type: "text" },
  { key: "step3_desc", label: "Skref 3 — lýsing", group: "Ferlið", type: "textarea" },
  { key: "step4_title", label: "Skref 4 — titill", group: "Ferlið", type: "text" },
  { key: "step4_desc", label: "Skref 4 — lýsing", group: "Ferlið", type: "textarea" },
  { key: "step5_title", label: "Skref 5 — titill", group: "Ferlið", type: "text" },
  { key: "step5_desc", label: "Skref 5 — lýsing", group: "Ferlið", type: "textarea" },
  // Optional extra steps. Filled slots render in order and auto-number, so
  // staff can add or remove numbered points from the CMS without a gap.
  { key: "step6_title", label: "Skref 6 — titill (valfrjálst)", group: "Ferlið", type: "text" },
  { key: "step6_desc", label: "Skref 6 — lýsing", group: "Ferlið", type: "textarea" },
  { key: "step7_title", label: "Skref 7 — titill (valfrjálst)", group: "Ferlið", type: "text" },
  { key: "step7_desc", label: "Skref 7 — lýsing", group: "Ferlið", type: "textarea" },
  { key: "step8_title", label: "Skref 8 — titill (valfrjálst)", group: "Ferlið", type: "text" },
  { key: "step8_desc", label: "Skref 8 — lýsing", group: "Ferlið", type: "textarea" },

  // Heimapróf. Step 2 of the process mentions these in passing; this section is
  // the practical detail, because fetching a test yourself is the one piece of
  // friction in an otherwise at-home flow. "Hvar" is a comma-separated list.
  { key: "tests_heading", label: "Fyrirsögn", group: "Heimapróf", type: "heading" },
  { key: "tests_body", label: "Inngangur", group: "Heimapróf", type: "textarea" },
  { key: "test1_title", label: "Próf 1 — heiti", group: "Heimapróf", type: "text" },
  { key: "test1_desc", label: "Próf 1 — lýsing", group: "Heimapróf", type: "textarea" },
  { key: "test1_when", label: "Próf 1 — á við um (erindi)", group: "Heimapróf", type: "text" },
  { key: "test1_where", label: "Próf 1 — hvar (aðskilið með kommu)", group: "Heimapróf", type: "text" },
  { key: "test1_img", label: "Próf 1 — mynd af pakkningu (slóð)", group: "Heimapróf", type: "text" },
  { key: "test1_icon", label: "Próf 1 — tákn (vara, notað ef mynd vantar)", group: "Heimapróf", type: "icon" },
  { key: "test2_title", label: "Próf 2 — heiti", group: "Heimapróf", type: "text" },
  { key: "test2_desc", label: "Próf 2 — lýsing", group: "Heimapróf", type: "textarea" },
  { key: "test2_when", label: "Próf 2 — á við um (erindi)", group: "Heimapróf", type: "text" },
  { key: "test2_where", label: "Próf 2 — hvar (aðskilið með kommu)", group: "Heimapróf", type: "text" },
  { key: "test2_img", label: "Próf 2 — mynd af pakkningu (slóð)", group: "Heimapróf", type: "text" },
  { key: "test2_icon", label: "Próf 2 — tákn (vara, notað ef mynd vantar)", group: "Heimapróf", type: "icon" },
  { key: "test3_title", label: "Próf 3 — heiti", group: "Heimapróf", type: "text" },
  { key: "test3_desc", label: "Próf 3 — lýsing", group: "Heimapróf", type: "textarea" },
  { key: "test3_when", label: "Próf 3 — á við um (erindi)", group: "Heimapróf", type: "text" },
  { key: "test3_where", label: "Próf 3 — hvar (aðskilið með kommu)", group: "Heimapróf", type: "text" },
  { key: "test3_img", label: "Próf 3 — mynd af pakkningu (slóð)", group: "Heimapróf", type: "text" },
  { key: "test3_icon", label: "Próf 3 — tákn (vara, notað ef mynd vantar)", group: "Heimapróf", type: "icon" },
  // Why home tests exist, and what they are / are not. Clinically sensitive:
  // see the sign-off note in the defaults.
  { key: "tests_why_heading", label: "Af hverju — fyrirsögn", group: "Heimapróf", type: "text" },
  { key: "tests_why_body", label: "Af hverju — texti", group: "Heimapróf", type: "textarea" },
  { key: "tests_accuracy", label: "Áreiðanleiki — texti", group: "Heimapróf", type: "textarea" },
  // How it works in the sjúklingagátt. Each step takes an optional screenshot
  // and highlight boxes, written as "x,y,w,h" in PERCENT of the image, several
  // separated by ";" — e.g. "12,40,55,12; 12,60,55,10".
  { key: "tests_how_heading", label: "Í gáttinni — fyrirsögn", group: "Heimapróf", type: "text" },
  { key: "tests_s1_title", label: "Skref 1 — titill", group: "Heimapróf", type: "text" },
  { key: "tests_s1_desc", label: "Skref 1 — lýsing", group: "Heimapróf", type: "textarea" },
  { key: "tests_s1_img", label: "Skref 1 — skjámynd (slóð)", group: "Heimapróf", type: "text" },
  { key: "tests_s1_hl", label: "Skref 1 — áherslusvæði (x,y,b,h í %)", group: "Heimapróf", type: "text" },
  { key: "tests_s2_title", label: "Skref 2 — titill", group: "Heimapróf", type: "text" },
  { key: "tests_s2_desc", label: "Skref 2 — lýsing", group: "Heimapróf", type: "textarea" },
  { key: "tests_s2_img", label: "Skref 2 — skjámynd (slóð)", group: "Heimapróf", type: "text" },
  { key: "tests_s2_hl", label: "Skref 2 — áherslusvæði (x,y,b,h í %)", group: "Heimapróf", type: "text" },
  { key: "tests_s3_title", label: "Skref 3 — titill", group: "Heimapróf", type: "text" },
  { key: "tests_s3_desc", label: "Skref 3 — lýsing", group: "Heimapróf", type: "textarea" },
  { key: "tests_s3_img", label: "Skref 3 — skjámynd (slóð)", group: "Heimapróf", type: "text" },
  { key: "tests_s3_hl", label: "Skref 3 — áherslusvæði (x,y,b,h í %)", group: "Heimapróf", type: "text" },
  { key: "tests_footer", label: "Neðanmálstexti", group: "Heimapróf", type: "textarea" },

  // Where the service is live. One location per line so staff can add as many
  // heilsugaeslur as they like from the admin editor without a schema change:
  //   Nafn | Texti
  // The text after "|" is optional; a line with no "|" renders as name only.
  { key: "live_heading", label: "Fyrirsögn", group: "Virk þjónusta", type: "heading" },
  { key: "live_body", label: "Inngangur", group: "Virk þjónusta", type: "textarea" },
  // Umbrella organisations (HSU, HSN, ...), their heilsugæslur, and where
  // patients of an open heilsugæsla can collect home tests. One per line, so
  // the rollout can grow without a schema change:
  //   Stofnun | undirtexti | /logo.webp      <- umbrella (no prefix)
  //   + Heilsugæsla | texti                  <- open now
  //   - Heilsugæsla                          <- not yet open
  //   * Staður | heimilisfang | prófin       <- test pickup point for the
  //                                             nearest "+" line above it
  { key: "live_locations", label: "Stofnanir, heilsugæslur og afhendingarstaðir (sjá snið að neðan)", group: "Virk þjónusta", type: "textarea" },
  { key: "live_pickup_label", label: "Hnappur — afhendingarstaðir", group: "Virk þjónusta", type: "text" },
  { key: "live_footer", label: "Neðanmálstexti", group: "Virk þjónusta", type: "text" },

  // FAQ
  // Scope/limits — what fjarlækningar is NOT for. Clinically sensitive: the
  // defaults are assembled verbatim from Fjarlækningar's own existing copy
  // (erindi descriptions + the HSU referral collateral), not written fresh.
  { key: "limits_heading", label: "Fyrirsögn", group: "Hvenær hentar ekki", type: "heading" },
  { key: "limits_body", label: "Inngangur", group: "Hvenær hentar ekki", type: "textarea" },
  { key: "limits1_title", label: "Atriði 1 — titill", group: "Hvenær hentar ekki", type: "text" },
  { key: "limits1_body", label: "Atriði 1 — texti", group: "Hvenær hentar ekki", type: "textarea" },
  { key: "limits1_icon", label: "Atriði 1 — tákn", group: "Hvenær hentar ekki", type: "icon" },
  // Expandable red-flag panel on the "Alvarleg einkenni" card: what the
  // symptoms are, then what to do about them. Clearing limits1_items collapses
  // the card back to a plain one.
  { key: "limits1_lead", label: "Atriði 1 — inngangur að einkennalista", group: "Hvenær hentar ekki", type: "text" },
  { key: "limits1_items", label: "Atriði 1 — einkenni (ein lína hvert)", group: "Hvenær hentar ekki", type: "textarea" },
  { key: "limits1_action_lead", label: "Atriði 1 — inngangur að úrræðum", group: "Hvenær hentar ekki", type: "text" },
  { key: "limits1_actions", label: "Atriði 1 — úrræði (ein lína hvert)", group: "Hvenær hentar ekki", type: "textarea" },
  { key: "limits2_title", label: "Atriði 2 — titill", group: "Hvenær hentar ekki", type: "text" },
  { key: "limits2_body", label: "Atriði 2 — texti", group: "Hvenær hentar ekki", type: "textarea" },
  { key: "limits2_icon", label: "Atriði 2 — tákn", group: "Hvenær hentar ekki", type: "icon" },
  { key: "limits4_title", label: "Atriði 4 — titill", group: "Hvenær hentar ekki", type: "text" },
  { key: "limits4_body", label: "Atriði 4 — texti", group: "Hvenær hentar ekki", type: "textarea" },
  { key: "limits4_icon", label: "Atriði 4 — tákn", group: "Hvenær hentar ekki", type: "icon" },
  { key: "limits3_title", label: "Atriði 3 — titill", group: "Hvenær hentar ekki", type: "text" },
  { key: "limits3_body", label: "Atriði 3 — texti", group: "Hvenær hentar ekki", type: "textarea" },
  { key: "limits3_icon", label: "Atriði 3 — tákn", group: "Hvenær hentar ekki", type: "icon" },
  { key: "limits_note", label: "Áherslulína (neyðartilvik)", group: "Hvenær hentar ekki", type: "text" },

  // FAQ. One question/answer pair per number; empty pairs are dropped by the
  // view, so staff can add or remove questions from the admin editor. Answers
  // support blank-line paragraphs, "· " bullet lines ("Titill | lýsing" bolds
  // the title), auto-linked URLs, and the token {{lyfjalisti}}, which expands
  // into the collapsible medication list (the meds_* fields below).
  { key: "faq_heading", label: "Fyrirsögn", group: "Algengar spurningar", type: "heading" },
  {
    key: "faq_categories",
    label: "Flokkar (ein lína hver, í réttri röð)",
    group: "Algengar spurningar",
    type: "textarea",
    help: "Flokkarnir birtast sem pillu-hnappar undir fyrirsögninni. Hver spurning fær flokk (Flokkur 1–24) sem verður að stemma við eitt af heitunum hér.",
  },
  { key: "faq1_q", label: "Spurning 1", group: "Algengar spurningar", type: "text" },
  { key: "faq1_a", label: "Svar 1", group: "Algengar spurningar", type: "textarea" },
  { key: "faq2_q", label: "Spurning 2", group: "Algengar spurningar", type: "text" },
  { key: "faq2_a", label: "Svar 2", group: "Algengar spurningar", type: "textarea" },
  { key: "faq3_q", label: "Spurning 3", group: "Algengar spurningar", type: "text" },
  { key: "faq3_a", label: "Svar 3", group: "Algengar spurningar", type: "textarea" },
  { key: "faq4_q", label: "Spurning 4", group: "Algengar spurningar", type: "text" },
  { key: "faq4_a", label: "Svar 4", group: "Algengar spurningar", type: "textarea" },
  { key: "faq5_q", label: "Spurning 5", group: "Algengar spurningar", type: "text" },
  { key: "faq5_a", label: "Svar 5", group: "Algengar spurningar", type: "textarea" },
  { key: "faq6_q", label: "Spurning 6", group: "Algengar spurningar", type: "text" },
  { key: "faq6_a", label: "Svar 6", group: "Algengar spurningar", type: "textarea" },
  { key: "faq7_q", label: "Spurning 7", group: "Algengar spurningar", type: "text" },
  { key: "faq7_a", label: "Svar 7", group: "Algengar spurningar", type: "textarea" },
  { key: "faq8_q", label: "Spurning 8", group: "Algengar spurningar", type: "text" },
  { key: "faq8_a", label: "Svar 8", group: "Algengar spurningar", type: "textarea" },
  { key: "faq9_q", label: "Spurning 9", group: "Algengar spurningar", type: "text" },
  { key: "faq9_a", label: "Svar 9", group: "Algengar spurningar", type: "textarea" },
  { key: "faq10_q", label: "Spurning 10", group: "Algengar spurningar", type: "text" },
  { key: "faq10_a", label: "Svar 10", group: "Algengar spurningar", type: "textarea" },
  { key: "faq11_q", label: "Spurning 11", group: "Algengar spurningar", type: "text" },
  { key: "faq11_a", label: "Svar 11 (nota {{lyfjalisti}} til að birta lyfjalistann)", group: "Algengar spurningar", type: "textarea" },
  { key: "faq12_q", label: "Spurning 12", group: "Algengar spurningar", type: "text" },
  { key: "faq12_a", label: "Svar 12", group: "Algengar spurningar", type: "textarea" },
  { key: "faq13_q", label: "Spurning 13", group: "Algengar spurningar", type: "text" },
  { key: "faq13_a", label: "Svar 13", group: "Algengar spurningar", type: "textarea" },
  { key: "faq14_q", label: "Spurning 14", group: "Algengar spurningar", type: "text" },
  { key: "faq14_a", label: "Svar 14", group: "Algengar spurningar", type: "textarea" },
  { key: "faq15_q", label: "Spurning 15", group: "Algengar spurningar", type: "text" },
  { key: "faq15_a", label: "Svar 15", group: "Algengar spurningar", type: "textarea" },
  { key: "faq16_q", label: "Spurning 16", group: "Algengar spurningar", type: "text" },
  { key: "faq16_a", label: "Svar 16", group: "Algengar spurningar", type: "textarea" },
  { key: "faq17_q", label: "Spurning 17", group: "Algengar spurningar", type: "text" },
  { key: "faq17_a", label: "Svar 17", group: "Algengar spurningar", type: "textarea" },
  { key: "faq18_q", label: "Spurning 18", group: "Algengar spurningar", type: "text" },
  { key: "faq18_a", label: "Svar 18", group: "Algengar spurningar", type: "textarea" },
  { key: "faq19_q", label: "Spurning 19", group: "Algengar spurningar", type: "text" },
  { key: "faq19_a", label: "Svar 19", group: "Algengar spurningar", type: "textarea" },
  { key: "faq20_q", label: "Spurning 20", group: "Algengar spurningar", type: "text" },
  { key: "faq20_a", label: "Svar 20", group: "Algengar spurningar", type: "textarea" },
  { key: "faq21_q", label: "Spurning 21", group: "Algengar spurningar", type: "text" },
  { key: "faq21_a", label: "Svar 21", group: "Algengar spurningar", type: "textarea" },
  { key: "faq22_q", label: "Spurning 22", group: "Algengar spurningar", type: "text" },
  { key: "faq22_a", label: "Svar 22", group: "Algengar spurningar", type: "textarea" },
  { key: "faq23_q", label: "Spurning 23", group: "Algengar spurningar", type: "text" },
  { key: "faq23_a", label: "Svar 23", group: "Algengar spurningar", type: "textarea" },
  { key: "faq24_q", label: "Spurning 24", group: "Algengar spurningar", type: "text" },
  { key: "faq24_a", label: "Svar 24", group: "Algengar spurningar", type: "textarea" },

  // Flokkur hverrar spurningar — verður að stemma við eina línu í faq_categories.
  // (Ekki þýtt: sami flokkur á báðum tungumálum.)
  { key: "faq1_cat", label: "Flokkur — spurning 1", group: "Algengar spurningar", type: "text" },
  { key: "faq2_cat", label: "Flokkur — spurning 2", group: "Algengar spurningar", type: "text" },
  { key: "faq3_cat", label: "Flokkur — spurning 3", group: "Algengar spurningar", type: "text" },
  { key: "faq4_cat", label: "Flokkur — spurning 4", group: "Algengar spurningar", type: "text" },
  { key: "faq5_cat", label: "Flokkur — spurning 5", group: "Algengar spurningar", type: "text" },
  { key: "faq6_cat", label: "Flokkur — spurning 6", group: "Algengar spurningar", type: "text" },
  { key: "faq7_cat", label: "Flokkur — spurning 7", group: "Algengar spurningar", type: "text" },
  { key: "faq8_cat", label: "Flokkur — spurning 8", group: "Algengar spurningar", type: "text" },
  { key: "faq9_cat", label: "Flokkur — spurning 9", group: "Algengar spurningar", type: "text" },
  { key: "faq10_cat", label: "Flokkur — spurning 10", group: "Algengar spurningar", type: "text" },
  { key: "faq11_cat", label: "Flokkur — spurning 11", group: "Algengar spurningar", type: "text" },
  { key: "faq12_cat", label: "Flokkur — spurning 12", group: "Algengar spurningar", type: "text" },
  { key: "faq13_cat", label: "Flokkur — spurning 13", group: "Algengar spurningar", type: "text" },
  { key: "faq14_cat", label: "Flokkur — spurning 14", group: "Algengar spurningar", type: "text" },
  { key: "faq15_cat", label: "Flokkur — spurning 15", group: "Algengar spurningar", type: "text" },
  { key: "faq16_cat", label: "Flokkur — spurning 16", group: "Algengar spurningar", type: "text" },
  { key: "faq17_cat", label: "Flokkur — spurning 17", group: "Algengar spurningar", type: "text" },
  { key: "faq18_cat", label: "Flokkur — spurning 18", group: "Algengar spurningar", type: "text" },
  { key: "faq19_cat", label: "Flokkur — spurning 19", group: "Algengar spurningar", type: "text" },
  { key: "faq20_cat", label: "Flokkur — spurning 20", group: "Algengar spurningar", type: "text" },
  { key: "faq21_cat", label: "Flokkur — spurning 21", group: "Algengar spurningar", type: "text" },
  { key: "faq22_cat", label: "Flokkur — spurning 22", group: "Algengar spurningar", type: "text" },
  { key: "faq23_cat", label: "Flokkur — spurning 23", group: "Algengar spurningar", type: "text" },
  { key: "faq24_cat", label: "Flokkur — spurning 24", group: "Algengar spurningar", type: "text" },

  // Lyfjalisti — birtist þar sem {{lyfjalisti}} kemur fyrir í svari. Hver
  // flokkur verður að undirflokka-fellilista. Í lyfjareitunum táknar lína sem
  // byrjar á "# " undirfyrirsögn; aðrar línur eru lyf ("Virkt efni: sérlyf").
  { key: "meds_note", label: "Lyfjalisti — athugasemd (t.d. „listinn er ekki tæmandi“)", group: "Algengar spurningar", type: "text" },
  { key: "meds_a_title", label: "Lyfjaflokkur A — titill", group: "Algengar spurningar", type: "text" },
  { key: "meds_a_items", label: "Lyfjaflokkur A — lyf (# = undirflokkur, ein lína hvert)", group: "Algengar spurningar", type: "textarea" },
  { key: "meds_b_title", label: "Lyfjaflokkur B — titill", group: "Algengar spurningar", type: "text" },
  { key: "meds_b_items", label: "Lyfjaflokkur B — lyf (# = undirflokkur, ein lína hvert)", group: "Algengar spurningar", type: "textarea" },
  { key: "meds_c_title", label: "Lyfjaflokkur C — titill", group: "Algengar spurningar", type: "text" },
  { key: "meds_c_items", label: "Lyfjaflokkur C — lyf (# = undirflokkur, ein lína hvert)", group: "Algengar spurningar", type: "textarea" },
  { key: "meds_d_title", label: "Lyfjaflokkur D — titill", group: "Algengar spurningar", type: "text" },
  { key: "meds_d_items", label: "Lyfjaflokkur D — lyf (# = undirflokkur, ein lína hvert)", group: "Algengar spurningar", type: "textarea" },

  // Closing CTA
  { key: "cta_text", label: "Texti", group: "Ákall (CTA)", type: "text" },
  { key: "cta_button", label: "Hnappur", group: "Ákall (CTA)", type: "text" },
];

export const THJONUSTA_DEFAULTS_IS: LocaleContent = {
  hero_eyebrow: "Þjónusta Fjarlækninga",
  hero_heading: "Læknisþjónusta fyrir ==algeng erindi==",
  hero_body:
    "Fjarlækningar leysa algeng heilsugæsluerindi í gegnum örugga sjúklingagátt — án þess að þú þurfir að mæta á staðinn.",

  erindi_heading: "Algeng ==erindi==",
  erindi_body: "Flest erindi afgreidd innan tveggja klukkustunda á opnunartíma.",
  erindi_footer: "Listinn lengist jafnt og þétt eftir því sem þjónustan þróast.",

  // Merged from the old home-page steps + the six cards that used to live here.
  // Every sentence below is verbatim from one of those two sources — the merge
  // only removed repetition and put the detail on the step it describes.
  how_heading: "Ferlið frá ==upphafi til enda==",
  how_body:
    "Sömu spurningar og sama fagmennska og á læknastofu — bara skilvirkari leið til að leysa erindið. Þú svarar spurningalista heima eða þar sem þú ert, og læknir svarar innan tveggja klukkustunda á opnunartíma milli 10 og 22.",

  step1_title: "Þú velur erindi af vandamálalista",
  step1_desc:
    "Skráðu þig inn með rafrænum skilríkjum og farðu í viðeigandi ferli eftir einkennum.",
  step2_title: "Þú svarar spurningalista",
  step2_desc:
    "Spurningalistar eru sérhannaðir í samstarfi við íslenska sérfræðilækna tengt hverju vandamáli — ferlið er hannað eins og viðtal við lækni. Þegar heimapróf bætir greiningu er þér leiðbeint að taka það, t.d. þvagpróf sem sækja má á heilsugæslu eða í næsta apóteki, og skrá niðurstöðuna beint í gáttina.",
  step3_title: "Öryggisnetið metur svörin",
  step3_desc:
    "Rauð flögg í spurningalistunum vísa alvarlegum einkennum strax í rétta þjónustu. Fjarlækningar taka ekki að sér erindi sem eiga heima annars staðar — og þú greiðir ekki ef þér er vísað frá.",
  step4_title: "Læknir metur og leggur til meðferð",
  step4_desc:
    "Læknir fer yfir svörin og leggur til viðeigandi meðferð út frá sínu læknisfræðilega mati. Engin meðferð án mats læknis.",
  step5_title: "Niðurstaða, ráðleggingar og lyfseðill",
  step5_desc:
    "Þú færð skriflega niðurstöðu og ráðleggingar, og lyfseðill fer rafrænt í lyfjagátt ef þörf er á — tilbúinn í næsta apóteki. Niðurstöðunni fylgir fræðsluefni tengt þínu vandamáli: ráðleggingar, fyrirbyggjandi ráð og vörur án lyfseðils sem geta hjálpað.",

  // NEEDS CLINICAL SIGN-OFF. Step 2 already says heimapróf exist and that
  // þvagpróf is fetched "á heilsugæslu eða í næsta apóteki" — that part is
  // existing copy. What is new: naming CRP and strep-próf, the one-line
  // description of what each screens for, and CRP being heilsugæsla-only.
  // Descriptions are deliberately about what the test looks for, never what a
  // result means for the patient.
  tests_heading: "==Heimapróf== sem geta fylgt erindinu",
  tests_body:
    "Fyrir sum erindi bætir einfalt próf matið. Spurningalistinn segir þér hvort próf þarf — það á ekki við um öll erindi. Þú sækir prófið sjálf eða sjálfur, tekur það heima og skráir niðurstöðuna beint í gáttina.",
  test1_title: "CRP-próf",
  test1_desc: "Mælir bólgusvörun í blóði.",
  test1_when: "Kvef, hósti og hálsbólga",
  test1_where: "Heilsugæsla",
  test1_img: "/gatt/prima-crp.webp",
  test1_icon: "droplet",
  test2_title: "Þvagstix",
  test2_desc: "Skimar fyrir merkjum um þvagfærasýkingu.",
  test2_when: "Þvagfæra- og leggangasýkingar — þvagfærasýking í fyrsta skipti",
  test2_where: "Apótek, Heilsugæsla",
  test2_img: "/gatt/prima-thvagstix.webp",
  test2_icon: "test-tube",
  test3_title: "Strep-próf",
  test3_desc: "Skimar fyrir streptókokkum í hálsi.",
  test3_when: "Kvef, hósti og hálsbólga — hálsbólga, til að aðstoða greiningu",
  test3_where: "Apótek, Heilsugæsla",
  test3_img: "/gatt/prima-strep.webp",
  test3_icon: "open-mouth",
  // Copy and highlight rectangles below are taken from Fjarlækningar's own
  // "Fjarlækningar fyrir HSN" deck, slides 10 ("Markviss spurningalisti") and
  // 11 ("Sjálfspróf heima") — including "eykur greiningarnákvæmni", which is
  // their wording, not ours. No numeric sensitivity/specificity figure is
  // claimed anywhere; do not add one without a citation.
  tests_why_heading: "Af hverju heimapróf?",
  tests_why_body:
    "Fyrir afmörkuð og algeng erindi getur einfalt próf, sem þú tekur sjálf eða sjálfur, gefið lækni þær upplýsingar sem upp á vantar til að ljúka matinu — án þess að þú þurfir að bóka tíma, ferðast og bíða. Þannig verður ferlið einfaldara og hraðara fyrir þig, og heilsugæslan getur einbeitt sér að flóknari erindum.",
  tests_accuracy:
    "Þegar sjálfspróf bætir greiningu er þér leiðbeint að taka það — niðurstaðan eykur greiningarnákvæmni. Prófið kemur þó ekki í stað mats læknis: læknir fer yfir niðurstöðuna ásamt svörunum þínum úr spurningalistanum. Sé niðurstaðan óljós, eða passi einkennin ekki við hana, er erindinu vísað í hefðbundna þjónustu.",

  tests_how_heading: "Svona fer þetta fram í sjúklingagáttinni",
  tests_s1_title: "Spurningalistinn segir þér hvort prófs er þörf",
  tests_s1_desc:
    "Þú velur erindi og svarar spurningalistanum — það tekur aðeins nokkrar mínútur. Eigi próf við um þitt erindi færðu skilaboð um hvaða próf það er; það á ekki við um öll erindi.",
  tests_s1_img: "/gatt/02-spurningalisti.webp",
  tests_s1_hl: "30,3.86,40,82.01",
  tests_s2_title: "Þú sækir prófið og tekur það heima",
  tests_s2_desc:
    "Prófið sækir þú á heilsugæslu eða í apóteki — sjá hvar hér að ofan. Leiðbeiningar um hvernig það er tekið fylgja í gáttinni.",
  // Not a portal screen — steps 1 and 3 are the two gátt screenshots (slides 10
  // and 11 of the HSN deck). This step happens in the real world, so it shows
  // the kit itself.
  // PROVENANCE: third-party product photo of a PRIMA Strep A home test, sourced
  // from an Amazon listing. Copied locally rather than hotlinked, but it is NOT
  // our image — see the licensing note flagged with this change.
  tests_s2_img: "/gatt/heimaprof-kit.webp",
  tests_s2_hl: "",
  tests_s3_title: "Þú skráir niðurstöðuna í gáttina",
  tests_s3_desc:
    "Þú skráir niðurstöðuna beint í sjúklingagáttina. Allar upplýsingar um erindið og prófið fara til læknis til yfirferðar, sem lýkur erindinu.",
  tests_s3_img: "/gatt/03-sjalfsprof.webp",
  tests_s3_hl: "30,31.23,40,44.48",

  tests_footer:
    "Þú skráir niðurstöðuna beint í sjúklingagáttina og læknir metur hana með svörunum þínum. Þurfir þú aðstoð við að nálgast próf, hafðu samband.",

  live_heading: "Hvar er þjónustan ==virk==?",
  live_body:
    "Við opnum þjónustuna í samstarfi við heilbrigðisstofnanir, eina heilsugæslu í einu. Heilbrigðisstofnun Suðurlands er fyrsta stofnunin sem opnar fyrir þjónustuna.",
  // VERIFY BEFORE PUBLISHING. Written from public knowledge of the institution,
  // not from a Fjarlækningar source document:
  //   - the roster of HSU heilsugæslur, and that Vestmannaeyjar is genuinely live
  //   - the pickup points: the pharmacy NAME is a best guess and the addresses
  //     are deliberately left blank rather than invented. Sending a patient to a
  //     wrong address for a test is a real failure, so these must be filled in
  //     and checked before this section goes public.
  live_locations: [
    "Heilbrigðisstofnun Suðurlands | Fyrsta stofnunin sem opnar fyrir þjónustuna | /hsu-logo.webp",
    "+ Heilsugæslan í Vestmannaeyjum | Fyrsta heilsugæslan til að opna.",
    // ADDRESSES INTENTIONALLY BLANK — see the note above. The middle field is
    // the street address; fill it in from a source you trust.
    "* Heilsugæslan í Vestmannaeyjum |  | CRP-próf, þvagstix, strep-próf",
    "* Apótek Vestmannaeyja |  | Þvagstix, strep-próf",
    "- Heilsugæslan á Selfossi",
    "- Heilsugæslan í Hveragerði",
    "- Heilsugæslan í Þorlákshöfn",
    "- Heilsugæslan í Laugarási",
    "- Heilsugæslan á Hellu",
    "- Heilsugæslan á Hvolsvelli",
    "- Heilsugæslan í Vík í Mýrdal",
    "- Heilsugæslan á Kirkjubæjarklaustri",
    "- Heilsugæslan á Höfn í Hornafirði",
  ].join("\n"),
  live_pickup_label: "Hvar fæ ég heimapróf?",
  live_footer:
    "Heilsugæslur merktar „væntanlegt“ opna fyrir þjónustuna í áföngum. Fleiri heilbrigðisstofnanir bætast við eftir því sem þjónustan þróast.",

  // NOTE: assembled from Fjarlækningar's own published wording (erindi
  // descriptions + HSU referral collateral). Review clinically before publishing.
  limits_heading: "Hvenær hentar fjarlækningaþjónusta ==ekki==?",
  limits_body:
    "Fjarlækningar leysa einföld og afmörkuð erindi. Sum erindi þarfnast skoðunar, rannsóknar eða bráðaþjónustu — og þeim er vísað í annan farveg.",
  limits1_title: "Alvarleg einkenni",
  limits1_body: "Alvarlegum einkennum er vísað í annan farveg.",
  limits1_icon: "shield-alert",
  limits1_lead: "Alvarleg einkenni geta meðal annars verið:",
  limits1_items: [
    "Brjóstverkur eða þrýstingur fyrir brjósti",
    "Öndunarerfiðleikar eða skyndileg andnauð",
    "Skyndilegur máttminnkun, dofi, taltruflun eða lömun (einkenni heilablóðfalls)",
    "Skert meðvitund eða yfirlið",
    "Miklar blæðingar eða alvarlegir áverkar",
    "Skyndilegur, óbærilegur höfuðverkur eða kviðverkur",
    "Hár hiti með hnakkastífleika eða húðblæðingum",
    "Alvarleg ofnæmisviðbrögð (bjúgur í andliti/hálsi, öndunarerfiðleikar)",
    "Hugsanir um sjálfsskaða eða sjálfsvíg",
  ].join("\n"),
  limits1_action_lead: "Ef alvarleg einkenni eru til staðar getur þú:",
  limits1_actions: [
    "Hringt í 1700 til að fá ráðgjöf hjúkrunarfræðings",
    "Leitað á Læknavaktina (á höfuðborgarsvæðinu)",
    "Ef málið þolir enga bið: farðu á Bráðamóttökuna eða hringdu í 112",
  ].join("\n"),
  limits2_title: "Þörf á skoðun eða rannsókn",
  limits2_body:
    "Þurfi sjúklingur skoðun eða frekari rannsókn vísar læknir aftur í hefðbundna þjónustu.",
  limits2_icon: "stethoscope",
  limits3_title: "Frumgreining",
  limits3_body:
    "Frumgreiningu tiltekinna vandamála er vísað í annan farveg. Frunsa og ristill á húð eru dæmi: fyrsta greining þarf mat læknis með skoðun, en endurtekin einkenni sem þú þekkir má afgreiða hér.",
  limits3_icon: "clipboard-list",
  // NEW — needs clinical sign-off before publishing (see NOTE above). Built
  // around Mads' own phrasing; the rest uses vocabulary already on the page
  // ("vísað í hefðbundna þjónustu", "annan farveg").
  limits4_title: "Alvarlegir sjúkdómar í sjúkrasögu",
  limits4_body:
    "Ef sjúkrasaga sýnir alvarlega undirliggjandi sjúkdóma getur verið of áhættusamt að afgreiða erindið í gegnum fjarþjónustu — þá er vísað í hefðbundna þjónustu.",
  limits4_icon: "heart-pulse",
  limits_note: "Í bráðatilfellum hringdu í 112.",

  faq_heading: "Algengar spurningar",
  faq_categories: [
    "Þjónustan",
    "Öryggi og gæði",
    "Skilríki og persónuvernd",
    "Lyf og lyfseðlar",
    "Niðurstöður og næstu skref",
  ].join("\n"),

  // Category per question (must match a line in faq_categories).
  faq1_cat: "Þjónustan",
  faq2_cat: "Þjónustan",
  faq3_cat: "Þjónustan",
  faq4_cat: "Þjónustan",
  faq5_cat: "Þjónustan",
  faq6_cat: "Öryggi og gæði",
  faq7_cat: "Öryggi og gæði",
  faq8_cat: "Skilríki og persónuvernd",
  faq9_cat: "Skilríki og persónuvernd",
  faq10_cat: "Skilríki og persónuvernd",
  faq11_cat: "Lyf og lyfseðlar",
  faq12_cat: "Niðurstöður og næstu skref",
  faq13_cat: "Niðurstöður og næstu skref",
  faq14_cat: "Niðurstöður og næstu skref",
  faq15_cat: "Niðurstöður og næstu skref",
  faq16_cat: "Öryggi og gæði",
  faq17_cat: "Niðurstöður og næstu skref",
  faq18_cat: "Þjónustan",
  faq19_cat: "Öryggi og gæði",
  faq20_cat: "Öryggi og gæði",
  faq21_cat: "Niðurstöður og næstu skref",
  faq22_cat: "Niðurstöður og næstu skref",
  faq23_cat: "Þjónustan",
  faq24_cat: "Niðurstöður og næstu skref",

  faq1_q: "Hvernig virkar læknisþjónustan?",
  faq1_a:
    "Læknisþjónusta frá læknum Fjarlækninga er aðgengileg í gegnum heimasíðu Fjarlækninga, þar sem þér hentar. Þar færð þú meðferðarúrræði við skilgreindum, algengum vandamálum. Með Fjarlækningum færð þú þægilegri leið til læknis þar sem þú færð niðurstöðu læknis, og lyfseðil ef við á, innan 2 klukkustunda alla daga milli 10:00–22:00.\n\nÞú ferð í gegnum ferli þar sem þú svarar stöðluðum spurningum læknis um þig og þína heilsu. Þegar þú hefur lokið við að svara spurningum greiðir þú sama og komugjald á heilsugæslu og erindi þitt fer áfram til læknis. Læknir Fjarlækninga veitir þér sérsniðið meðferðarúrræði og niðurstaðan þín birtist í sjúklingagáttinni þar sem þú getur nálgast meðferðarúrræði og skilaboð frá lækni. Ef greining gefur til kynna að þörf sé á uppáskrifuðu lyfi færð þú einnig sendan lyfseðil í lyfjagáttina sem hægt er að leysa út í næsta apóteki.",

  faq2_q: "Hvaða læknisfræðilegu vandamál leysir þjónusta Fjarlækninga?",
  faq2_a: [
    "Fjarlækningar veita læknisþjónustu við eftirfarandi vandamálum:",
    "",
    "· Kvef, hósti og hálsbólga | Einfaldar öndunarfærasýkingar, hálsbólga, ennis- og kinnholusýkingar",
    "· Þvagfæra- og leggangasýkingar | Þvagfærasýkingar kvenna, sveppasýkingar í leggöngum og bakteríusýkingar í leggöngum",
    "· Risvandamál",
    "· Frunsa (ekki frumgreining)",
    "· Ristill í húð (ekki frumgreining)",
    "· Njálgur | Lausn fyrir alla fjölskyldumeðlimi",
    "· Frjókornaofnæmi",
    "· Lyfjaendurnýjanir | Þjónustan gerir þér kleift að endurnýja lyf sem þú notar að staðaldri. Ekki er hægt að endurnýja öll lyf í gegnum þessa þjónustu — þú færð leiðbeiningar um hvaða lyf er ekki hægt að endurnýja þegar þú ferð í gegnum ferlið.",
    "· Læknisvottorð | Veikindavottorð til vinnuveitanda og skóla. Þessi þjónusta er einungis í boði fyrir þá sem þurfa fjarvistarvottorð tengt vandamáli sem hefur verið afgreitt í gegnum fjarlækningaþjónustuna.",
  ].join("\n"),

  faq3_q: "Hvað kostar læknisþjónusta Fjarlækninga?",
  faq3_a:
    "Læknisþjónusta Fjarlækninga er sambærileg og koma á heilsugæslu, en þú greiðir einungis komugjald 1.000 kr. fyrir erindi líkt og á heilsugæslu. Gjald fyrir veikindavottorð er samkvæmt gjaldskrá heilsugæslunnar.",

  faq4_q: "Fyrir hvern er þjónustan?",
  faq4_a:
    "Læknisþjónustan er aðgengileg fyrir 18 ára og eldri sem eru með rafræn skilríki. Nánari upplýsingar um hvar þjónustan er aðgengileg má finna hér: https://www.fjarlaekningar.is/thjonusta",

  faq5_q: "Hvernig get ég nýtt mér læknisþjónustuna?",
  faq5_a:
    "Læknisþjónusta Fjarlækninga er aðgengileg í gegnum heimasíðu Fjarlækninga með því að smella á „sjúklingagátt“ og heimasíðu HSU: https://island.is/s/hsu",

  faq6_q: "Er þjónustan örugg lausn á læknisfræðilegum vandamálum?",
  faq6_a:
    "Læknisþjónusta Fjarlækninga leiðir þig í gegnum staðlaðar spurningar byggðar á sannreyndum læknisfræðilegum aðferðum sem safna ítarlegum upplýsingum um þig, þína sögu og heilsu, sem læknir nýtir svo til greiningar. Allt ferlið er þróað í samstarfi við sérfræðilækna.\n\nMeð því að svara stöðluðum spurningum frá lækni veitir þú þær upplýsingar sem læknir þarf til að geta tekið ákvörðun um greiningu og meðferð á þínu tiltekna vandamáli. Læknisfræðilegir ferlar tryggja stöðluð vinnubrögð og er fræðsla og ráðgjöf mikilvægur hluti meðferðarúrræða Fjarlækninga. Allar ákvarðanir um greiningu og meðferð eru teknar af lækni sem sinnir þínu erindi.\n\nÖll meðhöndlun persónuupplýsinga stenst ströngustu öryggiskröfur landlæknis, sem er jafnframt í samræmi við Evrópulög um meðhöndlun viðkvæmra gagna og unnin í viðurkenndu sjúkraskrárkerfi.",

  faq7_q: "Þarf ekki læknisskoðun til að fá lausn?",
  faq7_a:
    "Mörg vandamál eru þess eðlis að læknir þarf ekki nauðsynlega að skoða þig til að veita meðferð. Ítarlegar spurningar um þína líðan og sjúkrasaga þín gera lækninum kleift að greina vandamálið og leggja til meðferð. Fjarlækningar leysa slík vandamál á einfaldan og þægilegan hátt. Það eru þó einstaka tilfelli sem krefjast frekari rannsókna til að meta ástandið enn frekar og auka nákvæmni greiningar, s.s. CRP, streptókokkapróf og þvagprufa. Fjarlækningar leysa slík mál með því að nýta sjálfspróf sem þú getur sótt á þína heilsugæslu eða næsta apótek.\n\nSum vandamál þarfnast skoðunar hjá lækni fyrir örugga greiningu og meðferð. Ef svörin þín við spurningum gefa til kynna að þú þarfnist læknisskoðunar, þá leysa Fjarlækningar ekki málið þitt heldur beina þér í réttan farveg.",

  faq8_q: "Hvað ef ég er ekki með rafræn skilríki?",
  faq8_a:
    "Til að tryggja öryggi þitt og upplýsinga þinna er rafræn auðkenning nauðsynleg. Þannig fá læknarnir staðfestingu á því hver óskar eftir þjónustunni.",

  faq9_q: "Hvernig fæ ég rafræn skilríki?",
  faq9_a:
    "Þú getur kannað hvort SIM-kortið þitt styður rafræn skilríki. Ef þú ert með rétta tegund af SIM-korti þá geturðu mætt á næsta afgreiðslustað rafrænna skilríkja með gilt ökuskírteini (ekki stafrænt), vegabréf eða íslenskt nafnskírteini og fengið rafræn skilríki í símann þinn.",

  faq10_q: "Eru persónuupplýsingar mínar öruggar?",
  faq10_a:
    "Öll meðhöndlun persónuupplýsinga stenst ströngustu öryggiskröfur embættis landlæknis sem er einnig í samræmi við Evrópulög um meðhöndlun viðkvæmra gagna. Fjarlækningar nota öruggt og vottað sjúkraskrárkerfi þar sem upplýsingarnar eru geymdar samkvæmt lögum um heilbrigðisupplýsingar.\n\nÖll meðferð persónu- og heilbrigðisupplýsinga hjá Fjarlækningum uppfyllir strangar kröfur um öryggi og persónuvernd samkvæmt íslenskum lögum og evrópskri persónuverndarlöggjöf (GDPR). Fjarlækningar nota öruggt og vottað sjúkraskrárkerfi þar sem heilbrigðisupplýsingar eru varðveittar og meðhöndlaðar í samræmi við gildandi lög og reglur.",

  faq11_q: "Get ég endurnýjað alla lyfseðla?",
  faq11_a:
    "Hægt er að endurnýja lyfseðla fyrir lyfjum sem þú tekur að staðaldri. Við vekjum athygli á að sumar lyfjameðferðir þurfa reglulega eftirfylgni, t.d. blóðþrýstingslyf, hjartalyf og kvíða- og þunglyndislyf. Þessi þjónusta kemur ekki í stað reglulegs eftirlits hjá heimilislækni, en er hentugur kostur ef þig vantar skjóta endurnýjun á lyfi. Þú færð lyfseðil í lyfjagáttina þegar læknir hefur lokið yfirferð. Lyfseðilinn er hægt að leysa út í hvaða apóteki sem er.\n\nAthugaðu að einungis er hægt að fá einfaldan lyfseðil, þ.e. ekki fjölnota lyfseðil. Við endurnýjun ákveðinna lyfja er nauðsynlegt að tala við lækninn sem hefur áður skrifað upp á slík lyf fyrir þig. Þessi lyf geta til dæmis verið flokkuð sem ávanabindandi, örvandi eða sem geðlyf.\n\nHér er listi yfir öll helstu lyf sem Fjarlækningar geta ekki endurnýjað:\n\n{{lyfjalisti}}",

  faq12_q: "Hvað ef ekki fæst lausn á mínu máli?",
  faq12_a:
    "Ef læknar Fjarlækninga geta ekki leyst úr erindinu þínu er þér vísað áfram í viðeigandi þjónustu, til dæmis á heilsugæslu, Læknavakt eða aðra heilbrigðisstofnun.",

  faq13_q: "Hvenær get ég ekki fengið niðurstöðu og lausn frá lækni?",
  faq13_a:
    "Ef svör þín eða sjúkrasaga gefa til kynna að öruggasta leiðin sé skoðun hjá lækni, þá færðu upplýsingar og ráð sem hjálpa þér með næstu skref. Ef við eigum ekki lausn fyrir þig greiðir þú ekkert fyrir þjónustuna. Þjónustan er ekki fyrir þau sem telja sig í bráðri lífshættu. Í öllum þjónustuþáttum er spurt ítarlega um alvarleg einkenni og um sjúkdómssögu sem nýtt er til að meta hvort um alvarleg veikindi gæti verið að ræða.",

  faq14_q: "Hvað ef ég vil hitta lækninn?",
  faq14_a:
    "Læknisþjónusta Fjarlækninga er einungis stafræn. Ef ástand þitt batnar ekki eða þú versnar er alltaf hægt að fara aftur í gegnum spurningaformið eða fara í læknisskoðun. Ef þú ert ekki sammála niðurstöðu læknis getur þú smellt á „Senda fyrirspurn“ í sjúklingagátt Fjarlækninga.",

  faq15_q: "Hvað ef ég er ósátt/ur við niðurstöðu læknis?",
  faq15_a:
    "Ef ástand þitt batnar ekki eða versnar getur þú sent inn nýtt erindi til Fjarlækninga eða leitað til heilsugæslu eða annarrar heilbrigðisstofnunar til frekara mats. Ef þú ert ósammála niðurstöðu læknis eða hefur spurningar eða áhyggjur af henni getur þú smellt á „Senda fyrirspurn“ í sjúklingagátt Fjarlækninga.",

  faq16_q: "Er gervigreind að svara mér eða manneskja?",
  faq16_a:
    "Lausnin er hvorki gervigreind né spjallmenni. Læknisþjónustan leiðir þig í gegnum staðlaðar spurningar sem veita ítarlegar upplýsingar um þig, þína sögu og heilsu, sem læknir nýtir svo til greiningar. Allt ferlið er þróað af sérfræðilæknum Fjarlækninga. Allar niðurstöður eru ráðlagðar af lækni, bæði meðferðarúrræði og almennar ráðleggingar tengdar þínum kvilla.",

  faq17_q: "Af hverju get ég ekki svarað fyrir barnið mitt?",
  faq17_a:
    "Rétt læknisráðgjöf og öryggi meðferðar skiptir okkur öllu máli og er það læknisfræðilegt mat Fjarlækna að ávallt sé best að fara með börn undir 18 ára í skoðun hjá lækni. Fjarlækningar eru því aðeins fyrir 18 ára og eldri.",

  faq18_q: "Af hverju eru ekki fleiri þjónustur eða önnur vandamál?",
  faq18_a:
    "Þjónustuframboðið er metið út frá áhættu og umfangi greiningar. Vandamálin sem við leysum eru einföld og afmörkuð sem þarfnast alla jafna ekki skoðunar læknis. Við vinnum stöðugt að því að útvíkka þjónustuframboð okkar.",

  faq19_q: "Er hætta á ofnotkun sýklalyfja með þjónustunni?",
  faq19_a:
    "Markmið þjónustunnar og verklags Fjarlækninga er að tryggja stöðluð vinnubrögð sem byggð eru á læknisfræðilegum ferlum. Ávinningurinn er nákvæmari úrlausn sem gefur skýra mynd af því hvort vandamál krefjist sýklalyfja eða ekki. Staðlaðir ferlar og vinnubrögð eru í raun líklegri til að koma í veg fyrir ofnotkun sýklalyfja. Ofnotkun sýklalyfja er því miður þekkt vandamál í íslensku samfélagi sem og erlendis, en markmið Fjarlækninga er að stuðla að öruggri lyfjameðferð og lyfjanotkun.",

  faq20_q: "Er aukin hætta á oflækningum?",
  faq20_a:
    "Þjónustan er þróuð með íslenskum sérfræðilæknum og einnig í nánu samtali við fyrirtæki í sambærilegri fjarheilbrigðisþjónustu á Norðurlöndum. Læknisfræðilegir ferlar sem Fjarlækningar bera ábyrgð á eru til staðar til að koma í veg fyrir oflækningar og ónauðsynlega meðferð skjólstæðinga. Við vinnum markvisst að fræðslu og ráðgjöf til skjólstæðinga því við trúum að upplýsingar og fræðsla um eigin heilsu og heilsutengd vandamál séu lykillinn að betri ákvarðanatöku — þess vegna er góð fræðsla og ráðgjöf hluti af meðferðarúrræðum Fjarlækninga.\n\nMeð því að svara stöðluðum og mikilvægum spurningum frá lækni veitir þú lækninum þær upplýsingar sem hann þarf til að geta tekið ákvörðun um greiningu og meðferð. Öll ferli eru unnin á læknisfræðilegum forsendum með það að markmiði að veita sem nákvæmasta niðurstöðu og meðferð.",

  faq21_q: "Get ég farið oft í gegnum ferlið?",
  faq21_a:
    "Þú getur nýtt þér þjónustuna aftur ef einkennin þín breytast eða ef þú ert með nýtt vandamál. Með því að fara í gegnum þjónustuna staðfestir þú að öllum spurningum sé svarað heiðarlega og eftir bestu getu. Læknirinn hefur yfirsýn yfir þína sjúkrasögu og til þess getur komið að haft verði samband við þig símleiðis ef svör eru óljós.",

  faq22_q: "Fæ ég alltaf lausn á mínu máli?",
  faq22_a:
    "Ef svör þín gefa til kynna að öruggasta leiðin sé skoðun hjá lækni, þá færðu upplýsingar og ráð sem hjálpa þér með næstu skref. Ef við höfum ekki lausnina fyrir þig greiðir þú ekki fyrir þjónustuna.",

  faq23_q: "Er hægt að fá myndsímtal við lækni?",
  faq23_a:
    "Til að byrja með er þjónustan einungis aðgengileg í formi staðlaðra spurninga frá læknum Fjarlækninga og greiningar á skilgreindum, algengum vandamálum.",

  faq24_q: "Hvað ef ég er í lífshættu?",
  faq24_a:
    "Ef um er að ræða alvarleg veikindi ráðleggjum við alltaf skoðun hjá lækni. Fjarlækningar eru ekki fyrir þau sem telja sig í bráðri lífshættu. Í öllum þjónustuþáttum er spurt ítarlega um alvarleg einkenni og um sjúkdómssögu sem gætu gefið til kynna alvarleg veikindi. Ef svo er þá veita Fjarlækningar þér ráðleggingar um hvert best sé að leita.",

  // Lyfjalisti — birtist í svari 11 í gegnum {{lyfjalisti}}. "# " byrjar
  // undirflokk; aðrar línur eru lyf ("Virkt efni: sérlyf"). Listinn er ekki
  // tæmandi og er ætlaður til skýringar.
  meds_note: "Athugið að þessi listi er ekki tæmandi.",
  meds_a_title: "A. Eftirritunarskyld lyf",
  meds_a_items: [
    "# Ópíóíðar / sterk verkjalyf",
    "Morfín: Contalgin, Morfin",
    "Oxýkódon: OxyContin, OxyNorm, Targin (oxýkódon + naloxon)",
    "Ketóbemídón: Ketogan",
    "Fentanýl-plástrar: Durogesic, Matrifen, Fentanyl",
    "Tapentadól: Palexia",
    "Petidín og metadon (sjá einnig flokk D)",
    "Tramadól: Tradolan, Nobligan, Tramadol",
    "# Kódeín-samsett lyf",
    "Parkódín / Parkódín forte (parasetamól + kódeín)",
    "Kódímagnýl (asetýlsalisýlsýra + kódeín)",
    "# Benzódíazepín",
    "Díazepam: Stesolid, Diazepam",
    "Oxazepam: Sobril",
    "Klónazepam: Rivotril",
    "Alprazólam: Xanax, Tafil, Alprazolam",
    "Lorazepam: Lorazepam, Temesta",
    "Midazólam: Dormicum, Midazolam",
    "# Svefnlyf — Z-lyf (benzódíazepín-skyld)",
    "Zópíklón: Imovane, Zopiclone, Imozop",
    "Zolpidem: Stilnoct, Zolpidem",
    "# Örvandi lyf / ADHD-lyf",
    "Metýlfenídat: Ritalin, Concerta, Medikinet, Equasym",
    "Lísdexamfetamín: Elvanse",
    "Dexamfetamín: Attentin",
    "# Gabapentínóíð",
    "Pregabalín: Lyrica, Pregabalin",
    "Gabapentín: Neurontin, Gabapentin",
    "# Barbitúröt",
    "Fenóbarbital: Fenemal",
  ].join("\n"),
  meds_b_title: "B. Lyf við fíkn / viðhaldsmeðferð",
  meds_b_items: [
    "Búprenorfín: Norspan (plástur), Subutex",
    "Búprenorfín + naloxón: Suboxone",
    "Metadon",
    "Naltrexón / dísúlfíram: Antabus",
  ].join("\n"),
  meds_c_title: "C. Lyf sem þurfa eftirlit með blóðprufum",
  meds_c_items: [
    "Warfarín: Kóvar, Marevan",
    "Litíum",
    "Klózapín: Leponex",
    "Metótrexat",
    "Ísótretínóín: Roaccutan",
    "DOAC-blóðþynnar: Xarelto, Eliquis, Pradaxa",
  ].join("\n"),
  meds_d_title: "D. Lyf sem einungis sérfræðingar skrifa upp á",
  meds_d_items: [
    "Geðrofslyf",
    "Testósterón",
    "Krabbameinslyf, ónæmisbælandi lyf og líftæknilyf",
  ].join("\n"),

  cta_text: "Tilbúin(n) að senda inn erindi?",
  cta_button: "Opna sjúklingagátt",
};

export const THJONUSTA_DEFAULTS_EN: LocaleContent = emptyDefaults(THJONUSTA_FIELDS);
