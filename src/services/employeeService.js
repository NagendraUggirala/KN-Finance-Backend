import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Employee from '../models/Employee.js';
import FinanceRecord from '../models/FinanceRecord.js';
import LedgerBorrowerRow from '../models/LedgerBorrowerRow.js';
import LedgerInstallmentPayment from '../models/LedgerInstallmentPayment.js';
import AuditLog from '../models/AuditLog.js';
import { isValidObjectId } from '../utils/financeValidators.js';
import { createAuditLog, AUDIT_ACTIONS } from './auditLogService.js';
import { computeDiff } from '../utils/auditLogSanitizer.js';

/**
 * Validates password strength: at least 8 characters with at least one number or symbol
 */
export const validatePasswordStrength = (pwd) => {
  if (!pwd || typeof pwd !== 'string') return false;
  if (pwd.length < 8) return false;
  return /[\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd);
};

/**
 * Auto-generates the next sequential employee ID (e.g. EMP001, EMP002...)
 */
export const generateNextEmployeeId = async () => {
  const lastEmployee = await Employee.findOne({ employeeId: /^EMP\d+$/i })
    .sort({ createdAt: -1 })
    .lean();

  if (!lastEmployee || !lastEmployee.employeeId) {
    return 'EMP001';
  }

  const match = lastEmployee.employeeId.match(/\d+/);
  if (!match) return 'EMP001';

  const nextNumber = parseInt(match[0], 10) + 1;
  return `EMP${String(nextNumber).padStart(3, '0')}`;
};

/**
 * Creates a new Employee with hashed password, status = Active, tokenVersion = 0
 */
