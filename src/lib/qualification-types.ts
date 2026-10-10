export interface LeadQualificationRules {
  minOpens: number;
  includeClicked: boolean;
  minClicks: number;
  matchMode: "or" | "and";
  excludeAlreadyContacted: boolean;
  deduplicateByEmail: boolean;

  // Industry Vertical Filter
  filterByIndustry?: boolean;
  industryFilterMode?: "include" | "exclude";
  selectedIndustries?: string[];

  // Date Duration Filter (Timestamp in Tracking Sheet)
  filterByDate?: boolean;
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string; // YYYY-MM-DD
}

export const DEFAULT_QUALIFICATION_RULES: LeadQualificationRules = {
  minOpens: 2,
  includeClicked: true,
  minClicks: 1,
  matchMode: "or",
  excludeAlreadyContacted: true,
  deduplicateByEmail: true,
  filterByIndustry: false,
  industryFilterMode: "include",
  selectedIndustries: [],
  filterByDate: false,
  dateFrom: "",
  dateTo: "",
};

