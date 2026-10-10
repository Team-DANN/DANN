const { z } = require('zod');

// Keep audit payloads small: ids and short messages, never bulk data.
const smallObject = z
  .record(z.any())
  .refine((value) => JSON.stringify(value).length <= 8000, 'Payload is too large');

const createAgentActionSchema = z.object({
  action_id: z.string().regex(/^[A-Za-z0-9_-]{16,128}$/, 'Invalid action id'),
  tool: z.string().regex(/^[a-z][a-z0-9_]{1,59}$/, 'Invalid tool name'),
  arguments: smallObject.default({}),
});

const completeAgentActionSchema = z.object({
  status: z.enum(['executed', 'failed']),
  result: smallObject.optional(),
});

module.exports = { createAgentActionSchema, completeAgentActionSchema };