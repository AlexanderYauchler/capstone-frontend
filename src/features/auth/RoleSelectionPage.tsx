import { useNavigate } from 'react-router';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FileHeart,
  Info,
  Mic,
  ShieldCheck,
  Sparkles,
  Stethoscope,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useAuth } from '../../app/providers/AuthProvider';
import { Button } from '../../design-system/components/Button';
import { ParkviewSpecialistCard } from '../../design-system/components/Card';
import { AppShell } from '../../design-system/layouts/AppShell';
import type { UserRole } from '../../domain/models';

interface RoleCardConfig {
  readonly role: UserRole;
  readonly personaName: string;
  readonly personaTitle: string;
  readonly title: string;
  readonly description: string;
  readonly highlights: readonly string[];
  readonly ctaLabel: string;
  readonly destination: string;
  readonly buttonVariant: 'primary' | 'secondary';
  readonly headerVisual: ReactNode;
}

const ROLE_CARDS: readonly RoleCardConfig[] = [
  {
    role: 'clinician',
    personaName: 'Dr. Jordan Lee · Primary Care',
    personaTitle: 'Attending Physician · Primary Care',
    title: 'Clinician',
    description:
      'Review morning clinical sessions, inspect transcript-linked clarification prompts, and manage structured SOAP visit documentation.',
    highlights: [
      '8 synthetic visits on Oct 6, 2026 queue · 2 ready for review',
      '1 visit flagged for clinical clarification before sign-off',
    ],
    ctaLabel: 'Continue as Clinician',
    destination: '/clinician/dashboard',
    buttonVariant: 'primary',
    headerVisual: (
      <div className="w-full h-full bg-[#00783c] p-5 flex flex-col justify-between relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-8 -bottom-12 w-36 h-36 rounded-full bg-[#f26b21]"
        />
        <div className="flex items-center justify-between relative z-10">
          <span className="px-2.5 py-1 rounded-full bg-[#0d4026]/80 text-[#c8f59b] text-[10px] font-bold uppercase tracking-wider">
            Attending Physician
          </span>
          <div className="w-10 h-10 rounded-full bg-white/95 text-[#00783c] flex items-center justify-center shadow-xs">
            <Stethoscope className="w-5 h-5" aria-hidden="true" />
          </div>
        </div>
        <div className="relative z-10 text-white">
          <p className="text-[11px] font-semibold text-white/85">Active Queue · Oct 6</p>
          <p className="text-base font-bold font-display">Dr. Jordan Lee, MD</p>
        </div>
      </div>
    ),
  },
  {
    role: 'patient',
    personaName: 'Alex Morgan · Patient Portal',
    personaTitle: 'Patient Portal Member',
    title: 'Patient',
    description:
      'Read plain-language visit summaries, medication instructions, and care timelines after clinician review and release.',
    highlights: [
      '2 released synthetic visit reports available to read',
      'Unreleased drafts are excluded from the patient view',
    ],
    ctaLabel: 'Continue as Patient',
    destination: '/patient',
    buttonVariant: 'primary',
    headerVisual: (
      <div className="w-full h-full bg-[#feede0] p-5 flex flex-col justify-between relative overflow-hidden border-b border-[#fcd3ba]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-8 -bottom-12 w-36 h-36 rounded-full bg-[#f26b21]/90"
        />
        <div className="flex items-center justify-between relative z-10">
          <span className="px-2.5 py-1 rounded-full bg-[#0d4026] text-white text-[10px] font-bold uppercase tracking-wider">
            Patient Care Portal
          </span>
          <div className="w-10 h-10 rounded-full bg-white text-[#f26b21] border border-[#056233]/30 flex items-center justify-center shadow-xs">
            <FileHeart className="w-5 h-5" aria-hidden="true" />
          </div>
        </div>
        <div className="relative z-10 text-[#0d4026]">
          <p className="text-[11px] font-semibold text-[#495057]">Released Care Summaries</p>
          <p className="text-base font-bold font-display">Alex Morgan</p>
        </div>
      </div>
    ),
  },
  {
    role: 'analyst',
    personaName: 'Sam Rivera · Population Health',
    personaTitle: 'Clinical Quality & Population Analyst',
    title: 'Analyst',
    description:
      'Explore aggregate synthetic clinical cohorts, symptom trends, and monthly documentation throughput with small-cell suppression.',
    highlights: [
      '240 synthetic September cohort encounters',
      'Automatic < 5 small-cell suppression in aggregate views',
    ],
    ctaLabel: 'Explore analyst view',
    destination: '/analyst/analytics?view=cohort',
    buttonVariant: 'secondary',
    headerVisual: (
      <div className="w-full h-full bg-[#edf5f0] p-5 flex flex-col justify-between relative overflow-hidden border-b border-[#cde0d4]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-8 -bottom-12 w-36 h-36 rounded-full bg-[#02754b]/20"
        />
        <div className="flex items-center justify-between relative z-10">
          <span className="px-2.5 py-1 rounded-full bg-[#02754b] text-white text-[10px] font-bold uppercase tracking-wider">
            Aggregate Analytics
          </span>
          <div className="w-10 h-10 rounded-full bg-white text-[#02754b] border border-[#056233]/30 flex items-center justify-center shadow-xs">
            <Activity className="w-5 h-5" aria-hidden="true" />
          </div>
        </div>
        <div className="relative z-10 text-[#0d4026]">
          <p className="text-[11px] font-semibold text-[#495057]">Quality & Cohort Insights</p>
          <p className="text-base font-bold font-display">Sam Rivera, MPH</p>
        </div>
      </div>
    ),
  },
  {
    role: 'admin',
    personaName: 'Taylor Brooks · Governance',
    personaTitle: 'Clinical Workspace Administrator',
    title: 'Administrator',
    description:
      'Preview intended role access scopes, inspect demonstration activity logs, and review workspace capture defaults.',
    highlights: [
      'Simulated role matrix across 4 healthcare personas',
      'Activity log preview for edits, approvals & releases',
    ],
    ctaLabel: 'Explore administrator view',
    destination: '/admin?tab=overview',
    buttonVariant: 'secondary',
    headerVisual: (
      <div className="w-full h-full bg-[#0d4026] p-5 flex flex-col justify-between relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-8 -bottom-12 w-36 h-36 rounded-full bg-[#00783c]"
        />
        <div className="flex items-center justify-between relative z-10">
          <span className="px-2.5 py-1 rounded-full bg-white/15 text-[#c8f59b] text-[10px] font-bold uppercase tracking-wider">
            Workspace Administration
          </span>
          <div className="w-10 h-10 rounded-full bg-white text-[#0d4026] flex items-center justify-center shadow-xs">
            <ShieldCheck className="w-5 h-5" aria-hidden="true" />
          </div>
        </div>
        <div className="relative z-10 text-white">
          <p className="text-[11px] font-semibold text-white/80">Configuration & Activity</p>
          <p className="text-base font-bold font-display">Taylor Brooks</p>
        </div>
      </div>
    ),
  },
] as const;

