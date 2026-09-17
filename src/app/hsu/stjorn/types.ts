import type { HsuDoctor, HsuMonth, HsuPreference, HsuShift, HsuShiftType, HsuSwap, MonthStatus } from "@/lib/hsu/types";

export interface Overview {
  actor: {
    kind: "doctor" | "staff"; label: string; doctorId: string | null; role: "doctor" | "head" | null;
    /** Hvað yfirlæknir hefur séð: {"tour:head": tími, "guide:head": tími}. */
    onboarding: Record<string, string>;
    calendarConnected: boolean;
  };
  settings: { unit_name: string; market_requires_approval: boolean };
  /** Tengiliður Fjarlækninga fyrir spurningar. */
  support: { name: string; phone: string } | null;
  shiftTypes: HsuShiftType[];
  doctors: HsuDoctor[];
  month: HsuMonth | null;
  months: { month: string; status: MonthStatus }[];
  preferences: HsuPreference[];
  shifts: HsuShift[];
  swaps: HsuSwap[];
  audit: { at: string; actor: string; action: string; detail: Record<string, unknown> }[];
}

export interface PlannerCtx {
  data: Overview;
  month: string;
  reload: () => Promise<void>;
  /** Uppfæra gögn staðbundið (t.d. eftir að læknir er dreginn til) án endurhleðslu. */
  patch: (fn: (d: Overview) => Overview) => void;
}
