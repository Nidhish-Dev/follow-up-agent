"use client";
import React, { useState, useEffect, useRef } from "react";
import { User } from "firebase/auth";
import {
  Mail,
  Save,
  RotateCcw,
  Monitor,
  Smartphone,
  Copy,
  Check,
  LoaderCircle,
  Building,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  EmailTemplateConfig,
  DEFAULT_EMAIL_TEMPLATE,
  DEFAULT_EMAIL_BODY_HTML,
  DEFAULT_EMAIL_SIGNATURE_HTML,
  DEFAULT_INDUSTRY_TEMPLATES,
  INDUSTRY_LIST,
  IndustryType,
} from "@/lib/email-template-types";

interface SampleLead {
  id: string;
  name: string;
  brand: string;
  industry: string;
  email: string;
  hook: string;
  closer: string;
  verticalFocus: string;
}

const AVAILABLE_VARIABLES = [
  { tag: "{{first_name}}", label: "Recipient First Name", desc: "e.g. Alex" },
  { tag: "{{brand}}", label: "Brand Name", desc: "e.g. AllStar Athletics" },
  { tag: "{{achievement_hook}}", label: "AI Achievement Hook", desc: "Personalized brand praise" },
  { tag: "{{hook_closer}}", label: "Hook Closer (Bold)", desc: "e.g. That's the hard part..." },
  { tag: "{{vertical_focus}}", label: "Vertical Focus", desc: "Specific ops infrastructure focus" },
  { tag: "{{call_url}}", label: "Booking Link", desc: "Calendly tracking URL" },
  { tag: "{{whatsapp_url}}", label: "WhatsApp Link", desc: "WhatsApp direct chat URL" },
  { tag: "{{sender_name}}", label: "Sender Name", desc: "Kashika Gupta" },
];