export const createEmployee = async ({ data, adminUser }) => {
  const {
    fullName,
    age,
    phone,
    altPhone,
    email,
    aadharCard,
    panCard,
    village,
    assignedOperationalArea,
    joiningDate,
    references,
    password,
    confirmPassword
  } = data;

  // Validation
  if (!fullName || !phone || !email || !assignedOperationalArea || !password) {
    const error = new Error('fullName, phone, email, assignedOperationalArea, and password are required');
    error.status = 400;
    throw error;
  }

  if (confirmPassword && password !== confirmPassword) {
    const error = new Error('Password and confirm password do not match');
    error.status = 400;
    throw error;
  }

  if (!validatePasswordStrength(password)) {
    const error = new Error('Password must be at least 8 characters long and contain at least one number or symbol');
    error.status = 400;
    throw error;
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Check duplicate email
  const existingEmployee = await Employee.findOne({ email: normalizedEmail, isArchived: false });
  if (existingEmployee) {
    const error = new Error('Employee with this email already exists');
    error.status = 409;
    throw error;
  }

  // Generate or sanitize employeeId
  let employeeId = data.employeeId?.trim().toUpperCase();
  if (!employeeId) {
    employeeId = await generateNextEmployeeId();
  } else {
    const existingId = await Employee.findOne({ employeeId });
    if (existingId) {
      const error = new Error(`Employee with ID ${employeeId} already exists`);
      error.status = 409;
      throw error;
    }
  }

  const employee = new Employee({
    employeeId,
    fullName: fullName.trim(),
    age: Number(age) || 25,
    phone: phone.trim(),
    altPhone: altPhone ? altPhone.trim() : '',
    email: normalizedEmail,
    aadharCard: aadharCard ? aadharCard.trim() : '',
    panCard: panCard ? panCard.trim() : '',
    village: village ? village.trim() : '',
    assignedOperationalArea: assignedOperationalArea.trim(),
    joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
    references: references !== undefined ? references : '',
    password, // Handled by pre-save hook using bcrypt
    status: 'Active',
    tokenVersion: 0,
    createdBy: adminUser?.username || adminUser?.userId || 'admin',
    updatedBy: adminUser?.username || adminUser?.userId || 'admin'
  });

  await employee.save();

  // Log audit automatically (Aadhaar & PAN are masked, password excluded)
  await createAuditLog({
    userId: adminUser?.username || adminUser?.userId || 'admin',
    userRole: adminUser?.role || 'admin',
    action: AUDIT_ACTIONS.CREATE,
    entityType: 'Employee',
    entityId: employee._id.toString(),
    details: {
      employeeId: employee.employeeId,
      fullName: employee.fullName,
      email: employee.email,
      assignedOperationalArea: employee.assignedOperationalArea
    }
  });

  // Return clean employee object without password
  const employeeObj = employee.toObject();
  delete employeeObj.password;

  return employeeObj;
};

/**
 * Lists employees with search, filtering, and pagination
 */
export const getEmployees = async ({
  search,
  village,
  assignedOperationalArea,
  status,
  page = 1,
  limit = 10,
  includeArchived = false
}) => {
  const query = {};

  if (!includeArchived) {
    query.isArchived = false;
  }

  if (status && ['Active', 'Inactive'].includes(status)) {
    query.status = status;
  }

  if (village) {
    query.village = new RegExp(village.trim(), 'i');
  }

  if (assignedOperationalArea) {
    query.assignedOperationalArea = new RegExp(assignedOperationalArea.trim(), 'i');
  }

  if (search && search.trim()) {
    const s = search.trim();
    query.$or = [
      { employeeId: new RegExp(s, 'i') },
      { fullName: new RegExp(s, 'i') },
      { phone: new RegExp(s, 'i') },
      { email: new RegExp(s, 'i') },
      { village: new RegExp(s, 'i') }
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const total = await Employee.countDocuments(query);
  const employees = await Employee.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum)
    .lean();

  return {
    employees,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1
    }
  };
};

/**
 * Updates employee profile details (excludes password)
 */
export const updateEmployee = async ({ id, data, adminUser }) => {
  if (!isValidObjectId(id)) {
    const error = new Error('Invalid Employee ID format');
    error.status = 400;
    throw error;
  }

  const employee = await Employee.findById(id);
  if (!employee || employee.isArchived) {
    const error = new Error('Employee not found');
    error.status = 404;
    throw error;
  }

  // Prevent password update through this general PUT endpoint
  if (data.password !== undefined) {
    delete data.password;
  }

  // Check email uniqueness if email is changing
  if (data.email) {
    const normalizedEmail = data.email.trim().toLowerCase();
    if (normalizedEmail !== employee.email) {
      const emailTaken = await Employee.findOne({
        email: normalizedEmail,
        _id: { $ne: employee._id },
        isArchived: false
      });
      if (emailTaken) {
        const error = new Error('Email is already in use by another employee');
        error.status = 409;
        throw error;
      }
      employee.email = normalizedEmail;
    }
  }

  // Snapshot previous state for safe before/after diff calculation
  const previousEmployee = employee.toObject();

  if (data.fullName !== undefined) employee.fullName = data.fullName.trim();
  if (data.age !== undefined) employee.age = Number(data.age);
  if (data.phone !== undefined) employee.phone = data.phone.trim();
  if (data.altPhone !== undefined) employee.altPhone = data.altPhone.trim();
  if (data.aadharCard !== undefined) employee.aadharCard = data.aadharCard.trim();
  if (data.panCard !== undefined) employee.panCard = data.panCard.trim();
  if (data.village !== undefined) employee.village = data.village.trim();
  if (data.assignedOperationalArea !== undefined) employee.assignedOperationalArea = data.assignedOperationalArea.trim();
  if (data.joiningDate !== undefined) employee.joiningDate = new Date(data.joiningDate);
  if (data.references !== undefined) employee.references = data.references;

  employee.updatedBy = adminUser?.username || adminUser?.userId || 'admin';
  await employee.save();

  // Log audit with safe before/after diff (Aadhaar & PAN are masked)
  const diff = computeDiff(previousEmployee, employee);
  await createAuditLog({
    userId: adminUser?.username || adminUser?.userId || 'admin',
    userRole: adminUser?.role || 'admin',
    action: AUDIT_ACTIONS.UPDATE,
    entityType: 'Employee',
    entityId: employee._id.toString(),
    details: {
      employeeId: employee.employeeId,
      ...diff
    }
  });

  const employeeObj = employee.toObject();
  delete employeeObj.password;
  return employeeObj;
};

/**
 * Changes employee status (Active <-> Inactive)
 * When deactivating (Active -> Inactive), increments tokenVersion to revoke all active JWT sessions.
 */
export const changeEmployeeStatus = async ({ id, status, adminUser }) => {
  if (!isValidObjectId(id)) {
    const error = new Error('Invalid Employee ID format');
    error.status = 400;
    throw error;
  }

  if (!status || !['Active', 'Inactive'].includes(status)) {
    const error = new Error('Invalid status. Allowed values are "Active" or "Inactive"');
    error.status = 400;
    throw error;
  }

  const employee = await Employee.findById(id);
  if (!employee || employee.isArchived) {
    const error = new Error('Employee not found');
    error.status = 404;
    throw error;
  }

  const previousStatus = employee.status;
  employee.status = status;

  // Immediately revoke active employee sessions when deactivating
  if (previousStatus === 'Active' && status === 'Inactive') {
    employee.tokenVersion = (employee.tokenVersion || 0) + 1;
  }

  employee.updatedBy = adminUser?.username || adminUser?.userId || 'admin';
  await employee.save();

  // Log status change audit
  await createAuditLog({
    userId: adminUser?.username || adminUser?.userId || 'admin',
    userRole: adminUser?.role || 'admin',
    action: AUDIT_ACTIONS.STATUS_CHANGE,
    entityType: 'Employee',
    entityId: employee._id.toString(),
    details: {
      employeeId: employee.employeeId,
      previousStatus,
      newStatus: status,
      tokenVersion: employee.tokenVersion
    }
  });

  const employeeObj = employee.toObject();
  delete employeeObj.password;
  return employeeObj;
};

/**
 * Directly resets an employee's password by Admin
 * Hashes new password and increments tokenVersion to revoke all existing sessions.
 */
export const resetEmployeePassword = async ({ id, newPassword, adminUser }) => {
  if (!isValidObjectId(id)) {
    const error = new Error('Invalid Employee ID format');
    error.status = 400;
    throw error;
  }

  if (!validatePasswordStrength(newPassword)) {
    const error = new Error('New password must be at least 8 characters long and contain at least one number or symbol');
    error.status = 400;
    throw error;
  }

  const employee = await Employee.findById(id);
  if (!employee || employee.isArchived) {
    const error = new Error('Employee not found');
    error.status = 404;
    throw error;
  }

  // Update password and increment tokenVersion to revoke existing sessions
  employee.password = newPassword; // Handled by pre-save hook
  employee.tokenVersion = (employee.tokenVersion || 0) + 1;
  employee.updatedBy = adminUser?.username || adminUser?.userId || 'admin';

  await employee.save();

  // Log audit without recording the password
  await createAuditLog({
    userId: adminUser?.username || adminUser?.userId || 'admin',
    userRole: adminUser?.role || 'admin',
    action: AUDIT_ACTIONS.PASSWORD_RESET,
    entityType: 'Employee',
    entityId: employee._id.toString(),
    details: {
      employeeId: employee.employeeId,
      performedBy: adminUser?.username || adminUser?.userId || 'admin',
      tokenVersion: employee.tokenVersion
    }
  });

  return {
    employeeId: employee.employeeId,
    tokenVersion: employee.tokenVersion
  };
};

/**
 * Soft deletes / archives an employee and revokes existing sessions
 */
export const archiveOrDeleteEmployee = async ({ id, adminUser }) => {
  if (!isValidObjectId(id)) {
    const error = new Error('Invalid Employee ID format');
    error.status = 400;
    throw error;
  }

  const employee = await Employee.findById(id);
  if (!employee || employee.isArchived) {
    const error = new Error('Employee not found');
    error.status = 404;
    throw error;
  }

  employee.isArchived = true;
  employee.status = 'Inactive';
  employee.archivedAt = new Date();
  employee.archivedBy = adminUser?.username || adminUser?.userId || 'admin';
  employee.tokenVersion = (employee.tokenVersion || 0) + 1; // Invalidate any remaining sessions

  await employee.save();

  // Log audit
  await createAuditLog({
    userId: adminUser?.username || adminUser?.userId || 'admin',
    userRole: adminUser?.role || 'admin',
    action: AUDIT_ACTIONS.DELETE,
    entityType: 'Employee',
    entityId: employee._id.toString(),
    details: {
      employeeId: employee.employeeId,
      fullName: employee.fullName,
      archivedAt: employee.archivedAt
    }
  });

  return {
    deletedEmployeeId: employee.employeeId
  };
};

/**
 * Authenticates an employee and issues a JWT with employeeId and tokenVersion
 */
export const employeeLogin = async ({ email, username, password }) => {
  const identifier = email || username;
  if (!identifier || !password) {
    const error = new Error('Email (or username) and password are required');
    error.status = 400;
    throw error;
  }

  const normalized = identifier.trim().toLowerCase();

  // Find employee by email or employeeId
  const employee = await Employee.findOne({
    $or: [{ email: normalized }, { employeeId: identifier.trim().toUpperCase() }],
    isArchived: false
  }).select('+password');

  if (!employee) {
    await createAuditLog({
      action: AUDIT_ACTIONS.LOGIN_FAILED,
      entityType: 'Employee',
      userId: normalized,
      userRole: 'employee',
      details: { attemptedIdentifier: identifier, reason: 'Employee account not found' }
    });
    const error = new Error('Invalid credentials');
    error.status = 401;
    throw error;
  }

  if (employee.status !== 'Active') {
    await createAuditLog({
      action: AUDIT_ACTIONS.LOGIN_FAILED,
      entityType: 'Employee',
      entityId: employee._id.toString(),
      userId: employee.employeeId,
      userRole: 'employee',
      details: { employeeId: employee.employeeId, reason: 'Employee account inactive' }
    });
    const error = new Error('Employee account is inactive. Please contact Admin.');
    error.status = 403;
    throw error;
  }

  const isMatch = await employee.comparePassword(password);
  if (!isMatch) {
    await createAuditLog({
      action: AUDIT_ACTIONS.LOGIN_FAILED,
      entityType: 'Employee',
      entityId: employee._id.toString(),
      userId: employee.employeeId,
      userRole: 'employee',
      details: { employeeId: employee.employeeId, reason: 'Incorrect password' }
    });
    const error = new Error('Invalid credentials');
    error.status = 401;
    throw error;
  }

  // Generate JWT token containing employee identity and tokenVersion
  const payload = {
    id: employee._id.toString(),
    userId: employee._id.toString(),
    employeeId: employee.employeeId,
    role: 'employee',
    tokenVersion: employee.tokenVersion || 0
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d'
  });

  // Log successful employee login
  await createAuditLog({
    userId: employee.employeeId,
    userRole: 'employee',
    action: AUDIT_ACTIONS.LOGIN,
    entityType: 'Employee',
    entityId: employee._id.toString(),
    details: {
      employeeId: employee.employeeId,
      email: employee.email
    }
  });

  const employeeData = {
    id: employee._id.toString(),
    employeeId: employee.employeeId,
    fullName: employee.fullName,
    email: employee.email,
    phone: employee.phone,
    assignedOperationalArea: employee.assignedOperationalArea,
    village: employee.village,
    status: employee.status
  };

  return {
    token,
    employee: employeeData
  };
};