const QUICK_LINK_PILLS: readonly {
  readonly label: string;
  readonly role: UserRole;
  readonly destination: string;
}[] = [
  {
    label: 'Clinician Command Center',
    role: 'clinician',
    destination: '/clinician/dashboard',
  },
  {
    label: 'Clinical Sessions Directory',
    role: 'clinician',
    destination: '/clinician/sessions',
  },
  {
    label: 'Priority Clarification Review (CS-1042)',
    role: 'clinician',
    destination: '/clinician/sessions/CS-1042',
  },
  {
    label: 'Patient Care Portal',
    role: 'patient',
    destination: '/patient/reports',
  },
  {
    label: 'Population Cohort Analytics',
    role: 'analyst',
    destination: '/analyst/analytics?view=cohort',
  },
  {
    label: 'Monthly Documentation Analytics',
    role: 'clinician',
    destination: '/clinician/analytics?view=monthly',
  },
  {
    label: 'Administration & Activity Log',
    role: 'admin',
    destination: '/admin?tab=audit',
  },
];

export function RoleSelectionPage() {
  const { switchDemoRole } = useAuth();
  const navigate = useNavigate();

  const handleSelectRole = async (role: UserRole, destination: string) => {
    await switchDemoRole(role);
    void navigate(destination);
  };

  return (
    <AppShell variant="login">
      {/* =====================================================================
          SECTION 1: Hero Composition
          White upper canvas transitioning into warm peach (#feede0) lower band,
          inset 24px #00783c emerald container, sunset-orange #f26b21 geometric
          arc, and overlapping 16px elevated system architecture card.
          ===================================================================== */}
      <section
        aria-labelledby="hero-heading"
        className="relative overflow-hidden pt-5 sm:pt-8 pb-10 sm:pb-14"
        style={{
          background:
            'linear-gradient(180deg, #ffffff 0%, #ffffff 70%, #feede0 70%, #feede0 100%)',
        }}
      >
        {/* Decorative Sunset-Orange Geometric Arc on Right */}
        <div
          aria-hidden="true"
          className="hidden lg:block pointer-events-none absolute right-[-110px] top-[14px] w-[590px] h-[590px] rounded-full bg-[#f26b21]"
        />

        <div className="max-w-[1320px] mx-auto px-4 sm:px-8 relative z-10">
          <div className="relative grid grid-cols-1 lg:grid-cols-12 items-center">
            {/* Inset 24px Rounded Emerald Hero Container */}
            <div className="min-w-0 lg:col-span-11 bg-[#00783c] rounded-[24px] px-5 py-8 sm:px-12 sm:py-14 lg:py-16 lg:pr-[430px] text-white shadow-xs relative overflow-hidden">
              {/* Mobile/Tablet Decorative Orange Corner Arc */}
              <div
                aria-hidden="true"
                className="lg:hidden pointer-events-none absolute -right-14 -bottom-16 w-44 h-44 rounded-full bg-[#f26b21]"
              />

              <div className="relative z-10 max-w-xl space-y-4">
                <div className="inline-flex flex-wrap items-center gap-2 px-3 py-1 rounded-full bg-[#0d4026]/75 border border-white/20 text-[11px] font-bold tracking-wider uppercase text-[#c8f59b]">
                  <Sparkles className="w-3.5 h-3.5 text-[#7dc242] shrink-0" aria-hidden="true" />
                  <span>A Human View of Clinical Care</span>
                </div>

                <h1
                  id="hero-heading"
                  className="text-3xl sm:text-5xl lg:text-[48px] font-bold tracking-tight leading-[1.08] text-white font-display"
                >
                  Connected care. Clear documentation.
                </h1>

                <p className="text-[15.5px] sm:text-[18px] text-white/95 leading-relaxed font-normal">
                  Where medical expertise meets real human connection. Capture the visit, resolve
                  uncertainty with transcript provenance, and share a clear clinician-approved
                  report.
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-4">
                  <Button
                    variant="heroDark"
                    size="lg"
                    onClick={() => {
                      void handleSelectRole('clinician', '/clinician/dashboard');
                    }}
                  >
                    Enter Clinician Workspace
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      void handleSelectRole('patient', '/patient');
                    }}
                    className="inline-flex items-center gap-2 text-sm font-bold text-white hover:text-[#d2f7b5] underline underline-offset-4 cursor-pointer px-2 py-2"
                  >
                    <span>Open Patient Care Portal</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>

            {/* Overlapping Right-Hand 16px Rounded Visual Card
                Accurately describes intended architecture & synthetic demo data */}
            <div className="min-w-0 mt-6 lg:mt-0 lg:col-span-5 lg:col-start-8 lg:absolute lg:right-0 lg:top-1/2 lg:-translate-y-1/2 lg:w-[455px] z-20">
              <div className="rounded-[16px] bg-[#f4dfcd] border-2 border-white/85 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.42)] overflow-hidden">
                {/* Warm Editorial Header */}
                <div className="relative bg-gradient-to-br from-[#edd2ba] via-[#e6c3a5] to-[#dca982] p-5 sm:p-6 pb-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0d4026] text-white text-[11px] font-bold tracking-wide">
                      <span className="w-2 h-2 rounded-full bg-[#7dc242]" />
                      INTENDED CLINICAL AI ARCHITECTURE
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0d4026] bg-white/90 px-2.5 py-1 rounded-md">
                      <Info className="w-3 h-3 text-[#00783c]" aria-hidden="true" />
                      Synthetic Demo Mode
                    </span>
                  </div>

                  {/* Architecture & Demo Overview Card */}
                  <div className="bg-white/95 rounded-[12px] p-4 shadow-xs border border-[#056233]/20 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#00783c] text-white flex items-center justify-center font-bold text-xs shrink-0">
                          NPC
                        </div>
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wider text-[#00783c]">
                            Northfield Primary Care (Fictional Clinic)
                          </p>
                          <h2 className="text-[15px] font-bold text-[#0d4026] font-display">
                            Clinician-in-the-Loop Documentation
                          </h2>
                          <p className="text-xs text-[#495057]">
                            Reference Date: Oct 6, 2026 · Simulated Role Switcher
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Accurate Demo & Architecture Metrics */}
                    <div className="grid grid-cols-3 gap-2 pt-0.5">
                      <div className="bg-[#edf5f0] rounded-[8px] p-2.5 border border-[#cde0d4] text-center">
                        <p className="text-lg font-bold text-[#0d4026] font-display tabular-nums leading-none">
                          8
                        </p>
                        <p className="text-[10.5px] font-semibold text-[#495057] mt-1">
                          Oct 6 Demo Visits
                        </p>
                      </div>
                      <div className="bg-[#feede0] rounded-[8px] p-2.5 border border-[#f7be97] text-center">
                        <p className="text-lg font-bold text-[#9a4406] font-display tabular-nums leading-none">
                          4 Roles
                        </p>
                        <p className="text-[10.5px] font-semibold text-[#9a4406] mt-1">
                          Simulated Views
                        </p>
                      </div>
                      <div className="bg-[#edf5f0] rounded-[8px] p-2.5 border border-[#cde0d4] text-center">
                        <p className="text-lg font-bold text-[#00783c] font-display tabular-nums leading-none">
                          &lt; 5
                        </p>
                        <p className="text-[10.5px] font-semibold text-[#495057] mt-1">
                          Small-Cell Rule
                        </p>
                      </div>
                    </div>

                    <div className="bg-[#f7f8f8] rounded-[8px] px-3 py-2 border border-[#d5e0db] text-[11.5px] text-[#242628] leading-snug">
                      <strong className="text-[#0d4026]">Synthetic Demonstration Data:</strong>{' '}
                      Role selection below is a client-side simulation using fictional records.
                      Backend authentication and compliance controls are planned for future
                      integration.
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold text-[#0d4026]">
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#00783c]" aria-hidden="true" />
                        In-Memory Demo Audio Design
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#00783c]" aria-hidden="true" />
                        Service-Layer Architecture
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Bottom Strip */}
                <div className="bg-[#0d4026] text-white px-5 py-3 flex items-center justify-between text-xs">
                  <span className="font-semibold text-white/90">
                    Care first. Documentation follows.
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      void handleSelectRole('clinician', '/clinician/dashboard')
                    }
                    className="inline-flex items-center gap-1 font-bold text-[#a3e668] hover:underline cursor-pointer"
                  >
                    <span>Open Clinician Desk</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 2: Warm Peach (#feede0) "Resources and quick links" Band
          Features left visual workflow card with sunset-orange #f26b21 circle accent
          and right cluster of solid #00783c green action pills with sliding arrows.
          ===================================================================== */}
      <section
        aria-labelledby="quick-links-heading"
        className="bg-[#feede0] py-12 sm:py-16 relative overflow-hidden border-b border-[#fcd3ba]/70"
      >
        {/* Left Decorative Orange Semi-Circle */}
        <div
          aria-hidden="true"
          className="hidden md:block pointer-events-none absolute -left-24 bottom-[-90px] w-[400px] h-[400px] rounded-full bg-[#f26b21]"
        />

        <div className="max-w-[1320px] mx-auto px-4 sm:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Framed Clinical Lifecycle Card */}
            <div className="min-w-0 lg:col-span-5">
              <div className="bg-white rounded-[16px] p-6 sm:p-7 shadow-[0_20px_42px_-16px_rgba(13,64,38,0.26)] border border-[#056233]/20 space-y-4">
                <div className="flex items-center justify-between border-b border-[#e5ece8] pb-3.5">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#00783c]">
                      Three-Stage Clinical Workflow Design
                    </p>
                    <h3 className="text-lg sm:text-xl font-bold text-[#0d4026] font-display mt-0.5">
                      How CoSign Structures Every Visit
                    </h3>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-[#feede0] border border-[#f26b21]/40 flex items-center justify-center text-[#f26b21] shrink-0">
                    <ClipboardCheck className="w-5 h-5" aria-hidden="true" />
                  </div>
                </div>

                <ol className="space-y-3.5 text-sm">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#00783c] text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                      01
                    </span>
                    <div>
                      <p className="font-bold text-[#0d4026]">
                        Consented Capture &amp; Speaker Attribution
                      </p>
                      <p className="text-xs text-[#495057] mt-0.5 leading-relaxed">
                        Designed for consented visit recording and speaker-attributed transcripts
                        without persisting raw audio blobs to browser storage.
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#00783c] text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                      02
                    </span>
                    <div>
                      <p className="font-bold text-[#0d4026]">
                        Inline Clarification &amp; Clinician Sign-Off
                      </p>
                      <p className="text-xs text-[#495057] mt-0.5 leading-relaxed">
                        Unstated dosages or allergies trigger clinician clarification questions
                        linked to transcript timestamps before report approval.
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#00783c] text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                      03
                    </span>
                    <div>
                      <p className="font-bold text-[#0d4026]">
                        Patient Release &amp; Aggregate Analytics Design
                      </p>
                      <p className="text-xs text-[#495057] mt-0.5 leading-relaxed">
                        Separates patient-facing released summaries from aggregate population
                        analytics using a &lt; 5 small-cell suppression threshold.
                      </p>
                    </div>
                  </li>
                </ol>
              </div>
            </div>

            {/* Right "Resources and quick links" Action Pill Cluster */}
            <div className="min-w-0 lg:col-span-7 space-y-4">
              <h2
                id="quick-links-heading"
                className="text-3xl sm:text-[38px] font-bold text-[#0d4026] leading-tight font-display"
              >
                Resources and quick links
              </h2>
              <p className="text-[15.5px] text-[#242628] leading-relaxed max-w-2xl">
                From clinician morning queues and session management to released patient reports
                and synthetic population cohorts, jump straight to the piece of CoSign you need.
              </p>

              <div className="flex flex-wrap gap-2.5 pt-1">
                {QUICK_LINK_PILLS.map((pill) => (
                  <button
                    key={pill.label}
                    type="button"
                    onClick={() => void handleSelectRole(pill.role, pill.destination)}
                    className="inline-flex items-center gap-2.5 bg-[#00783c] hover:bg-[#0d4026] text-white font-bold text-[13.5px] px-4 py-2.5 rounded-[8px] shadow-2xs transition-all duration-150 cursor-pointer group"
                  >
                    <span>{pill.label}</span>
                    <ArrowRight
                      className="w-4 h-4 text-white transition-transform duration-150 group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 3: 4-Column Specialist / Role Cards
          ===================================================================== */}
      <section aria-label="Demo roles" className="py-12 sm:py-16 bg-white">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-8 space-y-10">
          <div className="text-center max-w-3xl mx-auto space-y-2.5">
            <h2 className="text-3xl sm:text-[36px] font-bold text-[#0d4026] font-display leading-tight">
              Explore the clinical workspaces built to help
            </h2>
            <p className="text-[15px] text-[#495057]">
              Choose a demonstration persona below to explore its workspace using synthetic October
              6, 2026 clinical data.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {ROLE_CARDS.map((card) => (
              <ParkviewSpecialistCard
                key={card.role}
                headerVisual={card.headerVisual}
                badgeText={card.personaName}
                title={card.title}
                description={card.description}
                highlights={card.highlights}
                action={
                  <Button
                    variant={card.buttonVariant}
                    fullWidth
                    iconRight={<ArrowRight className="w-4 h-4" aria-hidden="true" />}
                    onClick={() => {
                      void handleSelectRole(card.role, card.destination);
                    }}
                  >
                    {card.ctaLabel}
                  </Button>
                }
              />
            ))}
          </div>

          {/* Bottom Emerald Callout Banner */}
          <div className="rounded-[18px] bg-[#00783c] text-white p-7 sm:p-9 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-12 -bottom-24 w-80 h-80 rounded-full border-[36px] border-white/10"
            />
            <div className="space-y-1.5 max-w-2xl relative z-10">
              <h2 className="text-2xl sm:text-[26px] font-bold font-display text-white">
                Ready to inspect the October 6 clinical queue?
              </h2>
              <p className="text-sm sm:text-[15px] text-white/90 leading-relaxed">
                Simulated demonstration access only. All records are fictional fixtures designed to
                validate clinical workflows prior to backend service integration.
              </p>
            </div>
            <div className="relative z-10 shrink-0">
              <Button
                variant="heroDark"
                size="lg"
                iconLeft={<Mic className="w-4 h-4 text-[#7dc242]" aria-hidden="true" />}
                onClick={() => {
                  void handleSelectRole('clinician', '/clinician/sessions');
                }}
              >
                Explore clinical sessions
              </Button>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