export function EmailTemplateView({
  fbUser,
  setNotice,
}: {
  fbUser: User | null;
  setNotice: (n: any) => void;
}) {
  const [template, setTemplate] = useState<EmailTemplateConfig>(DEFAULT_EMAIL_TEMPLATE);
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryType>("D2C-Apparel");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"body" | "signature">("body");

  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const sigTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize sample lead based on selected industry preset
  const activePreset = DEFAULT_INDUSTRY_TEMPLATES[selectedIndustry] || DEFAULT_INDUSTRY_TEMPLATES["D2C-Apparel"];
  const activeLead: SampleLead = {
    id: activePreset.id,
    name: activePreset.sampleName,
    brand: activePreset.sampleBrand,
    industry: activePreset.name,
    email: activePreset.sampleEmail,
    hook: activePreset.sampleHook,
    closer: activePreset.sampleCloser,
    verticalFocus: activePreset.sampleVerticalFocus,
  };

  // Fetch saved template
  useEffect(() => {
    if (!fbUser) return;
    const fetchTemplate = async () => {
      setLoading(true);
      try {
        const token = await fbUser.getIdToken();
        const res = await fetch("/api/template", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.template) {
            // Merge defaults for all 12 industries to guarantee complete dictionary
            const mergedIndustryTemplates = {
              ...(DEFAULT_EMAIL_TEMPLATE.industryTemplates || {}),
              ...(data.template.industryTemplates || {}),
            };
            setTemplate({
              ...DEFAULT_EMAIL_TEMPLATE,
              ...data.template,
              industryTemplates: mergedIndustryTemplates,
            });
            if (data.template.selectedIndustry && INDUSTRY_LIST.includes(data.template.selectedIndustry as IndustryType)) {
              setSelectedIndustry(data.template.selectedIndustry as IndustryType);
            }
          }
        }
      } catch (err) {
        console.warn("Failed to fetch email template:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTemplate();
  }, [fbUser]);

  // Current industry's active subject & body
  const currentIndustrySubject =
    template.industryTemplates?.[selectedIndustry]?.subject ??
    DEFAULT_INDUSTRY_TEMPLATES[selectedIndustry]?.subject ??
    template.subject;

  const currentIndustryBodyHtml =
    template.industryTemplates?.[selectedIndustry]?.bodyHtml ??
    DEFAULT_INDUSTRY_TEMPLATES[selectedIndustry]?.bodyHtml ??
    template.bodyHtml;

  // Handle updates to the active industry template
  const handleUpdateCurrentIndustry = (updates: { subject?: string; bodyHtml?: string }) => {
    setTemplate((prev) => {
      const existing = prev.industryTemplates || {};
      const current = existing[selectedIndustry] || {
        subject: DEFAULT_INDUSTRY_TEMPLATES[selectedIndustry]?.subject || prev.subject,
        bodyHtml: DEFAULT_INDUSTRY_TEMPLATES[selectedIndustry]?.bodyHtml || prev.bodyHtml,
      };

      const updatedMap = {
        ...existing,
        [selectedIndustry]: {
          ...current,
          ...updates,
        },
      };

      return {
        ...prev,
        // If updating the active industry, also keep top-level subject/body synced for general fallbacks
        subject: updates.subject !== undefined && selectedIndustry === "D2C-General" ? updates.subject : prev.subject,
        bodyHtml: updates.bodyHtml !== undefined && selectedIndustry === "D2C-General" ? updates.bodyHtml : prev.bodyHtml,
        industryTemplates: updatedMap,
        selectedIndustry,
      };
    });
  };

  const saveTemplate = async () => {
    if (!fbUser) return;
    setSaving(true);
    try {
      const token = await fbUser.getIdToken();
      const payload: EmailTemplateConfig = {
        ...template,
        selectedIndustry,
      };

      const res = await fetch("/api/template", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save template");
      setTemplate(data.template);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("email-template-updated", { detail: data.template }));
      }
      setNotice({
        type: "success",
        text: `Email HTML templates for all 12 industries successfully saved! The workflow will automatically pick templates matching each lead's industry.`,
      });
    } catch (err: any) {
      setNotice({
        type: "error",
        text: err?.message || "Failed to save email template.",
      });
    } finally {
      setSaving(false);
    }
  };

  const resetCurrentIndustry = () => {
    const preset = DEFAULT_INDUSTRY_TEMPLATES[selectedIndustry];
    if (!preset) return;
    if (confirm(`Reset "${selectedIndustry}" email copy and subject back to default?`)) {
      handleUpdateCurrentIndustry({
        subject: preset.subject,
        bodyHtml: preset.bodyHtml,
      });
    }
  };

  const resetAllToDefault = () => {
    if (confirm("Reset ALL 12 industry email templates, settings, and signature back to defaults?")) {
      setTemplate(DEFAULT_EMAIL_TEMPLATE);
    }
  };

  const insertVariable = (tag: string) => {
    const targetRef = activeTab === "body" ? bodyTextareaRef : sigTextareaRef;
    const textarea = targetRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = activeTab === "body" ? currentIndustryBodyHtml : template.signatureHtml;
    const newVal = currentVal.substring(0, start) + tag + currentVal.substring(end);

    if (activeTab === "body") {
      handleUpdateCurrentIndustry({ bodyHtml: newVal });
    } else {
      setTemplate((prev) => ({ ...prev, signatureHtml: newVal }));
    }

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 50);
  };

  // Interpolate variables for preview
  const interpolate = (html: string, lead: SampleLead) => {
    const rawWaUrl = template.whatsappUrl || "https://wa.me/918388892300?text=Hi%20Kashika,%20saw%20your%20email";
    const resolvedWaUrl = rawWaUrl.replace(/\{\{\s*brand\s*\}\}/gi, encodeURIComponent(lead.brand || "your brand"));

    return html
      .replace(/\{\{\s*first_name\s*\}\}/gi, lead.name)
      .replace(/\{\{\s*recipientName\s*\}\}/gi, lead.name)
      .replace(/\{\{\s*brand\s*\}\}/gi, lead.brand)
      .replace(/\{\{\s*achievement_hook\s*\}\}/gi, lead.hook)
      .replace(/\{\{\s*hook_closer\s*\}\}/gi, lead.closer)
      .replace(/\{\{\s*vertical_focus\s*\}\}/gi, lead.verticalFocus)
      .replace(/\{\{\s*call_url\s*\}\}/gi, template.callUrl || "https://calendly.com/team-grapelabs/30min")
      .replace(/\{\{\s*whatsapp_url\s*\}\}/gi, resolvedWaUrl)
      .replace(/\{\{\s*call_button_text\s*\}\}/gi, template.callButtonText || "Book a Free Call")
      .replace(/\{\{\s*whatsapp_text\s*\}\}/gi, template.whatsappText || "Text me on WhatsApp")
      .replace(/\{\{\s*sender_name\s*\}\}/gi, template.senderName || "Kashika Gupta");
  };

  const previewSubject = interpolate(currentIndustrySubject, activeLead);
  const previewBody = interpolate(currentIndustryBodyHtml, activeLead);
  const previewSignature = interpolate(template.signatureHtml, activeLead);

  const copyFullHtml = () => {
    const combined = `${previewBody}\n\n<!-- Infrastructure Diagram -->\n<table border="0" cellpadding="0" cellspacing="0" style="margin: 18px 0 22px 0;"><tr><td><img src="https://lh3.googleusercontent.com/..." alt="${activeLead.brand} AI Ops Layer" width="600" style="width: 100%; max-width: 650px;" /></td></tr></table>\n\n${previewSignature}`;
    navigator.clipboard.writeText(combined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ marginTop: "24px" }}>
      {/* Action Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px",
          background: "#fff",
          padding: "16px 20px",
          borderRadius: "8px",
          border: "1px solid var(--line)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              background: "#eff6ff",
              color: "#2563eb",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Mail size={18} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "16.5px", fontWeight: 700, color: "var(--ink)" }}>
              Industry Segment Email Designer & Router
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: "11.5px", color: "var(--muted)" }}>
              Configure customized email copy for all 12 industry segments. The workflow automatically selects the template matching each lead&apos;s industry.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={resetCurrentIndustry}
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
            title="Reset this industry's copy to preset default"
          >
            <RotateCcw size={13} />
            Reset Current Segment
          </button>

          <button
            type="button"
            onClick={copyFullHtml}
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
            title="Copy combined rendered HTML"
          >
            {copied ? <Check size={13} color="#16a34a" /> : <Copy size={13} />}
            {copied ? "Copied!" : "Copy Full HTML"}
          </button>

          <button
            type="button"
            className="save-button"
            style={{ background: "#2563eb", gap: "6px" }}
            onClick={saveTemplate}
            disabled={saving || loading}
          >
            {saving ? <LoaderCircle className="spin" size={14} /> : <Save size={14} />}
            {saving ? "Saving Templates..." : "Save All Templates"}
          </button>
        </div>
      </div>

      {/* Industry Segment Selector Tabs */}
      <div
        style={{
          marginTop: "16px",
          background: "#fff",
          border: "1px solid var(--line)",
          borderRadius: "8px",
          padding: "12px 16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Layers size={15} color="#2563eb" />
            <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--ink)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Select Industry Segment ({INDUSTRY_LIST.length} Segments)
            </span>
          </div>
          <span style={{ fontSize: "11px", color: "var(--muted)" }}>
            Workflow auto-matches the lead&apos;s Sheet Industry to these templates
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: "8px",
          }}
        >
          {INDUSTRY_LIST.map((ind) => {
            const isSelected = selectedIndustry === ind;
            return (
              <button
                key={ind}
                type="button"
                onClick={() => setSelectedIndustry(ind)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 10px",
                  borderRadius: "6px",
                  border: isSelected ? "2px solid #2563eb" : "1px solid #e2e8f0",
                  background: isSelected ? "#eff6ff" : "#f8fafc",
                  color: isSelected ? "#1d4ed8" : "#334155",
                  fontWeight: isSelected ? 700 : 500,
                  fontSize: "12px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  textAlign: "left",
                }}
              >
                <span>{ind}</span>
                {isSelected && <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#2563eb" }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2-Column Editor + Live Preview Grid */}
      <div className="email-editor-grid" style={{ marginTop: "16px" }}>
        {/* Left Column: Form & Code Editor */}
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          
          {/* Active Segment Badge */}
          <div
            style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: "8px",
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Building size={16} color="#16a34a" />
              <div>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#166534" }}>
                  Editing Template for Segment: {selectedIndustry}
                </span>
                <span style={{ display: "block", fontSize: "11px", color: "#15803d" }}>
                  Sample Brand: {activePreset.sampleBrand} · Lead: {activePreset.sampleName}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={resetCurrentIndustry}
              style={{
                background: "#fff",
                border: "1px solid #86efac",
                color: "#166534",
                padding: "3px 8px",
                borderRadius: "5px",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Reset {selectedIndustry}
            </button>
          </div>

          {/* 1. Subject Line for Current Industry */}
          <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "8px", padding: "18px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--ink)", marginBottom: "4px" }}>
              Subject Line ({selectedIndustry})
            </label>
            <span style={{ display: "block", fontSize: "11px", color: "var(--muted)", marginBottom: "8px" }}>
              Dynamic subject line sent to leads in {selectedIndustry}. Use <code>{"{{brand}}"}</code> to insert lead brand.
            </span>
            <input
              type="text"
              value={currentIndustrySubject}
              onChange={(e) => handleUpdateCurrentIndustry({ subject: e.target.value })}
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

          {/* 2. Sender & Global Call Booking Settings */}
          <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "8px", padding: "18px" }}>
            <span className="eyebrow" style={{ display: "block", marginBottom: "8px" }}>
              GLOBAL SENDER & BOOKING DESTINATIONS
            </span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--muted)", marginBottom: "4px" }}>
                  Sender Name
                </label>
                <input
                  type="text"
                  value={template.senderName}
                  onChange={(e) => setTemplate((p) => ({ ...p, senderName: e.target.value }))}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    fontSize: "12px",
                    background: "#fff",
                    color: "var(--ink)",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--muted)", marginBottom: "4px" }}>
                  Sender Email (Sending Address)
                </label>
                <input
                  type="email"
                  value={template.senderEmail}
                  onChange={(e) => setTemplate((p) => ({ ...p, senderEmail: e.target.value }))}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    fontSize: "12px",
                    background: "#fff",
                    color: "var(--ink)",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--muted)", marginBottom: "4px" }}>
                  Calendly Link ({"{{call_url}}"})
                </label>
                <input
                  type="url"
                  value={template.callUrl}
                  onChange={(e) => setTemplate((p) => ({ ...p, callUrl: e.target.value }))}
                  placeholder="https://calendly.com/your-team/30min"
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    fontSize: "12px",
                    background: "#fff",
                    color: "var(--ink)",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--muted)", marginBottom: "4px" }}>
                  Call Button Text (Purple CTA)
                </label>
                <input
                  type="text"
                  value={template.callButtonText || "Book a Free Call"}
                  onChange={(e) => setTemplate((p) => ({ ...p, callButtonText: e.target.value }))}
                  placeholder="Book a Free Call"
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    fontSize: "12px",
                    background: "#fff",
                    color: "var(--ink)",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--muted)", marginBottom: "4px" }}>
                  WhatsApp Link / Chat URL ({"{{whatsapp_url}}"})
                </label>
                <input
                  type="text"
                  value={template.whatsappUrl || ""}
                  onChange={(e) => setTemplate((p) => ({ ...p, whatsappUrl: e.target.value }))}
                  placeholder="https://wa.me/918388892300?text=..."
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    fontSize: "12px",
                    background: "#fff",
                    color: "var(--ink)",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--muted)", marginBottom: "4px" }}>
                  WhatsApp Button Text (Green CTA)
                </label>
                <input
                  type="text"
                  value={template.whatsappText || "Text me on WhatsApp"}
                  onChange={(e) => setTemplate((p) => ({ ...p, whatsappText: e.target.value }))}
                  placeholder="Text me on WhatsApp"
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    fontSize: "12px",
                    background: "#fff",
                    color: "var(--ink)",
                  }}
                />
              </div>
            </div>
          </div>

          {/* 3. HTML Markup Editor */}
          <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "8px", padding: "18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  type="button"
                  onClick={() => setActiveTab("body")}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 700,
                    border: "1px solid",
                    borderColor: activeTab === "body" ? "#2563eb" : "#cbd5e1",
                    background: activeTab === "body" ? "#eff6ff" : "#fff",
                    color: activeTab === "body" ? "#2563eb" : "#475569",
                    cursor: "pointer",
                  }}
                >
                  Body HTML ({selectedIndustry})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("signature")}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 700,
                    border: "1px solid",
                    borderColor: activeTab === "signature" ? "#2563eb" : "#cbd5e1",
                    background: activeTab === "signature" ? "#eff6ff" : "#fff",
                    color: activeTab === "signature" ? "#2563eb" : "#475569",
                    cursor: "pointer",
                  }}
                >
                  Signature & Footer HTML (Shared)
                </button>
              </div>

              <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                Click a variable below to insert:
              </span>
            </div>

            {/* Variable Insertion Chips */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
              {AVAILABLE_VARIABLES.map((v) => (
                <button
                  key={v.tag}
                  type="button"
                  className="variable-chip"
                  onClick={() => insertVariable(v.tag)}
                  title={`${v.label} (${v.desc})`}
                >
                  <span>{v.tag}</span>
                </button>
              ))}
            </div>

            {/* Body Editor */}
            {activeTab === "body" ? (
              <div>
                <textarea
                  ref={bodyTextareaRef}
                  value={currentIndustryBodyHtml}
                  onChange={(e) => handleUpdateCurrentIndustry({ bodyHtml: e.target.value })}
                  rows={14}
                  style={{
                    width: "100%",
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                    fontSize: "12px",
                    lineHeight: 1.5,
                    padding: "12px",
                    background: "#0f172a",
                    color: "#f8fafc",
                    borderRadius: "8px",
                    border: "1px solid #334155",
                    resize: "vertical",
                    boxSizing: "border-box",
                  }}
                  spellCheck={false}
                />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px", fontSize: "11px", color: "var(--muted)" }}>
                  <span>Tip: Supports standard HTML tags: <code>&lt;b&gt;</code>, <code>&lt;a&gt;</code>, <code>&lt;br&gt;</code>, inline CTA buttons table.</span>
                  <button
                    type="button"
                    onClick={resetCurrentIndustry}
                    style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", textDecoration: "underline", fontSize: "11px" }}
                  >
                    Restore {selectedIndustry} default
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <textarea
                  ref={sigTextareaRef}
                  value={template.signatureHtml}
                  onChange={(e) => setTemplate((p) => ({ ...p, signatureHtml: e.target.value }))}
                  rows={12}
                  style={{
                    width: "100%",
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                    fontSize: "12px",
                    lineHeight: 1.5,
                    padding: "12px",
                    background: "#0f172a",
                    color: "#f8fafc",
                    borderRadius: "8px",
                    border: "1px solid #334155",
                    resize: "vertical",
                    boxSizing: "border-box",
                  }}
                  spellCheck={false}
                />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px", fontSize: "11px", color: "var(--muted)" }}>
                  <span>Custom signature appended below the AI Architecture Diagram across all segments.</span>
                  <button
                    type="button"
                    onClick={() => setTemplate((p) => ({ ...p, signatureHtml: DEFAULT_EMAIL_SIGNATURE_HTML }))}
                    style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", textDecoration: "underline", fontSize: "11px" }}
                  >
                    Restore default signature
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Email Client Preview */}
        <div>
          <div className="email-preview-container">
            {/* Chrome Bar */}
            <div className="email-preview-chrome">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div className="chrome-dots">
                  <div className="chrome-dot red" />
                  <div className="chrome-dot yellow" />
                  <div className="chrome-dot green" />
                </div>
                <span style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--muted)" }}>
                  Gmail Preview · {selectedIndustry}
                </span>
              </div>

              {/* Device Switcher */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ display: "flex", gap: "2px", background: "#f1f5f9", padding: "2px", borderRadius: "6px" }}>
                  <button
                    type="button"
                    className={`device-toggle-btn ${previewDevice === "desktop" ? "active" : ""}`}
                    onClick={() => setPreviewDevice("desktop")}
                    title="Desktop wide preview"
                  >
                    <Monitor size={12} />
                  </button>
                  <button
                    type="button"
                    className={`device-toggle-btn ${previewDevice === "mobile" ? "active" : ""}`}
                    onClick={() => setPreviewDevice("mobile")}
                    title="Mobile phone preview"
                  >
                    <Smartphone size={12} />
                  </button>
                </div>
              </div>
            </div>

            {/* Email Client Content View */}
            <div style={{ background: "#f8fafc", padding: previewDevice === "desktop" ? "20px" : "10px" }}>
              <div
                className={previewDevice === "mobile" ? "phone-frame" : ""}
                style={{
                  background: "#fff",
                  borderRadius: previewDevice === "desktop" ? "8px" : "26px",
                  border: previewDevice === "desktop" ? "1px solid #e2e8f0" : "none",
                  boxShadow: previewDevice === "desktop" ? "0 2px 10px rgba(0,0,0,0.02)" : "none",
                  overflow: "hidden",
                }}
              >
                {previewDevice === "mobile" && <div className="phone-notch" />}

                {/* Email Subject Header */}
                <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                    <span style={{ background: "#eff6ff", color: "#2563eb", fontSize: "10.5px", fontWeight: 700, padding: "2px 7px", borderRadius: "4px" }}>
                      {selectedIndustry} Segment
                    </span>
                  </div>
                  <h3 style={{ margin: "0 0 10px", fontSize: "15px", fontWeight: 700, color: "#0f172a", lineHeight: 1.4 }}>
                    {previewSubject}
                  </h3>

                  {/* Sender Meta */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          background: "#e0e7ff",
                          color: "#4338ca",
                          fontWeight: 700,
                          fontSize: "12px",
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        {template.senderName[0] || "K"}
                      </div>
                      <div>
                        <div style={{ fontSize: "12.5px", fontWeight: 600, color: "#1e293b" }}>
                          {template.senderName}{" "}
                          <span style={{ fontSize: "11px", fontWeight: 400, color: "#64748b" }}>
                            &lt;{template.senderEmail}&gt;
                          </span>
                        </div>
                        <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                          to {activeLead.name} &lt;{activeLead.email}&gt;
                        </div>
                      </div>
                    </div>

                    <span style={{ fontSize: "11px", color: "#94a3b8" }}>Today, 09:30 AM</span>
                  </div>
                </div>

                {/* Email Body Content */}
                <div style={{ padding: "20px 22px" }}>
                  {/* Live Rendered Body HTML */}
                  <div
                    dangerouslySetInnerHTML={{ __html: previewBody }}
                    style={{ fontSize: "14px", lineHeight: 1.5, color: "#111827" }}
                  />

                  {/* Visual Infrastructure Diagram Mockup */}
                  <div style={{ margin: "22px 0 20px 0" }}>
                    <div
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        padding: "16px",
                        background: "#fafbfc",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          {activeLead.brand.toUpperCase()} AI OPS LAYER
                        </span>
                        <span style={{ fontSize: "10px", background: "#dcfce7", color: "#15803d", padding: "2px 6px", borderRadius: "4px", fontWeight: 700 }}>
                          Auto-Attached PNG Diagram
                        </span>
                      </div>

                      {/* Schematic mini-nodes representing the diagram */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", margin: "10px 0" }}>
                        <div style={{ background: "#ffedd5", border: "1px solid #fdba74", borderRadius: "6px", padding: "6px 8px" }}>
                          <span style={{ fontSize: "9px", fontWeight: 700, color: "#9a3412", display: "block" }}>ATTRACT</span>
                          <span style={{ fontSize: "8.5px", color: "#c2410c" }}>Traffic Ingestion</span>
                        </div>
                        <div style={{ background: "#ede9fe", border: "1px solid #c4b5fd", borderRadius: "6px", padding: "6px 8px" }}>
                          <span style={{ fontSize: "9px", fontWeight: 700, color: "#5b21b6", display: "block" }}>CONVERT</span>
                          <span style={{ fontSize: "8.5px", color: "#6d28d9" }}>Ops Automation</span>
                        </div>
                        <div style={{ background: "#dcfce7", border: "1px solid #86efac", borderRadius: "6px", padding: "6px 8px" }}>
                          <span style={{ fontSize: "9px", fontWeight: 700, color: "#166534", display: "block" }}>SCALE</span>
                          <span style={{ fontSize: "8.5px", color: "#15803d" }}>Retention Loops</span>
                        </div>
                      </div>

                      <span style={{ fontSize: "10px", color: "#94a3b8" }}>
                        (Clickable full diagram generated by Graphviz & uploaded to Drive)
                      </span>
                    </div>
                  </div>

                  {/* Rendered Signature HTML */}
                  <div
                    dangerouslySetInnerHTML={{ __html: previewSignature }}
                    style={{ fontSize: "13px", lineHeight: 1.45, color: "#374151" }}
                  />

                  {/* Tracking Pixel Indicator */}
                  <div
                    style={{
                      marginTop: "18px",
                      paddingTop: "12px",
                      borderTop: "1px dashed #e2e8f0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: "10.5px",
                      color: "#94a3b8",
                    }}
                  >
                    <span>1x1 Open Tracking Pixel & Click Tracking Active</span>
                    <span style={{ color: "#10b981", fontWeight: 600 }}>✓ Verified n8n Webhook</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