/**
 * Retrieves the authenticated employee's safe profile
 */
export const getEmployeeProfile = async (employeeId) => {
  const employee = await Employee.findById(employeeId).lean();
  if (!employee || employee.isArchived) {
    const error = new Error('Employee profile not found');
    error.status = 404;
    throw error;
  }

  delete employee.password;
  delete employee.tokenVersion;
  return employee;
};

/**
 * Retrieves borrowers assigned to the authenticated employee's operational area
 */
export const getAssignedBorrowers = async (employee) => {
  const operationalArea = employee.assignedOperationalArea;

  const query = { status: 'active' };
  if (operationalArea) {
    query.$or = [
      { assignedOperationalArea: new RegExp(operationalArea, 'i') },
      { village: new RegExp(employee.village || operationalArea, 'i') }
    ];
  }

  let borrowers = await FinanceRecord.find(query).sort({ createdAt: -1 }).lean();

  // If no area-specific records exist yet, return active borrowers for route inspection
  if (borrowers.length === 0) {
    borrowers = await FinanceRecord.find({ status: 'active' }).limit(50).lean();
  }

  return borrowers;
};

/**
 * Records daily/weekly loan installment collection from field borrower
 */
export const recordCollection = async ({ employee, borrowerId, amount, paymentDate, paymentType = 'Cash' }) => {
  if (!borrowerId) {
    const error = new Error('borrowerId is required');
    error.status = 400;
    throw error;
  }

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    const error = new Error('Collection amount must be a positive number');
    error.status = 400;
    throw error;
  }

  if (!['Cash', 'UPI', 'Card'].includes(paymentType)) {
    const error = new Error('Invalid paymentType. Allowed values: Cash, UPI, Card');
    error.status = 400;
    throw error;
  }

  // Find borrower record
  let financeRecord = null;
  if (isValidObjectId(borrowerId)) {
    financeRecord = await FinanceRecord.findById(borrowerId);
  }

  if (!financeRecord) {
    // Check if borrowerId is from LedgerBorrowerRow
    const borrowerRow = isValidObjectId(borrowerId) ? await LedgerBorrowerRow.findById(borrowerId) : null;
    if (borrowerRow && borrowerRow.financeRecordId) {
      financeRecord = await FinanceRecord.findById(borrowerRow.financeRecordId);
    }
  }

  if (!financeRecord) {
    const error = new Error('Borrower record not found');
    error.status = 404;
    throw error;
  }

  if (financeRecord.status === 'closed') {
    const error = new Error('Cannot collect payment for a closed borrower account');
    error.status = 400;
    throw error;
  }

  // Update finance record totals
  financeRecord.totalPaid = (financeRecord.totalPaid || 0) + numAmount;
  financeRecord.remainingBalance = Math.max(0, (financeRecord.targetAmount || 0) - financeRecord.totalPaid);

  if (financeRecord.remainingBalance <= 0 && financeRecord.totalPaid > 0) {
    financeRecord.status = 'closed';
  }

  await financeRecord.save();

  // Log collection in AuditLog
  await createAuditLog({
    userId: employee.employeeId || employee.userId || employee.id,
    userRole: 'employee',
    action: AUDIT_ACTIONS.UPDATE,
    entityType: 'FinanceRecord',
    entityId: financeRecord._id.toString(),
    details: {
      actionType: 'EMPLOYEE_COLLECTION',
      borrowerNameTelugu: financeRecord.borrowerNameTelugu,
      amount: numAmount,
      paymentDate: paymentDate || new Date().toISOString().split('T')[0],
      paymentType,
      collectedBy: employee.employeeId || employee.id
    }
  });

  return {
    borrowerId: financeRecord._id.toString(),
    borrowerNameTelugu: financeRecord.borrowerNameTelugu,
    borrowerNameEnglish: financeRecord.borrowerNameEnglish,
    amount: numAmount,
    totalPaid: financeRecord.totalPaid,
    remainingBalance: financeRecord.remainingBalance,
    status: financeRecord.status,
    collectedBy: employee.employeeId || employee.id,
    paymentDate: paymentDate || new Date().toISOString().split('T')[0],
    paymentType
  };
};
