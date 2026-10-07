const { z } = require('zod');

// Largest value the NUMERIC(12,4) columns can hold without overflowing.
const MAX = 99999999;

// Every field is optional, but at least one must be present.
//
// materials, when sent, is the COMPLETE new ingredient list (the actual
// amount used of each). A quantity_used of 0 removes that ingredient.
// When materials is omitted and only quantity_produced changes, the
// existing ingredients scale in proportion.
const updateBatchSchema = z
  .object({
    quantity_produced: z.number().positive().max(MAX).optional(),
    labor_cost: z.number().nonnegative().max(MAX).optional(),
    manual_material_cost: z.number().nonnegative().max(MAX).nullable().optional(),
    materials: z
      .array(
        z.object({
          material_id: z.string().min(1),
          quantity_used: z.number().nonnegative().max(MAX),
        })
      )
      .max(100)
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (Object.keys(data).length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [], message: 'Nothing to update' });
    }
  });

module.exports = { updateBatchSchema };