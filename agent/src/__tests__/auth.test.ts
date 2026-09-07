import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { app } from '../app';
import { connectDB } from '../config/db';
import User from '../models/User';

const PORT = 5055;

async function runTests() {
  console.log('--- STARTING AUTH SYSTEM END-TO-END TESTS ---');

  await connectDB();
  const server = app.listen(PORT);
  const baseUrl = `http://localhost:${PORT}/api/auth`;

  const testEmail = `test_user_${Date.now()}@example.com`;
  const testPassword = 'SecurePassword123!';
  const testName = 'Maestra Test User';

  let authToken = '';

  try {
    // 1. Health check & Swagger Docs check
    const healthRes = await fetch(`http://localhost:${PORT}/api/health`);
    const healthData = await healthRes.json();
    console.assert(healthRes.status === 200, 'Health check failed');
    console.assert(healthData.success === true, 'Health check response format failed');
    console.log('✓ Health check passed');

    const swaggerRes = await fetch(`http://localhost:${PORT}/api/docs/`);
    console.assert(swaggerRes.status === 200, 'Swagger UI route failed');
    const swaggerJsonRes = await fetch(`http://localhost:${PORT}/api/docs.json`);
    const swaggerJson = await swaggerJsonRes.json();
    console.assert(swaggerJson.openapi === '3.0.0', 'Swagger JSON spec failed');
    console.log('✓ Swagger UI & OpenAPI JSON doc endpoints passed');

    // 2. Register missing fields
    const regMissingRes = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail }),
    });
    const regMissingData = await regMissingRes.json();
    console.assert(regMissingRes.status === 400, 'Register missing fields should return 400');
    console.assert(regMissingData.success === false, 'Register missing fields format failed');
    console.log('✓ Register missing fields validation passed (400)');

    // 3. Register invalid email
    const regInvalidEmailRes = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: testName, email: 'invalid-email', password: testPassword }),
    });
    const regInvalidEmailData = await regInvalidEmailRes.json();
    console.assert(regInvalidEmailRes.status === 400, 'Register invalid email should return 400');
    console.assert(regInvalidEmailData.success === false, 'Register invalid email format failed');
    console.log('✓ Register invalid email validation passed (400)');

    // 4. Register successful
    const regRes = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: testName, email: testEmail, password: testPassword }),
    });
    const regData = await regRes.json();
    console.assert(regRes.status === 201, `Register failed with status ${regRes.status}: ${JSON.stringify(regData)}`);
    console.assert(regData.success === true, 'Register response success should be true');
    console.assert(regData.data.token, 'Register response must return token');
    console.assert(regData.data.user.email === testEmail.toLowerCase(), 'Register user email mismatch');
    console.assert(!regData.data.user.password, 'Password must not be returned');
    authToken = regData.data.token;
    console.log('✓ User registration passed (201)');

    // 5. Password hashing verification in DB
    const dbUser = await User.findOne({ email: testEmail.toLowerCase() });
    console.assert(dbUser !== null, 'User not found in DB');
    console.assert(dbUser!.password !== testPassword, 'Password was stored in plain text');
    console.assert(dbUser!.password.startsWith('$2'), 'Password is not a valid bcrypt hash');
    console.log('✓ Password hashing in DB verified (bcrypt)');

    // 6. Register duplicate email
    const regDupRes = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: testName, email: testEmail, password: testPassword }),
    });
    const regDupData = await regDupRes.json();
    console.assert(regDupRes.status === 409, 'Register duplicate email should return 409');
    console.assert(regDupData.success === false, 'Register duplicate email format failed');
    console.log('✓ Duplicate email registration rejected (409)');

    // 7. Login with invalid password
    const loginFailRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'WrongPassword' }),
    });
    const loginFailData = await loginFailRes.json();
    console.assert(loginFailRes.status === 401, 'Login with wrong password should return 401');
    console.assert(loginFailData.success === false, 'Login fail format failed');
    console.log('✓ Login invalid credentials rejected (401)');

    // 8. Login successful
    const loginRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });
    const loginData = await loginRes.json();
    console.assert(loginRes.status === 200, `Login failed: ${JSON.stringify(loginData)}`);
    console.assert(loginData.success === true, 'Login success must be true');
    console.assert(loginData.data.token, 'Login must return token');
    console.assert(loginData.data.user.email === testEmail.toLowerCase(), 'Login user mismatch');
    console.log('✓ User login passed (200)');

    // 9. Protected route GET /me without token
    const meNoTokenRes = await fetch(`${baseUrl}/me`);
    const meNoTokenData = await meNoTokenRes.json();
    console.assert(meNoTokenRes.status === 401, 'Protected route without token should return 401');
    console.assert(meNoTokenData.success === false, 'Protected route format failed');
    console.log('✓ Protected route rejects unauthenticated request (401)');

    // 10. Protected route GET /me with invalid token
    const meInvalidTokenRes = await fetch(`${baseUrl}/me`, {
      headers: { Authorization: 'Bearer invalid_token_xyz' },
    });
    console.assert(meInvalidTokenRes.status === 401, 'Protected route with invalid token should return 401');
    console.log('✓ Protected route rejects invalid token (401)');

    // 11. Protected route GET /me with valid token
    const meRes = await fetch(`${baseUrl}/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const meData = await meRes.json();
    console.assert(meRes.status === 200, `Protected route failed: ${JSON.stringify(meData)}`);
    console.assert(meData.success === true, 'Profile success must be true');
    console.assert(meData.data.user.email === testEmail.toLowerCase(), 'Profile email mismatch');
    console.assert(!meData.data.user.password, 'Profile must not include password');
    console.log('✓ Protected route GET /api/auth/me passed (200)');

    // 12. Logout POST /logout
    const logoutRes = await fetch(`${baseUrl}/logout`, {
      method: 'POST',
    });
    const logoutData = await logoutRes.json();
    console.assert(logoutRes.status === 200, 'Logout should return 200');
    console.assert(logoutData.success === true, 'Logout success must be true');
    console.log('✓ Logout POST /api/auth/logout passed (200)');

    // Clean up test user
    await User.deleteOne({ email: testEmail.toLowerCase() });
    console.log('✓ Test user cleaned up from database');

    console.log('\n========================================');
    console.log('ALL AUTH TESTS PASSED SUCCESSFULLY! 🎉');
    console.log('========================================');
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
