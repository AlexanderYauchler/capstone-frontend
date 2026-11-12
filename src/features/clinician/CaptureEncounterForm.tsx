import { ArrowRight, ShieldCheck } from "lucide-react";
import { useAuth } from "../../app/providers/AuthProvider";
import { Button } from "../../design-system/components/Button";
import { Card } from "../../design-system/components/Card";
import { StatusBadge } from "../../design-system/components/StatusBadge";
import type {
  ClinicalSession,
  DepartmentId,
  DiagnosisCategory,
  ReportTemplateId,
} from "../../domain/models";
import { DEMO_PATIENTS } from "../../services/demo/fixtures";
import {
  DEPARTMENT_LABELS,
  DIAGNOSIS_LABELS,
  formatEncounterDateDisplay,
} from "./session-formatters";

export interface CaptureEncounterFields {
  readonly selectedPatientId: string;
  readonly selectedDepartment: DepartmentId;
  readonly visitType: string;
  readonly diagnosisCategory: DiagnosisCategory;
  readonly primarySymptom: ClinicalSession["primarySymptom"];
  readonly templateId: ReportTemplateId;
}

const VISIT_TYPE_SUGGESTIONS: readonly string[] = [
  "Follow-up consultation",
  "Diabetes follow-up",
  "Hypertension follow-up",
  "Acute visit",
  "Wellness consultation",
  "Annual physical",
] as const;

