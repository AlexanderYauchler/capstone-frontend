import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  CornerUpLeft,
  Link2,
  Link2Off,
  MessageSquareWarning,
  Search,
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

  const segments = useMemo(() => transcript?.segments ?? [], [transcript]);

  // Build genuine lookup maps from report findings and clarifications to segment IDs
  const findingsBySegmentId = useMemo(() => {
    const map = new Map<string, string[]>();
    if (!report) return map;
    for (const f of report.provenanceFindings) {
      if (!f.sourceSegmentId) continue;
      const existing = map.get(f.sourceSegmentId) ?? [];
      existing.push(
        `${f.soapSection ? f.soapSection.toUpperCase() : 'REPORT'}: ${f.label}`,
      );
      map.set(f.sourceSegmentId, existing);
    }
    return map;
  }, [report]);

  const clarificationBySegmentId = useMemo(() => {
    const map = new Map<
      string,
      { readonly orderIndex: number; readonly status: 'unresolved' | 'resolved'; readonly prompt: string }
    >();
    if (!report) return map;
    for (const c of report.clarifications) {
      map.set(c.sourceSegmentId, {
        orderIndex: c.orderIndex,
        status: c.status,
        prompt: c.prompt,
      });
    }
    return map;
  }, [report]);

  const filteredSegments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return segments.filter((seg) => {
      if (speakerFilter === 'patient' && seg.speaker !== 'patient') return false;
      if (speakerFilter === 'clinician' && seg.speaker !== 'clinician') return false;
      if (speakerFilter === 'flagged') {
        const linkedClar = clarificationBySegmentId.get(seg.id);
        const isFlagged = seg.requiresClarification || linkedClar !== undefined;
        if (!isFlagged) return false;
      }

      if (!q) return true;
      const speakerName =
        seg.speaker === 'clinician' ? session.assignedClinicianName : session.patientName;
      return (
        seg.text.toLowerCase().includes(q) ||
        seg.timestampLabel.toLowerCase().includes(q) ||
        seg.speaker.toLowerCase().includes(q) ||
        speakerName.toLowerCase().includes(q) ||
        seg.evidenceTitle.toLowerCase().includes(q) ||
        seg.evidenceDetail.toLowerCase().includes(q)
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
    () => segments.find((s) => s.id === activeSegmentId) ?? null,
    [activeSegmentId, segments],
  );

  const activeSegmentLinks = activeSegment
    ? findingsBySegmentId.get(activeSegment.id) ?? []
    : [];
  const activeSegmentClarification = activeSegment
    ? clarificationBySegmentId.get(activeSegment.id)
    : undefined;

  return (
    <Card padding="md" className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e4ece7] pb-3">
        <div>
          <h2 className="text-lg font-bold text-[#0d4026] font-display">
            Speaker-Attributed Transcript &amp; Evidence
          </h2>
          <p className="text-xs text-[#495057]">
            Inspect timestamped conversation segments and verify source-linked report findings.
          </p>
        </div>
        {transcript && (
          <span className="text-xs font-bold text-[#00783c] bg-[#edf5f0] px-2.5 py-1 rounded border border-[#cde0d4]">
            {filteredSegments.length} of {segments.length} segments
          </span>
        )}
      </div>

      {/* Audio Playback Scope Notice */}
      <div className="rounded-[10px] bg-[#f7f8f8] border border-[#d5e0db] px-3 py-2 flex items-center justify-between gap-2 text-[11.5px] text-[#495057]">
        <span className="inline-flex items-center gap-1.5">
          <VolumeX className="w-3.5 h-3.5 text-[#00783c] shrink-0" aria-hidden="true" />
          <span>
            Timestamp navigation and provenance highlighting are active. Audio playback belongs to
            Sequence 4 recording integration.
          </span>
        </span>
      </div>

      {segments.length > 0 ? (
        <>
          {/* Transcript Search & Speaker Filter Controls */}
          <div className="space-y-2.5">
            <div className="relative">
              <Search
                className="w-4 h-4 text-[#495057] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                aria-label="Search within transcript"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search transcript text, timestamp (e.g. 03:18), or speaker…"
                className="w-full rounded-[10px] border border-[#b5c7be] bg-white pl-9 pr-8 py-2 text-xs sm:text-sm text-[#242628] focus:border-[#00783c] focus:outline-none focus:ring-2 focus:ring-[#00783c]/20"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Clear transcript search"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#495057] hover:text-[#0d4026] cursor-pointer"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
            </div>

            <div
              role="group"
              aria-label="Filter transcript segments"
              className="flex flex-wrap items-center gap-1.5"
            >
              {(
                [
                  { id: 'all', label: `All (${segments.length})` },
                  {
                    id: 'flagged',
                    label: `Clarification Links (${
                      segments.filter(
                        (s) => s.requiresClarification || clarificationBySegmentId.has(s.id),
                      ).length
                    })`,
                  },
                  {
                    id: 'patient',
                    label: `Patient (${segments.filter((s) => s.speaker === 'patient').length})`,
                  },
                  {
                    id: 'clinician',
                    label: `Clinician (${segments.filter((s) => s.speaker === 'clinician').length})`,
                  },
                ] as const
              ).map((pill) => {
                const active = speakerFilter === pill.id;
                return (
                  <button
                    key={pill.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSpeakerFilter(pill.id)}
                    className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#00783c] text-white border-[#00783c]'
                        : 'bg-[#f7f8f8] text-[#242628] border-[#d5e0db] hover:bg-[#edf5f0]'
                    }`}
                  >
                    {pill.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Selected Evidence Banner */}
          {activeSegment && (
            <div
              role="status"
              className="rounded-[10px] bg-[#edf5f0] border border-[#00783c] p-3 text-xs space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-[#0d4026] inline-flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-[#00783c]" aria-hidden="true" />
                  <span>
                    Selected Evidence · {activeSegment.timestampLabel} ({activeSegment.evidenceTitle})
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => onSelectSegment(null)}
                  className="text-xs font-bold text-[#00783c] hover:text-[#0d4026] underline cursor-pointer"
                >
                  Clear selection
                </button>
              </div>
              {activeSegmentLinks.length > 0 || activeSegmentClarification ? (
                <p className="text-[#242628]">
                  <strong>Mapped in report:</strong>{' '}
                  {[
                    ...activeSegmentLinks,
                    activeSegmentClarification
                      ? `Clarification Question #${activeSegmentClarification.orderIndex} (${activeSegmentClarification.status})`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              ) : (
                <p className="text-[#9a4406] font-medium">
                  No report statement is directly linked to this transcript segment.
                </p>
              )}
            </div>
          )}

          {/* Transcript Segment List */}
          {filteredSegments.length > 0 ? (
            <ol className="space-y-3" aria-label="Visit transcript segments">
              {filteredSegments.map((seg) => {
                const isSelected = activeSegmentId === seg.id;
                const mappedFindings = findingsBySegmentId.get(seg.id) ?? [];
                const linkedClar = clarificationBySegmentId.get(seg.id);
                const isClarificationUnresolved =
                  linkedClar ? linkedClar.status === 'unresolved' : Boolean(seg.requiresClarification);

                return (
                  <li
                    key={seg.id}
                    id={`transcript-segment-${seg.id}`}
                    className={[
                      'rounded-[12px] p-3.5 border transition-colors space-y-2 text-xs',
                      isSelected
                        ? 'bg-[#edf5f0] border-[#00783c] ring-2 ring-[#00783c]/30'
                        : isClarificationUnresolved
                          ? 'bg-[#feede0]/60 border-[#f26b21]'
                          : 'bg-[#f7f8f8] border-[#d5e0db]',
                    ].join(' ')}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold uppercase tracking-wider text-[#0d4026]">
                        {seg.speaker === 'clinician'
                          ? session.assignedClinicianName
                          : session.patientName}{' '}
                        ({seg.speaker})
                      </span>

                      <div className="flex items-center gap-1.5">
                        {linkedClar && (
                          <StatusBadge
                            tone={linkedClar.status === 'resolved' ? 'success' : 'warning'}
                          >
                            {linkedClar.status === 'resolved'
                              ? `Clarification #${linkedClar.orderIndex} Resolved`
                              : `Clarification #${linkedClar.orderIndex} Open`}
                          </StatusBadge>
                        )}
                        <span className="font-mono font-bold text-[#00783c] bg-white px-2 py-0.5 rounded border border-[#cde0d4]">
                          {seg.timestampLabel}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm text-[#242628] leading-relaxed">&ldquo;{seg.text}&rdquo;</p>

                    <div className="pt-1 flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-[#495057] border-t border-[#d5e0db]/70">
                      <span>
                        <strong>{seg.evidenceTitle}:</strong> {seg.evidenceDetail}
                      </span>
                    </div>

                    {/* Provenance Mapping Bar & Select Evidence Control */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      {mappedFindings.length > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#00783c]">
                          {isClarificationUnresolved ? (
                            <MessageSquareWarning
                              className="w-3.5 h-3.5 text-[#f26b21]"
                              aria-hidden="true"
                            />
                          ) : (
                            <CheckCircle2
                              className="w-3.5 h-3.5 text-[#00783c]"
                              aria-hidden="true"
                            />
                          )}
                          <span>Source for {mappedFindings.join(' · ')}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#495057]">
                          <Link2Off className="w-3 h-3" aria-hidden="true" />
                          <span>No direct report finding mapped</span>
                        </span>
                      )}

                      <button
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => onSelectSegment(isSelected ? null : seg.id)}
                        className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#00783c] text-white border-[#00783c]'
                            : 'bg-white text-[#00783c] border-[#cde0d4] hover:bg-[#edf5f0]'
                        }`}
                      >
                        <CornerUpLeft className="w-3 h-3" aria-hidden="true" />
                        <span>{isSelected ? 'Evidence Selected' : 'Select Evidence'}</span>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="rounded-[10px] bg-[#f7f8f8] border border-[#d5e0db] p-5 text-center space-y-2">
              <p className="text-sm font-bold text-[#0d4026]">
                No transcript segments match your search or filter
              </p>
              <p className="text-xs text-[#495057]">
                Try clearing the search query or switching the speaker filter back to All.
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setSpeakerFilter('all');
                }}
              >
                Reset transcript filters
              </Button>
            </div>
          )}
        </>
      ) : (
        <p className="text-xs text-[#495057] leading-relaxed">
          {session.processing.status === 'running' ||
          session.processing.status === 'failed_retryable'
            ? 'Transcript segments will appear once the speech transcription stage completes.'
            : 'Summary report finalized; detailed transcript segments are archived for this synthetic fixture.'}
        </p>
      )}
    </Card>
  );
}
