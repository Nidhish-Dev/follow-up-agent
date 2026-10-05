export interface LeadQualificationRules {
  minOpens: number;
  includeClicked: boolean;
  minClicks: number;
  matchMode: "or" | "and";
  excludeAlreadyContacted: boolean;
  deduplicateByEmail: boolean;
}

export const DEFAULT_QUALIFICATION_RULES: LeadQualificationRules = {
  minOpens: 2,
  includeClicked: true,
  minClicks: 1,
  matchMode: "or",
  excludeAlreadyContacted: true,
  deduplicateByEmail: true,
};
