import type {
  ClinicalReport,
  ClinicalSession,
  DiagnosisCategory,
  SoapSections,
  Transcript,
} from '../../../domain/models';

// ============================================================================
// CoSign — Simulated draft builder for newly recorded demo visits
// Produces a clearly labeled, synthetic transcript and SOAP draft for the
// session's own patient. Nothing here is derived from recorded audio.
// ============================================================================

export const SIMULATED_TRANSCRIPT_NOTICE =
  'Simulated demo transcript · Not produced from the recorded audio';

interface CategoryScript {
  readonly patientOpening: string;
  readonly clinicianFinding: string;
  readonly clinicianPlan: string;
  readonly soap: SoapSections;
  readonly clarificationPrompt: string;
  readonly clarificationRationale: string;
  readonly clarificationDemoAnswer: string;
  readonly nextSteps: ClinicalReport['patientNextSteps'];
}

const SCRIPTS: Record<DiagnosisCategory, CategoryScript> = {
  diabetes: {
    patientOpening: 'I have been more tired lately and a bit thirstier than usual.',
    clinicianFinding: 'Your recent home glucose log is running higher than our target range.',
    clinicianPlan: 'We will order an HbA1c and review your medication at the next visit.',
    soap: {
      subjective: 'Patient reports fatigue and increased thirst. Home glucose log reviewed.',
      objective: 'Patient-reported home glucose values above target. No vitals captured in this demo.',
      assessment: 'Type 2 diabetes follow-up; glycemic control to be reassessed with labs.',
      plan: 'Order HbA1c. Current medication dose requires confirmation. Follow up in four weeks.',
    },
    clarificationPrompt: 'What is the patient’s current diabetes medication and dose?',
    clarificationRationale: 'The medication dose was not stated in the conversation',
    clarificationDemoAnswer: 'Metformin 500 mg twice daily, confirmed from medication list',
    nextSteps: {
      medicationSummary: 'Your clinician will confirm your medication dose in your report.',
      testsOrdered: 'HbA1c blood test.',
      followUpInstructions: 'Return in four weeks to review your results.',
      contactGuidance: 'Contact your clinical team if you have questions.',
    },
  },
  hypertension: {
    patientOpening: 'I get a mild headache some mornings, and my home readings vary.',
    clinicianFinding: 'Your home blood pressure log averages slightly above goal.',
    clinicianPlan: 'Let’s reduce sodium and recheck your log in four weeks.',
    soap: {
      subjective: 'Patient reports occasional morning headaches. Home blood pressure log reviewed.',
      objective: 'Home readings slightly above goal per patient log. No in-office vitals in this demo.',
      assessment: 'Hypertension follow-up; control slightly above goal.',
      plan: 'Dietary sodium reduction. Current antihypertensive dose requires confirmation. Recheck in four weeks.',
    },
    clarificationPrompt: 'What antihypertensive medication and dose is the patient taking?',
    clarificationRationale: 'The medication dose was not stated in the conversation',
    clarificationDemoAnswer: 'Lisinopril 10 mg daily, confirmed with patient',
    nextSteps: {
      medicationSummary: 'Continue your current blood pressure medication unless told otherwise.',
      testsOrdered: 'No new tests ordered.',
      followUpInstructions: 'Keep a home blood pressure log and return in four weeks.',
      contactGuidance: 'Contact your clinical team if headaches worsen.',
    },
  },
  URI_acute: {
    patientOpening: 'I have had a cough and congestion for about five days.',
    clinicianFinding: 'Your lungs sound clear and you do not have a fever today.',
    clinicianPlan: 'This looks viral, so rest, fluids, and return if it gets worse.',
    soap: {
      subjective: 'Cough and nasal congestion for five days. No reported shortness of breath.',
      objective: 'Clinician reports clear lung sounds and no fever during the visit.',
      assessment: 'Likely viral upper respiratory infection.',
      plan: 'Supportive care with rest and fluids. Allergy status requires confirmation before any prescription.',
    },
    clarificationPrompt: 'Does the patient have any known drug allergies?',
    clarificationRationale: 'Allergy status was not established in the conversation',
    clarificationDemoAnswer: 'No known drug allergies, confirmed with patient',
    nextSteps: {
      medicationSummary: 'No new prescriptions.',
      testsOrdered: 'No tests ordered.',
      followUpInstructions: 'Return if symptoms last more than ten days or worsen.',
      contactGuidance: 'Seek urgent care for trouble breathing.',
    },
  },
  wellness: {
    patientOpening: 'I am here for my yearly check-up and feel generally well.',
    clinicianFinding: 'Your screening history is mostly up to date.',
    clinicianPlan: 'We will order routine labs and schedule your next wellness visit.',
    soap: {
      subjective: 'Annual wellness visit. Patient reports feeling generally well.',
      objective: 'No acute findings discussed in this demo conversation.',
      assessment: 'Routine preventive care visit.',
      plan: 'Routine labs ordered. Immunization history requires confirmation. Next wellness visit in one year.',
    },
    clarificationPrompt: 'Is the patient’s immunization record up to date?',
    clarificationRationale: 'Immunization status was not confirmed in the conversation',
    clarificationDemoAnswer: 'Immunizations up to date per registry',
    nextSteps: {
      medicationSummary: 'No medication changes.',
      testsOrdered: 'Routine wellness labs.',
      followUpInstructions: 'Schedule your next wellness visit in one year.',
      contactGuidance: 'Contact your clinical team with any questions.',
    },
  },
  other: {
    patientOpening: 'I wanted to follow up on how I have been feeling since my last visit.',
    clinicianFinding: 'Your symptoms seem stable compared with last time.',
    clinicianPlan: 'We will continue the current plan and follow up as needed.',
    soap: {
      subjective: 'Patient presents for follow-up and reports stable symptoms.',
      objective: 'No measured findings captured in this demo conversation.',
      assessment: 'Follow-up visit; condition stable.',
      plan: 'Continue current plan. Medication list requires confirmation. Follow up as needed.',
    },
    clarificationPrompt: 'Which medications is the patient currently taking?',
    clarificationRationale: 'The current medication list was not stated in the conversation',
    clarificationDemoAnswer: 'No current prescription medications, confirmed with patient',
    nextSteps: {
      medicationSummary: 'Your clinician will confirm your medication list in your report.',
      testsOrdered: 'No tests ordered.',
      followUpInstructions: 'Follow up as needed.',
      contactGuidance: 'Contact your clinical team with any questions.',
    },
  },
};

