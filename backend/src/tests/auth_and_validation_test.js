const assert = require('assert');
const { seedDatabase } = require('../db/seed');
const { getDb } = require('../db/database');
const AuthService = require('../services/authService');
const UserModel = require('../models/UserModel');
const {
  registerSchema,
  loginSchema,
  createMaterialSchema,
  createBatchSchema,
} = require('../schemas/validationSchemas');

console.log('[TEST] Starting Auth & Zod Validation Verification...');

// 1. Reset database to clean state
seedDatabase();
const db = getDb();
db.exec(`DELETE FROM user WHERE email LIKE 'maya.%@example.com';`);

async function runTests() {
  const testEmail = `maya.${Date.now()}@example.com`;

  // 2. Test User Registration
  console.log('\n--- 1. Testing User Registration & JWT Issuance ---');
  const registerResult = await AuthService.register({
    name: 'Maya Sharma',
    email: testEmail,
    password: 'password123',
    business_name: 'Maya Artisan Bakery',
    type: 'bakery',
  });

  assert.ok(registerResult.token, 'Registration must return a JWT token');
  assert.strictEqual(registerResult.user.name, 'Maya Sharma', 'User name should match');
  assert.strictEqual(registerResult.user.email, testEmail, 'User email should match');
  assert.strictEqual(registerResult.user.role, 'owner', 'Default registered role should be owner');

  // Verify token verification
  const decoded = AuthService.verifyToken(registerResult.token);
  assert.strictEqual(decoded.email, testEmail, 'Decoded token email must match');
  assert.strictEqual(decoded.user_id, registerResult.user.user_id, 'Decoded user_id must match');

  // 3. Test Duplicate Email Prevention
  console.log('\n--- 2. Testing Duplicate Email Guard ---');
  let duplicateCaught = false;
  try {
    await AuthService.register({
      name: 'Maya Clone',
      email: testEmail,
      password: 'password123',
    });
  } catch (err) {
    duplicateCaught = true;
    console.log(`[TEST EXPECTED ERROR PASS] Caught duplicate email error: ${err.message}`);
  }
  assert.strictEqual(duplicateCaught, true, 'Should reject duplicate email registration');

  // 4. Test User Login
  console.log('\n--- 3. Testing User Login ---');
  const loginResult = await AuthService.login({
    email: testEmail,
    password: 'password123',
  });

  assert.ok(loginResult.token, 'Login must return a JWT token');
  assert.strictEqual(loginResult.user.email, testEmail, 'Login user email should match');

  // Test Invalid Password
  let invalidPasswordCaught = false;
  try {
    await AuthService.login({
      email: testEmail,
      password: 'wrong_password_999',
    });
  } catch (err) {
    invalidPasswordCaught = true;
    console.log(`[TEST EXPECTED ERROR PASS] Caught invalid password error: ${err.message}`);
  }
  assert.strictEqual(invalidPasswordCaught, true, 'Should reject incorrect password');

  // 5. Test Zod Validation Schemas
  console.log('\n--- 4. Testing Zod Validation Schemas ---');
  
  // Valid register payload
  const validReg = registerSchema.parse({
    name: 'John Doe',
    email: 'john@example.com',
    password: 'securepassword',
  });
  assert.strictEqual(validReg.name, 'John Doe');

  // Invalid email schema rejection
  let invalidEmailCaught = false;
  try {
    registerSchema.parse({
      name: 'John Doe',
      email: 'not-an-email',
      password: '123', // also too short
    });
  } catch (err) {
    invalidEmailCaught = true;
    const issues = err.issues || err.errors || [];
    console.log(`[TEST EXPECTED ERROR PASS] Caught Zod schema validation error: ${issues.length} issue(s) found`);
  }
  assert.strictEqual(invalidEmailCaught, true, 'Zod must catch invalid email and short password');

  // Invalid negative quantity on batch creation
  let invalidBatchCaught = false;
  try {
    createBatchSchema.parse({
      product_id: 'bread-loaf',
      quantity_produced: -5, // negative not allowed
    });
  } catch (err) {
    invalidBatchCaught = true;
    const issues = err.issues || err.errors || [];
    console.log(`[TEST EXPECTED ERROR PASS] Caught negative batch quantity error: ${issues[0] ? issues[0].message : err.message}`);
  }
  assert.strictEqual(invalidBatchCaught, true, 'Zod must catch negative quantity_produced');

  console.log('\nALL AUTH AND ZOD VALIDATION TESTS PASSED 100% PERFECTLY!');
}

runTests().catch(err => {
  console.error('[TEST FAILURE]', err);
  process.exit(1);
});
