"use client";
import React, { useState, useEffect, useMemo } from "react";
import { User } from "firebase/auth";
import {
  Search,
  Send,
  RefreshCw,
  Mail,
  Building,
  User as UserIcon,
  CheckCircle2,
  ExternalLink,
  LoaderCircle,
  FileSpreadsheet,
  AlertCircle,
  Check,
  Eye,
  Edit3,
  Globe,
  Clock,
  Sparkles,
  Phone,
} from "lucide-react";
import { MasterLead, SheetSearchResponse, MOCK_MASTER_LEADS } from "@/lib/google-sheets";
import {
  EmailTemplateConfig,
  DEFAULT_EMAIL_TEMPLATE,
  matchIndustrySegment,
} from "@/lib/email-template-types";

export function LeadFollowUpView({
  fbUser,
  setNotice,
}: {
  fbUser: User | null;
  setNotice: (n: any) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [leads, setLeads] = useState<MasterLead[]>(MOCK_MASTER_LEADS);
  const [sheetInfo, setSheetInfo] = useState<Partial<SheetSearchResponse>>({
    sheetName: "Master Leads",
    totalLeads: MOCK_MASTER_LEADS.length,
    matchedLeads: MOCK_MASTER_LEADS.length,
  });
  const [selectedLead, setSelectedLead] = useState<MasterLead>(MOCK_MASTER_LEADS[0]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [template, setTemplate] = useState<EmailTemplateConfig>(DEFAULT_EMAIL_TEMPLATE);
  
  // Composer custom overrides for the selected lead
  const [customSubject, setCustomSubject] = useState("");
  const [customBodyHtml, setCustomBodyHtml] = useState("");
  const [composerView, setComposerView] = useState<"preview" | "edit">("preview");
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // 1. Fetch template settings
  const loadTemplate = async () => {
    if (!fbUser) return;
    try {
      const token = await fbUser.getIdToken();
      const res = await fetch("/api/template", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.template) {
          setTemplate(data.template);
        }
      }
    } catch (err) {
      console.warn("Could not load template for lead follow-up:", err);
    }
  };

  useEffect(() => {
    loadTemplate();
    const handleTemplateUpdated = () => {
      loadTemplate();
    };
    window.addEventListener("email-template-updated", handleTemplateUpdated);
    window.addEventListener("focus", handleTemplateUpdated);
    return () => {
      window.removeEventListener("email-template-updated", handleTemplateUpdated);
      window.removeEventListener("focus", handleTemplateUpdated);
    };
  }, [fbUser]);

  // 2. Fetch leads from Google Sheets search API
  const fetchLeads = async (query: string = "") => {
    if (!fbUser) return;
    setLoadingLeads(true);
    try {
      const token = await fbUser.getIdToken();
      const url = `/api/leads/search?q=${encodeURIComponent(query)}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: SheetSearchResponse = await res.json();
      if (res.ok && data.leads) {
        setLeads(data.leads);
        setSheetInfo(data);
        if (data.leads.length > 0) {
          // If current selection is not in new results, pick the first
          if (!data.leads.some((l) => l.id === selectedLead?.id)) {
            setSelectedLead(data.leads[0]);
          }
        }
      } else {
        throw new Error((data as any).error || "Failed to search leads");
      }
    } catch (err: any) {
      console.warn("Lead fetch warning:", err);
      setNotice({
        type: "error",
        text: err?.message || "Failed to search Google Sheets leads",
      });
    } finally {
      setLoadingLeads(false);
    }
  };

  // 3. Fetch history
  const fetchHistory = async () => {
    if (!fbUser) return;
    setLoadingHistory(true);
    try {
      const token = await fbUser.getIdToken();
      const res = await fetch("/api/leads/send", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch (err) {
      console.warn("Failed to load follow-up history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchLeads("");
    fetchHistory();
  }, [fbUser]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLeads(searchQuery);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 4. Interpolate template for the selected lead
  const interpolate = (html: string, lead: MasterLead) => {
    if (!lead) return html;
    const callUrl = template.callUrl || "https://calendly.com/team-grapelabs/30min";
    const rawWaUrl =
      template.whatsappUrl ||
      "https://wa.me/918388892300?text=Hi%20Kashika,%20saw%20your%20email";
    const waUrl = rawWaUrl.replace(/\{\{\s*brand\s*\}\}/gi, encodeURIComponent(lead.brand || "your brand"));
    const callBtnText = template.callButtonText || "Book a Free Call";
    const waBtnText = template.whatsappText || "Text me on WhatsApp";

    // Clean first name (don't leave email handle with digits or raw email)
    let leadFirstName = (lead.firstName || "").trim();
    if (!leadFirstName || ["there", "valued lead", "friend"].includes(leadFirstName.toLowerCase())) {
      const emailPrefix = (lead.email || "").split("@")[0] || "";
      const alphaOnly = emailPrefix.replace(/\d+/g, "").split(/[._-]+/).filter(Boolean);
      leadFirstName = alphaOnly.length > 0 ? alphaOnly[0] : (lead.name?.split(" ")[0] || "Friend");
    }
    leadFirstName = leadFirstName.charAt(0).toUpperCase() + leadFirstName.slice(1);

    // 1. Resolve matching industry and industry template if available
    let resolvedSubject = template.subject;
    let resolvedBodyHtml = template.bodyHtml;

    const leadIndustry = lead.industry || lead.raw?.Industry || lead.raw?.industry || "";
    // If template has industryTemplates, match segment
    if (template.industryTemplates && Object.keys(template.industryTemplates).length > 0) {
      const segKey = matchIndustrySegment(leadIndustry, Object.keys(template.industryTemplates));
      if (template.industryTemplates[segKey]) {
        if (template.industryTemplates[segKey].subject) resolvedSubject = template.industryTemplates[segKey].subject;
        if (template.industryTemplates[segKey].bodyHtml) resolvedBodyHtml = template.industryTemplates[segKey].bodyHtml;
      }
    }

    return html
      .replace(/\{\{\s*first_name\s*\}\}/gi, leadFirstName)
      .replace(/\{\{\s*recipientName\s*\}\}/gi, lead.name || leadFirstName)
      .replace(/\{\{\s*brand\s*\}\}/gi, lead.brand || "your brand")
      .replace(
        /\{\{\s*achievement_hook\s*\}\}/gi,
        lead.hook ||
          `${lead.brand} has built solid traction in ${lead.industry} with an engaged customer base.`
      )
      .replace(
        /\{\{\s*hook_closer\s*\}\}/gi,
        lead.closer || "That's the hard part, and it's already done."
      )
      .replace(
        /\{\{\s*vertical_focus\s*\}\}/gi,
        lead.verticalFocus ||
          "Direct-to-consumer acquisition, automated repeat orders, and customer retention."
      )
      .replace(/\{\{\s*call_url\s*\}\}/gi, callUrl)
      .replace(/\{\{\s*whatsapp_url\s*\}\}/gi, waUrl)
      .replace(/\{\{\s*call_button_text\s*\}\}/gi, callBtnText)
      .replace(/\{\{\s*whatsapp_text\s*\}\}/gi, waBtnText)
      .replace(/\{\{\s*sender_name\s*\}\}/gi, template.senderName || "Kashika Gupta");
  };

  // Reset custom composer when selected lead changes with industry template resolution
  useEffect(() => {
    if (selectedLead) {
      let tplSubject = template.subject;
      let tplBodyHtml = template.bodyHtml;

      const leadIndustry = selectedLead.industry || selectedLead.raw?.Industry || selectedLead.raw?.industry || "";
      if (template.industryTemplates && Object.keys(template.industryTemplates).length > 0) {
        const segKey = matchIndustrySegment(leadIndustry, Object.keys(template.industryTemplates));
        if (template.industryTemplates[segKey]) {
          if (template.industryTemplates[segKey].subject) tplSubject = template.industryTemplates[segKey].subject;
          if (template.industryTemplates[segKey].bodyHtml) tplBodyHtml = template.industryTemplates[segKey].bodyHtml;
        }
      }

      setCustomSubject(interpolate(tplSubject, selectedLead));
      setCustomBodyHtml(interpolate(tplBodyHtml, selectedLead));
    }
  }, [selectedLead, template]);

  // 5. Send follow-up email
  const handleSendFollowUp = async () => {
    if (!fbUser || !selectedLead) return;
    setSending(true);
    try {
      const token = await fbUser.getIdToken();
      const payload = {
        leadEmail: selectedLead.email,
        leadName: selectedLead.name,
        brand: selectedLead.brand,
        subject: customSubject,
        bodyHtml: `${customBodyHtml}\n\n${template.signatureHtml}`,
        leadData: selectedLead.raw,
        sheetName: sheetInfo.sheetName,
        rowIndex: selectedLead.rowIndex,
      };

      const res = await fetch("/api/leads/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to dispatch follow-up");

      setNotice({
        type: "success",
        text: `Follow-up email dispatched successfully to ${selectedLead.email}!`,
      });

      // Update lead local status
      setLeads((prev) =>
        prev.map((l) =>
          l.id === selectedLead.id ? { ...l, status: "Follow-up Sent" } : l
        )
      );
      setSelectedLead((prev) => ({ ...prev, status: "Follow-up Sent" }));

      // Refresh audit history
      fetchHistory();
    } catch (err: any) {
      setNotice({
        type: "error",
        text: err?.message || "Failed to send follow-up email.",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ marginTop: "24px" }}>
      {/* 1. Header & Sheet Connection Status */}
      <div
        style={{
          background: "#fff",
          border: "1px solid var(--line)",
          borderRadius: "8px",
          padding: "16px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px",
          marginBottom: "20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "8px",
              background: "var(--grape-light)",
              color: "var(--grape)",
              display: "grid",
              placeItems: "center",
            }}
          >
            <FileSpreadsheet size={20} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "var(--ink)" }}>
                Master Leads Search & Follow-up
              </h2>
              <span
                style={{
                  fontSize: "10.5px",
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: "12px",
                  background: sheetInfo.isMock ? "#fef3c7" : "#dcfce7",
                  color: sheetInfo.isMock ? "#b45309" : "#15803d",
                  border: `1px solid ${sheetInfo.isMock ? "#fde68a" : "#bbf7d0"}`,
                }}
              >
                {sheetInfo.isMock ? "Sample Leads" : "Live Google Sheet"}
              </span>
            </div>
            <p style={{ margin: "3px 0 0", fontSize: "11.5px", color: "var(--muted)" }}>
              Tab: <b>{sheetInfo.sheetName || "Master Leads"}</b> · Found <b>{sheetInfo.matchedLeads ?? leads.length}</b> leads
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => fetchLeads(searchQuery)}
          disabled={loadingLeads}
          style={{
            background: "#f8fafc",
            border: "1px solid #cbd5e1",
            borderRadius: "6px",
            padding: "7px 12px",
            fontSize: "12px",
            fontWeight: 600,
            color: "#475569",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            cursor: "pointer",
          }}
        >
          <RefreshCw size={13} className={loadingLeads ? "spin" : ""} />
          {loadingLeads ? "Syncing..." : "Refresh Sheet"}
        </button>
      </div>

      {sheetInfo.message && (
        <div
          style={{
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: "6px",
            padding: "10px 14px",
            fontSize: "12px",
            color: "#1d4ed8",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "18px",
          }}
        >
          <AlertCircle size={15} />
          <span>{sheetInfo.message}</span>
        </div>
      )}

      {/* 2. Main 2-Column Grid: Search / Leads List + Follow-up Composer */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(340px, 390px) 1fr",
          gap: "22px",
          alignItems: "start",
        }}
      >
        {/* Left Column: Search Bar & Lead Selection Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Search Box */}
          <div style={{ position: "relative" }}>
            <Search
              size={16}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--muted)",
              }}
            />
            <input
              type="text"
              placeholder="Search by email, name, brand..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px 9px 36px",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                fontSize: "12.5px",
                background: "#fff",
                color: "var(--ink)",
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: 0,
                  fontSize: "11px",
                  color: "var(--muted)",
                  cursor: "pointer",
                }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Leads List */}
          <div
            style={{
              background: "#fff",
              border: "1px solid var(--line)",
              borderRadius: "8px",
              padding: "8px",
              maxHeight: "680px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            {loadingLeads && leads.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--muted)" }}>
                <LoaderCircle className="spin" size={20} style={{ margin: "0 auto 8px" }} />
                <span style={{ fontSize: "12px" }}>Searching Master Leads...</span>
              </div>
            ) : leads.length === 0 ? (
              <div style={{ padding: "34px 16px", textAlign: "center", color: "var(--muted)" }}>
                <AlertCircle size={22} style={{ margin: "0 auto 8px", opacity: 0.6 }} />
                <p style={{ margin: 0, fontSize: "12.5px", fontWeight: 600 }}>No matching leads found</p>
                <p style={{ margin: "4px 0 0", fontSize: "11px" }}>
                  Try another email address or keyword.
                </p>
              </div>
            ) : (
              leads.map((lead) => {
                const isSelected = selectedLead?.id === lead.id;
                return (
                  <button
                    key={lead.id}
                    type="button"
                    onClick={() => setSelectedLead(lead)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "12px 14px",
                      borderRadius: "6px",
                      background: isSelected ? "var(--grape-light)" : "transparent",
                      border: `1px solid ${isSelected ? "var(--grape-border)" : "transparent"}`,
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: "5px",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: 700,
                          color: isSelected ? "var(--grape)" : "var(--ink)",
                        }}
                      >
                        {lead.brand}
                      </span>
                      <span
                        style={{
                          fontSize: "9.5px",
                          fontWeight: 600,
                          padding: "1px 6px",
                          borderRadius: "4px",
                          background:
                            lead.status === "Follow-up Sent"
                              ? "#dcfce7"
                              : isSelected
                              ? "#e0dbfc"
                              : "#f1f5f9",
                          color:
                            lead.status === "Follow-up Sent"
                              ? "#15803d"
                              : isSelected
                              ? "var(--grape)"
                              : "#64748b",
                        }}
                      >
                        {lead.status}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11.5px", color: "var(--ink)" }}>
                      <UserIcon size={12} color="var(--muted)" />
                      <span>{lead.name}</span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--muted)" }}>
                      <Mail size={12} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {lead.email}
                      </span>
                    </div>

                    {lead.industry && (
                      <span style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>
                        {lead.industry}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Follow-up Email Composer & Live Simulator */}
        {selectedLead ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Lead Overview Card */}
            <div
              style={{
                background: "#fff",
                border: "1px solid var(--line)",
                borderRadius: "8px",
                padding: "16px 20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div>
                <span className="eyebrow" style={{ display: "block", marginBottom: "4px" }}>
                  SELECTED MASTER LEAD
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <h3 style={{ margin: 0, fontSize: "17px", color: "var(--ink)" }}>
                    {selectedLead.name}
                  </h3>
                  <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                    at <b>{selectedLead.brand}</b>
                  </span>
                </div>
                <div style={{ display: "flex", gap: "14px", marginTop: "6px", fontSize: "11.5px", color: "var(--muted)" }}>
                  <span>✉️ {selectedLead.email}</span>
                  {selectedLead.phone && <span>📱 {selectedLead.phone}</span>}
                  {selectedLead.website && (
                    <a
                      href={selectedLead.website}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "var(--grape)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "3px" }}
                    >
                      <Globe size={11} /> {selectedLead.website.replace(/^https?:\/\//, "")}
                    </a>
                  )}
                </div>
              </div>

              {/* View Switcher: Preview vs Raw Edit */}
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  type="button"
                  onClick={() => setComposerView("preview")}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "1px solid",
                    borderColor: composerView === "preview" ? "var(--grape-border)" : "#cbd5e1",
                    background: composerView === "preview" ? "var(--grape-light)" : "#fff",
                    color: composerView === "preview" ? "var(--grape)" : "#64748b",
                    fontSize: "11.5px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <Eye size={13} />
                  Visual Preview
                </button>
                <button
                  type="button"
                  onClick={() => setComposerView("edit")}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "1px solid",
                    borderColor: composerView === "edit" ? "var(--grape-border)" : "#cbd5e1",
                    background: composerView === "edit" ? "var(--grape-light)" : "#fff",
                    color: composerView === "edit" ? "var(--grape)" : "#64748b",
                    fontSize: "11.5px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <Edit3 size={13} />
                  Edit HTML Copy
                </button>
              </div>
            </div>

            {/* Subject Input */}
            <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "8px", padding: "16px 20px" }}>
              <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "var(--ink)", marginBottom: "6px" }}>
                Subject Line
              </label>
              <input
                type="text"
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--ink)",
                  background: "#fff",
                }}
              />
            </div>

            {/* Visual Preview or Edit Mode */}
            {composerView === "preview" ? (
              <div
                style={{
                  background: "#fff",
                  border: "1px solid var(--line)",
                  borderRadius: "8px",
                  overflow: "hidden",
                }}
              >
                {/* Simulated Email Header */}
                <div
                  style={{
                    background: "#f8fafc",
                    borderBottom: "1px solid var(--line)",
                    padding: "12px 18px",
                    fontSize: "12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  <div style={{ display: "flex", gap: "8px" }}>
                    <span style={{ color: "var(--muted)", width: "45px" }}>To:</span>
                    <span style={{ fontWeight: 600, color: "var(--ink)" }}>
                      {selectedLead.name} &lt;{selectedLead.email}&gt;
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <span style={{ color: "var(--muted)", width: "45px" }}>From:</span>
                    <span style={{ color: "var(--ink)" }}>
                      {template.senderName || "Kashika Gupta"} &lt;{template.senderEmail || "team@grapelabs.in"}&gt;
                    </span>
                  </div>
                </div>

                {/* Rendered Email Body with the Dual Buttons */}
                <div style={{ padding: "24px 28px" }}>
                  <div
                    dangerouslySetInnerHTML={{ __html: customBodyHtml }}
                    style={{ fontSize: "14px", lineHeight: "1.6", color: "#111827" }}
                  />

                  {/* Signature */}
                  <div
                    dangerouslySetInnerHTML={{ __html: template.signatureHtml }}
                    style={{ marginTop: "24px" }}
                  />
                </div>
              </div>
            ) : (
              <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "8px", padding: "16px 20px" }}>
                <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "var(--ink)", marginBottom: "6px" }}>
                  Email Body Markup
                </label>
                <textarea
                  rows={14}
                  value={customBodyHtml}
                  onChange={(e) => setCustomBodyHtml(e.target.value)}
                  style={{
                    width: "100%",
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                    fontSize: "12px",
                    lineHeight: 1.5,
                    padding: "12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    background: "#f8fafc",
                    color: "#0f172a",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            )}

            {/* Action Bar */}
            <div
              style={{
                background: "#fff",
                border: "1px solid var(--line)",
                borderRadius: "8px",
                padding: "16px 20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div style={{ fontSize: "11.5px", color: "var(--muted)" }}>
                <span>Will dispatch via n8n webhook and update lead row in Master Leads.</span>
              </div>

              <button
                type="button"
                className="save-button"
                style={{
                  background: "var(--grape)",
                  color: "#fff",
                  gap: "7px",
                  padding: "9px 18px",
                  fontSize: "13px",
                  fontWeight: 700,
                  borderRadius: "6px",
                  border: 0,
                  cursor: "pointer",
                }}
                disabled={sending}
                onClick={handleSendFollowUp}
              >
                {sending ? (
                  <LoaderCircle className="spin" size={15} />
                ) : (
                  <Send size={15} />
                )}
                {sending ? "Sending Follow-up..." : `Send Follow-up to ${selectedLead.firstName}`}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* 3. Follow-up Audit History */}
      {history.length > 0 && (
        <div
          style={{
            marginTop: "32px",
            background: "#fff",
            border: "1px solid var(--line)",
            borderRadius: "8px",
            padding: "20px 24px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <div>
              <span className="eyebrow" style={{ display: "block", marginBottom: "2px" }}>
                RECENT DISPATCHES
              </span>
              <h3 style={{ margin: 0, fontSize: "15px", color: "var(--ink)" }}>
                Follow-up Activity Log
              </h3>
            </div>
            <button
              type="button"
              onClick={fetchHistory}
              style={{
                background: "transparent",
                border: 0,
                color: "var(--muted)",
                fontSize: "11px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <RefreshCw size={11} className={loadingHistory ? "spin" : ""} /> Refresh
            </button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line)", color: "var(--muted)", textAlign: "left" }}>
                  <th style={{ padding: "8px 10px" }}>Recipient</th>
                  <th style={{ padding: "8px 10px" }}>Brand</th>
                  <th style={{ padding: "8px 10px" }}>Subject</th>
                  <th style={{ padding: "8px 10px" }}>Dispatched At</th>
                  <th style={{ padding: "8px 10px" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, idx) => (
                  <tr key={h.id || idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "10px", fontWeight: 600, color: "var(--ink)" }}>
                      {h.leadEmail}
                    </td>
                    <td style={{ padding: "10px", color: "var(--ink)" }}>{h.brand}</td>
                    <td style={{ padding: "10px", color: "var(--muted)", maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {h.subject}
                    </td>
                    <td style={{ padding: "10px", color: "var(--muted)", fontSize: "11px" }}>
                      {h.sentAt ? new Date(h.sentAt).toLocaleString() : "Just now"}
                    </td>
                    <td style={{ padding: "10px" }}>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 600,
                          padding: "2px 7px",
                          borderRadius: "4px",
                          background: "#dcfce7",
                          color: "#15803d",
                        }}
                      >
                        Dispatched
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