/**
 * Builds a synthetic transcript and SOAP draft for a newly captured demo session.
 * The patient name, ID, and visit details always come from the session itself.
 */
export function buildSimulatedVisitDraft(
  session: ClinicalSession,
  generatedAtIso: string,
): { readonly transcript: Transcript; readonly report: ClinicalReport } {
  const script = SCRIPTS[session.diagnosisCategory];
  const key = session.id.toLowerCase();
  const clarificationId = `clar-${key}-1`;
  const segIds = [`seg-${key}-1`, `seg-${key}-2`, `seg-${key}-3`] as const;

  const transcript: Transcript = {
    id: `tr-${key}`,
    sessionId: session.id,
    generatedAt: generatedAtIso,
    segments: [
      {
        id: segIds[0],
        sessionId: session.id,
        startSeconds: 12,
        endSeconds: 24,
        timestampLabel: '00:12',
        speaker: 'patient',
        text: script.patientOpening,
        evidenceTitle: 'Reason for visit (simulated)',
        evidenceDetail: `${SIMULATED_TRANSCRIPT_NOTICE}.`,
      },
      {
        id: segIds[1],
        sessionId: session.id,
        startSeconds: 64,
        endSeconds: 80,
        timestampLabel: '01:04',
        speaker: 'clinician',
        text: script.clinicianFinding,
        evidenceTitle: 'Clinician finding (simulated)',
        evidenceDetail: `${SIMULATED_TRANSCRIPT_NOTICE}.`,
      },
      {
        id: segIds[2],
        sessionId: session.id,
        startSeconds: 132,
        endSeconds: 150,
        timestampLabel: '02:12',
        speaker: 'clinician',
        text: script.clinicianPlan,
        requiresClarification: true,
        linkedClarificationId: clarificationId,
        evidenceTitle: script.clarificationRationale,
        evidenceDetail: 'Resolve the missing detail with clinician input before approval.',
      },
    ],
  };

  const report: ClinicalReport = {
    id: `rep-${key}`,
    sessionId: session.id,
    patientId: session.patientId,
    patientName: session.patientName,
    clinicianName: session.assignedClinicianName,
    visitType: session.visitType,
    encounterDate: session.encounterDate,
    templateId: session.templateId,
    currentRevision: 1,
    isSimulatedAiOutput: true,
    soap: script.soap,
    narrativeSummary:
      session.templateId === 'narrative_summary'
        ? `${session.patientName} was seen for ${session.visitType.toLowerCase()}. ${script.soap.assessment} ${script.soap.plan}`
        : undefined,
    provenanceFindings: [
      {
        id: `find-${key}-1`,
        label: 'Reason for visit',
        summary: `${session.primarySymptom} · 00:12`,
        sourceTimestamp: '00:12',
        sourceSegmentId: segIds[0],
        requiresClarification: false,
        soapSection: 'subjective',
      },
      {
        id: `find-${key}-2`,
        label: 'Clinician finding',
        summary: 'Discussed during visit · 01:04',
        sourceTimestamp: '01:04',
        sourceSegmentId: segIds[1],
        requiresClarification: false,
        soapSection: 'objective',
      },
      {
        id: `find-${key}-3`,
        label: 'Needs confirmation',
        summary: `${script.clarificationRationale} · 02:12`,
        sourceTimestamp: '02:12',
        sourceSegmentId: segIds[2],
        requiresClarification: true,
        soapSection: 'plan',
      },
    ],
    patientNextSteps: script.nextSteps,
    clarifications: [
      {
        id: clarificationId,
        sessionId: session.id,
        reportRevision: 1,
        orderIndex: 1,
        prompt: script.clarificationPrompt,
        defaultDemoAnswer: script.clarificationDemoAnswer,
        sourceSegmentId: segIds[2],
        sourceTimestamp: '02:12',
        sourceQuote: script.clinicianPlan,
        clinicalRationale: script.clarificationRationale,
        status: 'unresolved',
      },
    ],
    revisions: [
      {
        revisionNumber: 1,
        createdAt: generatedAtIso,
        origin: 'ai_initial_draft',
        authorId: 'agent-report-drafter',
        authorDisplayName: 'Simulated drafting agent',
        soap: script.soap,
        unresolvedClarificationCount: 1,
        changeSummary: 'Simulated drafting agent created a demo SOAP draft and flagged 1 clarification.',
      },
    ],
  };

  return { transcript, report };
}
