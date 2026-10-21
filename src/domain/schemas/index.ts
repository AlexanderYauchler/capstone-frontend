import { z } from 'zod';

export const ClarificationAnswersSubmissionSchema = z.object({
  expectedRevision: z.number().int().min(1),
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1),
        responseText: z.string().trim().min(3, 'Clarification response cannot be empty.'),
      }),
    )
    .min(1),
});

export const EditReportSubmissionSchema = z.object({
  expectedRevision: z.number().int().min(1),
  plan: z.string().trim().min(5, 'Plan / follow-up section cannot be empty.'),
  additionalNotes: z.string().trim().optional(),
});

export const RejectDraftSubmissionSchema = z.object({
  expectedRevision: z.number().int().min(1),
  rejectionReason: z
    .string()
    .trim()
    .min(5, 'Please provide feedback so the drafting agent can revise the report.'),
});

export const SessionFilterQuerySchema = z.object({
  q: z.string().default(''),
  status: z
    .enum([
      'all',
      'processing',
      'needs_review',
      'clarification_needed',
      'processing_interrupted',
      'released',
    ])
    .default('all'),
  date: z.string().default('2026-10-06'),
});
