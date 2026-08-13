import { z } from 'zod';

import { SourceRefSchema } from './evidence';

const TableColumnSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  kind: z.enum(['reference', 'scenario']),
});

const NumericTableRowSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  unit: z.string().min(1),
  values: z.record(z.string(), z.number().finite().nullable()),
});

export const PublishedNumericTableSchema = z
  .object({
    schemaVersion: z.string().min(1),
    id: z.string().min(1),
    title: z.string().min(1),
    contentOrigin: z.literal('transcribed'),
    evidenceKind: z.literal('reported'),
    source: SourceRefSchema,
    sourceLicense: z.string().min(1),
    transcriptionMethod: z.string().min(1),
    nullSemantics: z.string().min(1),
    assumptions: z.array(z.string().min(1)).min(1),
    columns: z.array(TableColumnSchema).min(1),
    rows: z.array(NumericTableRowSchema).min(1),
    notes: z.array(z.string().min(1)).default([]),
  })
  .superRefine((table, context) => {
    const columnIds = table.columns.map(({ id }) => id);
    if (new Set(columnIds).size !== columnIds.length) {
      context.addIssue({ code: 'custom', message: 'Published table column IDs must be unique.' });
    }
    const expected = [...columnIds].sort();
    for (const [rowIndex, row] of table.rows.entries()) {
      const actual = Object.keys(row.values).sort();
      if (
        actual.length !== expected.length ||
        actual.some((key, index) => key !== expected[index])
      ) {
        context.addIssue({
          code: 'custom',
          message: `Row ${row.id} must provide exactly one value or null for every column.`,
          path: ['rows', rowIndex, 'values'],
        });
      }
    }
  });

export type PublishedNumericTable = z.infer<typeof PublishedNumericTableSchema>;
