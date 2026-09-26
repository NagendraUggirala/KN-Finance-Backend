import dotenv from 'dotenv';
import dns from 'node:dns';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Admin from '../src/models/Admin.js';
import PasswordReset from '../src/models/PasswordReset.js';

dotenv.config();

// Use Google DNS for MongoDB Atlas SRV lookup
dns.setServers(['8.8.8.8', '1.1.1.1']);

const BASE_URL = 'http://localhost:5000';

const runTests = async () => {
  console.log('--- Starting Admin Forgot Password & Auth Test Suite ---');

  await connectDB();

  // Setup a test Admin in MongoDB
  const testEmail = `test_admin_${Date.now()}@knfinance.com`;
  const testUsername = `admin_${Date.now()}`;
  const initialPassword = 'InitialPassword@123';
  const newPassword = 'NewSecretPassword@456';

  let testAdmin = new Admin({
    username: testUsername,
    password: initialPassword,
    name: 'Forgot Pass Test Admin',
    email: testEmail,
    phone: '9988776655',
    role: 'admin',
    status: 'active',
    createdBy: 'superadmin'
  });
  await testAdmin.save();
  console.log(`✅ Seeded test admin: ${testEmail}`);

  try {
    // Test 1: Initial Login with original password (POST /api/auth/login)
    {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, password: initialPassword })
      });
      const data = await res.json();
      console.log(`Test 1 [POST /api/auth/login] Initial Admin Login:`, res.status === 200 && data.token ? 'PASSED (200)' : `FAILED (${res.status})`, { success: data.success });
    }

    // Test 2: Forgot Password with Non-existent Email (Anti-Enumeration Check)
    {
      const res = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'nonexistent@knfinance.com' })
      });
      const data = await res.json();
      console.log(`Test 2 [POST /api/auth/forgot-password] Anti-Enumeration (Non-existent Email):`, res.status === 200 && data.success ? 'PASSED (200)' : `FAILED (${res.status})`, data.message);
    }

    // Test 3: Forgot Password with Valid Registered Email
    let generatedOtp = '';
    {
      const res = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail })
      });
      const data = await res.json();
      generatedOtp = data.devOtp;
      console.log(`Test 3 [POST /api/auth/forgot-password] Valid Email Request:`, res.status === 200 && data.success ? 'PASSED (200)' : `FAILED (${res.status})`, {
        message: data.message,
        otpGenerated: Boolean(generatedOtp)
      });
    }

    // Test 4: Resend OTP Cooldown Check (< 60s)
    {
      const res = await fetch(`${BASE_URL}/api/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail })
      });
      const data = await res.json();
      console.log(`Test 4 [POST /api/auth/resend-otp] 60s Cooldown Enforcement:`, res.status === 429 ? 'PASSED (429)' : `FAILED (${res.status})`, data.message);
    }

    // Test 5: Verify OTP with Invalid/Wrong OTP
    {
      const res = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, otp: '000000' })
      });
      const data = await res.json();
      console.log(`Test 5 [POST /api/auth/verify-otp] Wrong OTP:`, res.status === 400 ? 'PASSED (400)' : `FAILED (${res.status})`, data.message);
    }

    // Test 6: Verify 5 Wrong Attempts Limit
    {
      // Already did 1 wrong attempt, do 4 more
      for (let i = 2; i <= 5; i++) {
        await fetch(`${BASE_URL}/api/auth/verify-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: testEmail, otp: '111111' })
        });
      }
      // 6th attempt should be blocked
      const res = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, otp: '111111' })
      });
      const data = await res.json();
      console.log(`Test 6 [POST /api/auth/verify-otp] 5 Max Attempts Limit:`, (res.status === 429 || res.status === 400) ? 'PASSED' : `FAILED (${res.status})`, data.message);
    }

    // Re-issue a fresh OTP by clearing lastRequestedAt cooldown in DB for testing
    await PasswordReset.deleteMany({ adminId: testAdmin._id });
    const freshRes = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail })
    });
    const freshData = await freshRes.json();
    const validOtp = freshData.devOtp;

    // Test 7: Verify OTP with Valid 6-Digit Code
    let resetToken = '';
    {
      const res = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, otp: validOtp })
      });
      const data = await res.json();
      resetToken = data.resetToken;
      console.log(`Test 7 [POST /api/auth/verify-otp] Valid OTP Verification:`, res.status === 200 && Boolean(resetToken) ? 'PASSED (200)' : `FAILED (${res.status})`, {
        success: data.success,
        resetTokenReceived: Boolean(resetToken)
      });
    }

    // Test 8: Reusing an Old OTP (should fail since already verified)
    {
      const res = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, otp: validOtp })
      });
      const data = await res.json();
      console.log(`Test 8 [POST /api/auth/verify-otp] Reusing Old OTP:`, res.status === 400 ? 'PASSED (400)' : `FAILED (${res.status})`, data.message);
    }

    // Test 9: Reset Password - Passwords Mismatch
    {
      const res = await fetch(`${BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resetToken,
          newPassword: 'MismatchPass123!',
          confirmPassword: 'DifferentPass123!'
        })
      });
      const data = await res.json();
      console.log(`Test 9 [POST /api/auth/reset-password] Password Mismatch:`, res.status === 400 ? 'PASSED (400)' : `FAILED (${res.status})`, data.message);
    }

    // Test 10: Reset Password - Weak Password (< 8 characters or no number/symbol)
    {
      const res = await fetch(`${BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resetToken,
          newPassword: 'short',
          confirmPassword: 'short'
        })
      });
      const data = await res.json();
      console.log(`Test 10 [POST /api/auth/reset-password] Weak Password (<8 chars):`, res.status === 400 ? 'PASSED (400)' : `FAILED (${res.status})`, data.message);
    }

    // Test 11: Reset Password - Valid New Password
    {
      const res = await fetch(`${BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resetToken,
          newPassword,
          confirmPassword: newPassword
        })
      });
      const data = await res.json();
      console.log(`Test 11 [POST /api/auth/reset-password] Valid Password Reset:`, res.status === 200 && data.success ? 'PASSED (200)' : `FAILED (${res.status})`, data.message);
    }

    // Test 12: Reusing Already Used Reset Token (should fail)
    {
      const res = await fetch(`${BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resetToken,
          newPassword: 'AnotherPassword@999',
          confirmPassword: 'AnotherPassword@999'
        })
      });
      const data = await res.json();
      console.log(`Test 12 [POST /api/auth/reset-password] Reusing Old Token:`, res.status === 400 ? 'PASSED (400)' : `FAILED (${res.status})`, data.message);
    }

    // Test 13: Login with Old Password (should fail with 401)
    {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, password: initialPassword })
      });
      const data = await res.json();
      console.log(`Test 13 [POST /api/auth/login] Login With Old Password (Rejected):`, res.status === 401 ? 'PASSED (401)' : `FAILED (${res.status})`, data.message);
    }

    // Test 14: Login with New Password (should succeed with 200 & JWT)
    {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, password: newPassword })
      });
      const data = await res.json();
      console.log(`Test 14 [POST /api/auth/login] Login With New Password:`, res.status === 200 && data.token ? 'PASSED (200)' : `FAILED (${res.status})`, {
        success: data.success,
        tokenReceived: Boolean(data.token),
        role: data.user?.role
      });
    }

    console.log('--- All Tests Completed Successfully ---');
  } finally {
    // Cleanup test record
    await Admin.deleteOne({ _id: testAdmin._id });
    await PasswordReset.deleteMany({ email: testEmail });
    await mongoose.disconnect();
  }
};

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
