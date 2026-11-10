import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  CornerUpLeft,
  Link2,
  Link2Off,
  MessageSquareWarning,
  Search,
  SlidersHorizontal,
  Stethoscope,
  UserRound,
  VolumeX,
  X,
} from 'lucide-react';
import type {
  ClinicalReport,
  ClinicalSession,
  Transcript,
  TranscriptSegment,
} from '../../domain/models';
import { Button } from '../../design-system/components/Button';
import { Card } from '../../design-system/components/Card';
import { StatusBadge } from '../../design-system/components/StatusBadge';

export interface TranscriptEvidencePanelProps {
  readonly session: ClinicalSession;
  readonly transcript?: Transcript;
  readonly report?: ClinicalReport;
  readonly activeSegmentId: string | null;
  readonly onSelectSegment: (segmentId: string | null) => void;
}

type SpeakerFilter = 'all' | 'flagged' | 'patient' | 'clinician';

export function TranscriptEvidencePanel({
  session,
  transcript,
  report,
  activeSegmentId,
  onSelectSegment,
}: TranscriptEvidencePanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [speakerFilter, setSpeakerFilter] = useState<SpeakerFilter>('all');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const segments = useMemo(() => transcript?.segments ?? [], [transcript]);

  const findingsBySegmentId = useMemo(() => {
    const map = new Map<string, string[]>();
    if (!report) return map;
    for (const finding of report.provenanceFindings) {
      if (!finding.sourceSegmentId) continue;
      const existing = map.get(finding.sourceSegmentId) ?? [];
      existing.push(
        `${finding.soapSection ? finding.soapSection.toUpperCase() : 'REPORT'}: ${finding.label}`,
      );
      map.set(finding.sourceSegmentId, existing);
    }
    return map;
  }, [report]);

  const clarificationBySegmentId = useMemo(() => {
    const map = new Map<
      string,
      {
        readonly orderIndex: number;
        readonly status: 'unresolved' | 'resolved';
        readonly prompt: string;
      }
    >();
    if (!report) return map;
    for (const clarification of report.clarifications) {
      map.set(clarification.sourceSegmentId, {
        orderIndex: clarification.orderIndex,
        status: clarification.status,
        prompt: clarification.prompt,
      });
    }
    return map;
  }, [report]);

  const filteredSegments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return segments.filter((segment) => {
      if (speakerFilter === 'patient' && segment.speaker !== 'patient')
        return false;
      if (speakerFilter === 'clinician' && segment.speaker !== 'clinician')
        return false;
      if (speakerFilter === 'flagged') {
        const linkedClarification = clarificationBySegmentId.get(segment.id);
        if (!segment.requiresClarification && !linkedClarification)
          return false;
      }

      if (!query) return true;
      const speakerName =
        segment.speaker === 'clinician'
          ? session.assignedClinicianName
          : session.patientName;
      return (
        segment.text.toLowerCase().includes(query) ||
        segment.timestampLabel.toLowerCase().includes(query) ||
        segment.speaker.toLowerCase().includes(query) ||
        speakerName.toLowerCase().includes(query) ||
        segment.evidenceTitle.toLowerCase().includes(query) ||
        segment.evidenceDetail.toLowerCase().includes(query)
      );
    });
  }, [
    clarificationBySegmentId,
    searchQuery,
    segments,
    session.assignedClinicianName,
    session.patientName,
    speakerFilter,
  ]);

  const activeSegment: TranscriptSegment | null = useMemo(
    () => segments.find((segment) => segment.id === activeSegmentId) ?? null,
    [activeSegmentId, segments],
  );
  const activeSegmentLinks = activeSegment
    ? (findingsBySegmentId.get(activeSegment.id) ?? [])
    : [];
  const activeSegmentClarification = activeSegment
    ? clarificationBySegmentId.get(activeSegment.id)
    : undefined;

  const patientCount = segments.filter(
    (segment) => segment.speaker === 'patient',
  ).length;
  const clinicianCount = segments.filter(
    (segment) => segment.speaker === 'clinician',
  ).length;
  const clarificationCount = segments.filter(
    (segment) =>
      segment.requiresClarification || clarificationBySegmentId.has(segment.id),
  ).length;
  const linkedEvidenceCount = segments.filter((segment) =>
    findingsBySegmentId.has(segment.id),
  ).length;
  const hasActiveFilters =
    searchQuery.trim().length > 0 || speakerFilter !== 'all';

  useEffect(() => {
    if (!activeSegmentId || typeof document === 'undefined') return;
    const frame = window.requestAnimationFrame(() => {
      const selectedSegment = document.getElementById(
        `transcript-segment-${activeSegmentId}`,
      );
      if (
        selectedSegment &&
        typeof selectedSegment.scrollIntoView === 'function'
      ) {
        selectedSegment.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeSegmentId]);

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable;
      if (event.key === '/' && !isTyping) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', focusSearch);
    return () => window.removeEventListener('keydown', focusSearch);
  }, []);

  const resetFilters = () => {
    setSearchQuery('');
    setSpeakerFilter('all');
    searchInputRef.current?.focus();
  };

  return (
    <Card padding="none" tone="elevated" className="overflow-hidden">
      <header className="border-b border-[#dce6e1] bg-white px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-[#0d4026] font-display">
              Transcript evidence
              <span className="sr-only">
                {' '}
                — Speaker-Attributed Transcript &amp; Evidence
              </span>
            </h2>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-[#495057]">
              Review the conversation by speaker and verify which segments
              support the SOAP note.
            </p>
          </div>
          {transcript && (
            <div className="flex shrink-0 items-center gap-2 text-[11px] font-semibold text-[#495057]">
              <span className="rounded-full border border-[#cde0d4] bg-[#edf5f0] px-2.5 py-1 text-[#0d4026]">
                {filteredSegments.length} of {segments.length} segments
              </span>
              <span className="rounded-full border border-[#d5e0db] bg-white px-2.5 py-1">
                {linkedEvidenceCount} linked
              </span>
            </div>
          )}
        </div>
      </header>

      <div className="space-y-4 px-4 py-5 sm:px-6">
        <div className="flex items-start gap-2 rounded-[10px] border border-[#d5e0db] bg-[#f7f8f8] px-3 py-2.5 text-[11.5px] leading-relaxed text-[#495057]">
          <VolumeX
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#00783c]"
            aria-hidden="true"
          />
          <span>
            Select a timestamp or evidence control to inspect report mappings.
            Audio playback is not available in this demo.
          </span>
        </div>

        {segments.length > 0 ? (
          <>
            <div className="space-y-3 rounded-[12px] border border-[#dce6e1] bg-[#fcfdfc] p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="transcript-search"
                  className="text-xs font-bold text-[#0d4026]"
                >
                  Search transcript
                </label>
                <span className="hidden text-[10.5px] text-[#6a746f] sm:inline">
                  Keyboard shortcut: /
                </span>
              </div>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#495057]"
                  aria-hidden="true"
                />
                <input
                  ref={searchInputRef}
                  id="transcript-search"
                  type="search"
                  aria-label="Search within transcript"
                  aria-keyshortcuts="/"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape' && searchQuery) {
                      event.preventDefault();
                      setSearchQuery('');
                    }
                  }}
                  placeholder="Search words, speaker, timestamp, or evidence…"
                  className="h-11 w-full rounded-[10px] border border-[#b5c7be] bg-white pl-9 pr-10 text-sm text-[#242628] focus:border-[#00783c] focus:outline-none focus:ring-2 focus:ring-[#00783c]/20"
                />
                {searchQuery && (
                  <button
                    type="button"
                    aria-label="Clear transcript search"
                    onClick={() => {
                      setSearchQuery('');
                      searchInputRef.current?.focus();
                    }}
                    className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-[#495057] hover:bg-[#edf5f0] hover:text-[#0d4026]"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <SlidersHorizontal
                  className="h-3.5 w-3.5 shrink-0 text-[#00783c]"
                  aria-hidden="true"
                />
                <div
                  role="group"
                  aria-label="Filter transcript segments"
                  className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-1"
                >
                  {(
                    [
                      { id: 'all', label: `All (${segments.length})` },
                      { id: 'patient', label: `Patient (${patientCount})` },
                      {
                        id: 'clinician',
                        label: `Clinician (${clinicianCount})`,
                      },
                      {
                        id: 'flagged',
                        label: `Clarifications (${clarificationCount})`,
                      },
                    ] as const
                  ).map((filter) => {
                    const active = speakerFilter === filter.id;
                    return (
                      <button
                        key={filter.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setSpeakerFilter(filter.id)}
                        className={`min-h-8 shrink-0 rounded-full border px-3 py-1 text-xs font-bold transition-colors ${
                          active
                            ? 'border-[#00783c] bg-[#00783c] text-white'
                            : 'border-[#d5e0db] bg-white text-[#242628] hover:border-[#9ad0b3] hover:bg-[#edf5f0]'
                        }`}
                      >
                        {filter.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {hasActiveFilters && (
                <div className="flex items-center justify-between gap-2 border-t border-[#e4ece7] pt-2 text-[11px] text-[#495057]">
                  <span>
                    Showing {filteredSegments.length} matching segment
                    {filteredSegments.length === 1 ? '' : 's'}
                  </span>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="font-bold text-[#00783c] underline underline-offset-2 hover:text-[#0d4026]"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>

            {activeSegment && (
              <div
                role="status"
                className="rounded-[12px] border border-[#00783c] bg-[#edf5f0] p-3.5 text-xs shadow-[0_8px_20px_-16px_rgba(13,64,38,0.5)]"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <span className="inline-flex items-center gap-1.5 font-bold text-[#0d4026]">
                      <Link2
                        className="h-3.5 w-3.5 shrink-0 text-[#00783c]"
                        aria-hidden="true"
                      />
                      <span>
                        Selected Evidence · {activeSegment.timestampLabel} (
                        {activeSegment.evidenceTitle})
                      </span>
                    </span>
                    {activeSegmentLinks.length > 0 ||
                    activeSegmentClarification ? (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-[#495057]">
                          Mapped to:
                        </span>
                        {activeSegmentLinks.map((link) => (
                          <span
                            key={link}
                            className="rounded-full border border-[#9ad0b3] bg-white px-2 py-0.5 font-bold text-[#00783c]"
                          >
                            {link}
                          </span>
                        ))}
                        {activeSegmentClarification && (
                          <span
                            className={`rounded-full border px-2 py-0.5 font-bold ${activeSegmentClarification.status === 'unresolved' ? 'border-[#f7be97] bg-[#feede0] text-[#9a4406]' : 'border-[#9ad0b3] bg-white text-[#00783c]'}`}
                          >
                            Clarification #
                            {activeSegmentClarification.orderIndex} ·{' '}
                            {activeSegmentClarification.status}
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="mt-1.5 font-medium text-[#9a4406]">
                        No report statement is directly linked to this
                        transcript segment.
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectSegment(null)}
                    className="shrink-0 self-start rounded px-1 py-1 font-bold text-[#00783c] underline underline-offset-2 hover:text-[#0d4026]"
                  >
                    Clear selection
                  </button>
                </div>
              </div>
            )}

            {filteredSegments.length > 0 ? (
              <ol className="space-y-3" aria-label="Visit transcript segments">
                {filteredSegments.map((segment) => {
                  const isSelected = activeSegmentId === segment.id;
                  const mappedFindings =
                    findingsBySegmentId.get(segment.id) ?? [];
                  const linkedClarification = clarificationBySegmentId.get(
                    segment.id,
                  );
                  const isClarificationUnresolved = linkedClarification
                    ? linkedClarification.status === 'unresolved'
                    : Boolean(segment.requiresClarification);
                  const isPatient = segment.speaker === 'patient';
                  const speakerName = isPatient
                    ? session.patientName
                    : session.assignedClinicianName;

                  return (
                    <li
                      key={segment.id}
                      id={`transcript-segment-${segment.id}`}
                      className={`scroll-mt-24 overflow-hidden rounded-[14px] border border-l-4 text-xs transition-all ${
                        isSelected
                          ? 'border-[#00783c] bg-[#edf5f0]/70 ring-2 ring-[#00783c]/25'
                          : isClarificationUnresolved
                            ? 'border-[#f26b21] bg-[#fffaf6]'
                            : isPatient
                              ? 'border-[#7dc242] bg-white'
                              : 'border-[#00783c] bg-white'
                      }`}
                    >
                      <div
                        className={`flex flex-col gap-2 border-b px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between ${isClarificationUnresolved ? 'border-[#f26b21]/25 bg-[#feede0]/65' : isPatient ? 'border-[#dce6e1] bg-[#f7fbf3]' : 'border-[#dce6e1] bg-[#edf5f0]/60'}`}
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isPatient ? 'bg-[#eaf4df] text-[#4d7d24]' : 'bg-[#00783c] text-white'}`}
                          >
                            {isPatient ? (
                              <UserRound
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                            ) : (
                              <Stethoscope
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                            )}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold uppercase tracking-[0.08em] text-[#0d4026]">
                              {speakerName}
                            </p>
                            <p className="text-[10.5px] font-semibold text-[#6a746f]">
                              {isPatient ? 'Patient' : 'Clinician'}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 pl-10 sm:pl-0">
                          {isClarificationUnresolved && (
                            <StatusBadge tone="warning" showIcon={false}>
                              Clarification needed
                            </StatusBadge>
                          )}
                          {linkedClarification?.status === 'resolved' && (
                            <StatusBadge tone="success" showIcon={false}>
                              Clarification resolved
                            </StatusBadge>
                          )}
                          <button
                            type="button"
                            aria-pressed={isSelected}
                            aria-label={`${isSelected ? 'Clear' : 'Select'} evidence at ${segment.timestampLabel}`}
                            onClick={() =>
                              onSelectSegment(isSelected ? null : segment.id)
                            }
                            className={`min-h-8 rounded-md border px-2.5 py-1 font-mono text-xs font-bold transition-colors ${isSelected ? 'border-[#00783c] bg-[#00783c] text-white' : 'border-[#b8dcc7] bg-white text-[#00783c] hover:bg-[#edf5f0]'}`}
                          >
                            {segment.timestampLabel}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3 p-3.5 sm:p-4">
                        <blockquote className="text-[15px] leading-7 text-[#242628]">
                          &ldquo;{segment.text}&rdquo;
                        </blockquote>

                        {linkedClarification && (
                          <div
                            className={`flex items-start gap-2 rounded-[9px] border px-3 py-2.5 ${linkedClarification.status === 'unresolved' ? 'border-[#f7be97] bg-[#feede0] text-[#7a3404]' : 'border-[#9ad0b3] bg-[#edf5f0] text-[#0d4026]'}`}
                          >
                            {linkedClarification.status === 'unresolved' ? (
                              <MessageSquareWarning
                                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#f26b21]"
                                aria-hidden="true"
                              />
                            ) : (
                              <CheckCircle2
                                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#00783c]"
                                aria-hidden="true"
                              />
                            )}
                            <span className="leading-relaxed">
                              <strong>
                                Clarification #{linkedClarification.orderIndex}
                              </strong>{' '}
                              {linkedClarification.status === 'unresolved'
                                ? 'is open and requires clinician review.'
                                : 'was resolved and remains linked to this source.'}
                            </span>
                          </div>
                        )}

                        <div className="rounded-[10px] border border-[#dce6e1] bg-[#f7f8f8] p-3">
                          <div className="flex items-start gap-2">
                            <Link2
                              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#00783c]"
                              aria-hidden="true"
                            />
                            <div className="min-w-0">
                              <p className="font-bold text-[#0d4026]">
                                {segment.evidenceTitle}
                              </p>
                              <p className="mt-0.5 text-[11.5px] leading-relaxed text-[#495057]">
                                {segment.evidenceDetail}
                              </p>
                            </div>
                          </div>

                          <div className="mt-2.5 flex flex-col gap-2 border-t border-[#d5e0db] pt-2.5 sm:flex-row sm:items-center sm:justify-between">
                            {mappedFindings.length > 0 ? (
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[11px] font-semibold text-[#495057]">
                                  Supports
                                </span>
                                {mappedFindings.map((finding) => (
                                  <span
                                    key={finding}
                                    className="rounded-full border border-[#9ad0b3] bg-white px-2 py-0.5 text-[11px] font-bold text-[#00783c]"
                                  >
                                    {finding}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] text-[#495057]">
                                <Link2Off
                                  className="h-3 w-3"
                                  aria-hidden="true"
                                />
                                No direct report finding mapped
                              </span>
                            )}

                            <button
                              type="button"
                              aria-pressed={isSelected}
                              onClick={() =>
                                onSelectSegment(isSelected ? null : segment.id)
                              }
                              className={`inline-flex min-h-8 shrink-0 items-center justify-center gap-1 rounded-full border px-3 py-1 text-xs font-bold transition-colors ${isSelected ? 'border-[#00783c] bg-[#00783c] text-white' : 'border-[#cde0d4] bg-white text-[#00783c] hover:border-[#00783c] hover:bg-[#edf5f0]'}`}
                            >
                              <CornerUpLeft
                                className="h-3 w-3"
                                aria-hidden="true"
                              />
                              <span>
                                {isSelected
                                  ? 'Evidence Selected'
                                  : 'Select Evidence'}
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <div className="space-y-2 rounded-[12px] border border-[#d5e0db] bg-[#f7f8f8] p-6 text-center">
                <p className="text-sm font-bold text-[#0d4026]">
                  No transcript segments match
                </p>
                <p className="text-xs text-[#495057]">
                  Clear the search or select a different speaker filter.
                </p>
                <Button variant="secondary" size="sm" onClick={resetFilters}>
                  Reset transcript filters
                </Button>
              </div>
            )}
          </>
        ) : (
          <p className="text-xs leading-relaxed text-[#495057]">
            {session.processing.status === 'running' ||
            session.processing.status === 'failed_retryable'
              ? 'Transcript segments will appear once the speech transcription stage completes.'
              : 'Summary report finalized; detailed transcript segments are archived for this synthetic fixture.'}
          </p>
        )}
      </div>
    </Card>
  );
}
