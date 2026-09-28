import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import dns from 'node:dns';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

dotenv.config();
dns.setServers(['8.8.8.8', '1.1.1.1']);

import authRoutes from '../src/routes/authRoutes.js';
import adminRoutes from '../src/routes/adminRoutes.js';
import financeBookRoutes from '../src/routes/financeBookRoutes.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerDocument } from '../src/docs/swagger.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/superadmin', adminRoutes);
app.use('/api/v1/finance-book', financeBookRoutes);
app.use('/api/finance-book', financeBookRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use((err, req, res, next) => {
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

async function runHttpTests() {
  console.log('--- Starting HTTP API Verification ---');
  await mongoose.connect(process.env.MONGO_URI);

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`Test server running at ${baseUrl}`);

  try {
    // Generate valid JWT token for an admin
    const adminToken = jwt.sign(
      { userId: 'admin_test_id', username: 'admin_test', role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 1. Test 401 Unauthorized without token
    console.log('\n[1] Testing 401 Unauthorized without token:');
    const resNoAuth = await fetch(`${baseUrl}/api/v1/finance-book/active`);
    console.log('Status without token:', resNoAuth.status);
    if (resNoAuth.status !== 401) throw new Error('Expected 401 for unauthenticated request');

    // 2. Test 403 Forbidden with unauthorized role
    console.log('\n[2] Testing 403 Forbidden with unauthorized role:');
    const guestToken = jwt.sign(
      { userId: 'guest_id', username: 'guest', role: 'guest' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    const resForbidden = await fetch(`${baseUrl}/api/v1/finance-book/active`, {
      headers: { Authorization: `Bearer ${guestToken}` }
    });
    console.log('Status with guest token:', resForbidden.status);
    if (resForbidden.status !== 403) throw new Error('Expected 403 for unauthorized role');

    // 3. Test GET /api/v1/finance-book/active with valid admin token
    console.log('\n[3] Testing GET /api/v1/finance-book/active:');
    const resActive = await fetch(`${baseUrl}/api/v1/finance-book/active`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('Status with admin token:', resActive.status);
    if (resActive.status !== 200) throw new Error('Expected 200 for active ledger');
    const activeJson = await resActive.json();
    console.log('Active ledger book title:', activeJson.data?.ledgerBook?.title);
    if (!activeJson.success || !activeJson.data) throw new Error('Failed to retrieve active ledger');

    // 4. Test POST /api/v1/finance-book/rows
    console.log('\n[4] Testing POST /api/v1/finance-book/rows:');
    const resCreateRow = await fetch(`${baseUrl}/api/v1/finance-book/rows`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        borrowDate: '01-09',
        nameTelugu: 'రాఘవేంద్ర',
        nameEnglish: 'Raghavendra',
        productItem: 'బంగారు చైన్',
        principalAmount: 25000,
        interestRate: 5
      })
    });
    console.log('Create row status:', resCreateRow.status);
    if (resCreateRow.status !== 201) throw new Error('Expected 201 for row creation');
    const createdRowJson = await resCreateRow.json();
    const createdRowId = createdRowJson.data.id;
    console.log('Created Row ID:', createdRowId, 'Telugu Name:', createdRowJson.data.nameTelugu);

    // 5. Test PATCH /api/v1/finance-book/rows/:id
    console.log('\n[5] Testing PATCH /api/v1/finance-book/rows/:id:');
    const resUpdateRow = await fetch(`${baseUrl}/api/v1/finance-book/rows/${createdRowId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        productItem: 'బంగారు నెక్లెస్'
      })
    });
    console.log('Update row status:', resUpdateRow.status);
    if (resUpdateRow.status !== 200) throw new Error('Expected 200 for row update');
    const updatedRowJson = await resUpdateRow.json();
    if (updatedRowJson.data.productItem !== 'బంగారు నెక్లెస్') throw new Error('Product item was not updated');

    // 6. Test PATCH /api/v1/finance-book/rows/:id/status (Validation failure on unpaid account)
    console.log('\n[6] Testing PATCH /api/v1/finance-book/rows/:id/status:');
    const resCloseInvalid = await fetch(`${baseUrl}/api/v1/finance-book/rows/${createdRowId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ isClosed: true })
    });
    console.log('Status on invalid closure attempt:', resCloseInvalid.status);
    if (resCloseInvalid.status !== 400) throw new Error('Expected 400 for invalid closure');

    // 7. Test POST /api/v1/finance-book/columns
    console.log('\n[7] Testing POST /api/v1/finance-book/columns:');
    const resAddCol = await fetch(`${baseUrl}/api/v1/finance-book/columns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({})
    });
    console.log('Add column status:', resAddCol.status);
    if (resAddCol.status !== 201) throw new Error('Expected 201 for column addition');
    const addedColJson = await resAddCol.json();
    console.log('Added column:', addedColJson.data);

    // 8. Test DELETE /api/v1/finance-book/rows/:id
    console.log('\n[8] Testing DELETE /api/v1/finance-book/rows/:id:');
    const resDeleteRow = await fetch(`${baseUrl}/api/v1/finance-book/rows/${createdRowId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('Delete row status:', resDeleteRow.status);
    if (resDeleteRow.status !== 200) throw new Error('Expected 200 for row deletion');

    // 9. Test Swagger Document contains all new endpoints
    console.log('\n[9] Testing Swagger paths:');
    const swaggerPaths = Object.keys(swaggerDocument.paths);
    const requiredEndpoints = [
      '/api/v1/finance-book/active',
      '/api/v1/finance-book/batch-save',
      '/api/v1/finance-book/columns',
      '/api/v1/finance-book/columns/{index}',
      '/api/v1/finance-book/rows',
      '/api/v1/finance-book/rows/{id}',
      '/api/v1/finance-book/rows/{id}/status'
    ];
    for (const ep of requiredEndpoints) {
      if (!swaggerPaths.includes(ep)) {
        throw new Error(`Swagger missing endpoint: ${ep}`);
      }
    }
    console.log('All required Finance Book endpoints present in Swagger documentation!');

    console.log('\n✅ ALL HTTP API TESTS PASSED SUCCESSFULLY!');
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runHttpTests().catch((err) => {
  console.error('\n❌ HTTP test suite failed:', err);
  process.exit(1);
});