export function CaptureEncounterForm({
  fields,
  onFieldsChange,
  activeSession,
  consentChecked,
  onConsentChange,
  isInitializingSession,
  onConfirm,
}: {
  readonly fields: CaptureEncounterFields;
  readonly onFieldsChange: (changes: Partial<CaptureEncounterFields>) => void;
  readonly activeSession?: ClinicalSession;
  readonly consentChecked: boolean;
  readonly onConsentChange: (checked: boolean) => void;
  readonly isInitializingSession: boolean;
  readonly onConfirm: () => Promise<void>;
}) {
  const { currentUser } = useAuth();
  const {
    selectedPatientId,
    selectedDepartment,
    visitType,
    diagnosisCategory,
    primarySymptom,
    templateId,
  } = fields;
  const setSelectedPatientId = (value: string) =>
    onFieldsChange({ selectedPatientId: value });
  const setSelectedDepartment = (value: DepartmentId) =>
    onFieldsChange({ selectedDepartment: value });
  const setVisitType = (value: string) => onFieldsChange({ visitType: value });
  const setDiagnosisCategory = (value: DiagnosisCategory) =>
    onFieldsChange({ diagnosisCategory: value });
  const setPrimarySymptom = (value: ClinicalSession["primarySymptom"]) =>
    onFieldsChange({ primarySymptom: value });
  const setTemplateId = (value: ReportTemplateId) =>
    onFieldsChange({ templateId: value });
  const selectedPatient =
    DEMO_PATIENTS.find((patient) => patient.id === selectedPatientId) ??
    DEMO_PATIENTS[0]!;
  const isConsentConfirmed =
    activeSession?.capture.consentConfirmed ?? consentChecked;
  return (
    <div className="min-w-0 w-full max-w-3xl mx-auto space-y-6">
      {/* Step 1: Encounter Setup & Patient Confirmation */}
      <Card padding="md" className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#e4ece7] pb-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#00783c]">
              Stage 1 of 4
            </span>
            <h2 className="text-lg font-bold text-[#0d4026] font-display">
              Patient &amp; Consent
            </h2>
          </div>
          {activeSession ? (
            <StatusBadge tone="success">Linked: {activeSession.id}</StatusBadge>
          ) : (
            <StatusBadge tone="neutral">New Encounter</StatusBadge>
          )}
        </div>

        <div className="space-y-3.5 text-xs sm:text-sm">
          {/* Patient Selector */}
          <div className="space-y-1">
            <label
              htmlFor="capture-patient-select"
              className="block text-xs font-bold uppercase tracking-wider text-[#0d4026]"
            >
              Synthetic Patient Record
            </label>
            <select
              id="capture-patient-select"
              disabled={Boolean(activeSession)}
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="w-full h-10 px-3 rounded-[8px] border border-[#056233]/40 bg-white text-sm font-medium text-[#242628] disabled:bg-[#f7f8f8] disabled:text-[#495057]"
            >
              {DEMO_PATIENTS.map((pat) => (
                <option key={pat.id} value={pat.id}>
                  {pat.displayName} ({pat.id} · {pat.dateOfBirthLabel})
                </option>
              ))}
            </select>
          </div>

          {/* Department & Visit Type */}
          <div className="hidden grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="hidden space-y-1">
              <label
                htmlFor="capture-department-select"
                className="block text-xs font-bold uppercase tracking-wider text-[#0d4026]"
              >
                Department
              </label>
              <select
                id="capture-department-select"
                disabled={Boolean(activeSession)}
                value={selectedDepartment}
                onChange={(e) =>
                  setSelectedDepartment(e.target.value as DepartmentId)
                }
                className="w-full h-10 px-3 rounded-[8px] border border-[#056233]/40 bg-white text-sm font-medium text-[#242628] disabled:bg-[#f7f8f8]"
              >
                {(Object.keys(DEPARTMENT_LABELS) as DepartmentId[]).map(
                  (dept) => (
                    <option key={dept} value={dept}>
                      {DEPARTMENT_LABELS[dept]}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="capture-template-select"
                className="block text-xs font-bold uppercase tracking-wider text-[#0d4026]"
              >
                Documentation Template
              </label>
              <select
                id="capture-template-select"
                disabled={Boolean(activeSession)}
                value={templateId}
                onChange={(e) =>
                  setTemplateId(e.target.value as ReportTemplateId)
                }
                className="w-full h-10 px-3 rounded-[8px] border border-[#056233]/40 bg-white text-sm font-medium text-[#242628] disabled:bg-[#f7f8f8]"
              >
                <option value="soap_standard">Standard SOAP Note</option>
                <option value="narrative_summary">
                  Narrative Visit Summary
                </option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="capture-visit-type-input"
              className="block text-xs font-bold uppercase tracking-wider text-[#0d4026]"
            >
              Visit Reason / Encounter Type
            </label>
            <input
              id="capture-visit-type-input"
              type="text"
              list="visit-type-suggestions"
              disabled={Boolean(activeSession)}
              value={visitType}
              onChange={(e) => setVisitType(e.target.value)}
              placeholder="e.g., Diabetes follow-up, Acute visit…"
              className="w-full h-10 px-3 rounded-[8px] border border-[#056233]/40 bg-white text-sm text-[#242628] disabled:bg-[#f7f8f8]"
            />
            <datalist id="visit-type-suggestions">
              {VISIT_TYPE_SUGGESTIONS.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1">
              <label
                htmlFor="capture-diagnosis-select"
                className="block text-xs font-bold uppercase tracking-wider text-[#0d4026]"
              >
                Clinical Category
              </label>
              <select
                id="capture-diagnosis-select"
                disabled={Boolean(activeSession)}
                value={diagnosisCategory}
                onChange={(e) =>
                  setDiagnosisCategory(e.target.value as DiagnosisCategory)
                }
                className="w-full h-10 px-3 rounded-[8px] border border-[#056233]/40 bg-white text-sm font-medium text-[#242628] disabled:bg-[#f7f8f8]"
              >
                {(Object.keys(DIAGNOSIS_LABELS) as DiagnosisCategory[]).map(
                  (cat) => (
                    <option key={cat} value={cat}>
                      {DIAGNOSIS_LABELS[cat]}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div className="hidden space-y-1">
              <label
                htmlFor="capture-symptom-select"
                className="block text-xs font-bold uppercase tracking-wider text-[#0d4026]"
              >
                Primary Symptom
              </label>
              <select
                id="capture-symptom-select"
                disabled={Boolean(activeSession)}
                value={primarySymptom}
                onChange={(e) =>
                  setPrimarySymptom(
                    e.target.value as
                      | "Fatigue"
                      | "Cough"
                      | "Headache"
                      | "Increased thirst"
                      | "Other",
                  )
                }
                className="w-full h-10 px-3 rounded-[8px] border border-[#056233]/40 bg-white text-sm font-medium text-[#242628] disabled:bg-[#f7f8f8]"
              >
                <option value="Fatigue">Fatigue</option>
                <option value="Cough">Cough</option>
                <option value="Headache">Headache</option>
                <option value="Increased thirst">Increased thirst</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="rounded-[10px] bg-[#f7f8f8] border border-[#d5e0db] p-3 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[#495057]">Attending Clinician:</span>
              <strong className="text-[#0d4026]">
                {currentUser.displayName}
              </strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#495057]">Encounter Date:</span>
              <strong className="text-[#0d4026]">
                {formatEncounterDateDisplay(
                  activeSession?.encounterDate ?? "2026-10-06",
                )}
              </strong>
            </div>
            {activeSession && (
              <div className="flex items-center justify-between">
                <span className="text-[#495057]">Assigned Session ID:</span>
                <strong className="font-mono text-[#00783c]">
                  {activeSession.id}
                </strong>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Step 2: Patient Recording Consent & Clinical Privacy Gate */}
      <Card
        tone={isConsentConfirmed ? "mint" : "peach"}
        padding="md"
        className={`space-y-3.5 border-l-4 ${
          isConsentConfirmed ? "border-l-[#00783c]" : "border-l-[#f26b21]"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#00783c]">
              Required before recording
            </span>
            <h2 className="text-lg font-bold text-[#0d4026] font-display">
              Recording consent
            </h2>
          </div>
          <StatusBadge tone={isConsentConfirmed ? "success" : "warning"}>
            {isConsentConfirmed ? "Consent Confirmed" : "Consent Required"}
          </StatusBadge>
        </div>

        <label
          htmlFor="patient-consent-checkbox"
          className="flex items-start gap-3 p-3 rounded-[10px] bg-white border border-[#cde0d4] cursor-pointer text-xs sm:text-sm text-[#242628]"
        >
          <input
            id="patient-consent-checkbox"
            type="checkbox"
            checked={isConsentConfirmed}
            disabled={Boolean(activeSession?.capture.consentConfirmed)}
            onChange={(e) => onConsentChange(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-[#00783c] rounded cursor-pointer"
          />
          <span className="leading-relaxed">
            <strong>
              I confirm that verbal or written recording consent has been
              obtained from{" "}
              {activeSession?.patientName ?? selectedPatient.displayName}
            </strong>{" "}
            for this clinical visit documentation workflow.
          </span>
        </label>

        {!activeSession && (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="primary"
              size="md"
              disabled={!consentChecked || isInitializingSession}
              iconRight={<ArrowRight className="w-4 h-4" aria-hidden="true" />}
              onClick={() => void onConfirm()}
            >
              {isInitializingSession
                ? "Preparing visit…"
                : "Continue to recording"}
            </Button>
          </div>
        )}

        <div className="rounded-[10px] bg-white/85 border border-[#cde0d4] p-3 text-[11.5px] text-[#495057] space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-[#0d4026]">
            <ShieldCheck
              className="w-4 h-4 text-[#00783c] shrink-0"
              aria-hidden="true"
            />
            <span>Demonstration Consent &amp; Audio Privacy Boundaries</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 leading-relaxed">
            <li>
              <strong>Demonstration Implementation:</strong> This consent
              workflow is a capstone demonstration gate on synthetic data and
              not a legally validated consent instrument or HIPAA compliance
              guarantee.
            </li>
            <li>
              <strong>Clinician-Only Access:</strong> Only authorized clinicians
              can record or upload visit audio. Patients never have access to
              raw clinical recordings.
            </li>
            <li>
              <strong>Zero Persistent Browser Storage:</strong> Captured audio
              Blobs are held strictly in transient browser memory (never written
              to <code>localStorage</code>, <code>sessionStorage</code>, or
              third-party servers) and can be discarded at any time.
            </li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
