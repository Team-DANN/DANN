const { z } = require('zod');
const { MODULES } = require('../middleware/access');

const moduleEnum = z.enum(MODULES);

const createStaffSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(80),
    username: z
      .string()
      .regex(/^[A-Za-z0-9._-]{3,30}$/, 'Username must be 3-30 characters: letters, numbers, dot, dash or underscore'),
    phone: z.string().max(20).nullable().optional(),
    role: z.enum(['staff', 'manager']).optional(),
    modules: z.array(moduleEnum).min(1, 'Choose at least one module').optional(),
  })
  .superRefine((data, ctx) => {
    if ((data.role ?? 'staff') === 'staff' && !data.modules) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['modules'], message: 'Choose at least one module' });
    }
  });

const updateStaffSchema = z
  .object({
    name: z.string().min(2).max(80).optional(),
    phone: z.string().max(20).nullable().optional(),
    role: z.enum(['staff', 'manager']).optional(),
    modules: z.array(moduleEnum).min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (Object.keys(data).length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [], message: 'Nothing to update' });
    }
  });

const staffLoginSchema = z.object({
  business_code: z.string().min(4, 'Business code is required').max(12),
  username: z.string().min(1, 'Username is required'),
  pin: z.string().regex(/^\d{6}$/, 'PIN must be exactly 6 digits'),
});

const changePinSchema = z.object({
  current_pin: z.string().regex(/^\d{6}$/, 'Current PIN must be 6 digits'),
  new_pin: z.string().regex(/^\d{6}$/, 'New PIN must be exactly 6 digits'),
});

module.exports = {
  createStaffSchema,
  updateStaffSchema,
  staffLoginSchema,
  changePinSchema,
};