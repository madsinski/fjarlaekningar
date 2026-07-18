export type SurveyQuestionType = "text" | "textarea" | "single_choice";

export interface SurveyQuestion {
  id: string;
  label: string;
  type: SurveyQuestionType;
  options?: string[]; // for single_choice
  required?: boolean;
}

export const QUESTION_TYPE_LABELS: Record<SurveyQuestionType, string> = {
  text: "Stuttur texti",
  textarea: "Langur texti",
  single_choice: "Einn valkostur",
};

// Validate a submitted answers map against a question set. Returns an error
// message (Icelandic) or null if OK.
export function validateAnswers(
  questions: SurveyQuestion[],
  answers: Record<string, unknown>,
): string | null {
  for (const q of questions) {
    const v = answers[q.id];
    if (q.required && (v === undefined || v === null || String(v).trim() === "")) {
      return `Reitur vantar: ${q.label}`;
    }
    if (q.type === "single_choice" && v && q.options && !q.options.includes(String(v))) {
      return `Ógilt val: ${q.label}`;
    }
  }
  return null;
}
