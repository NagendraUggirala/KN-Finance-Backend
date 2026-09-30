export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'KN Backend API Documentation',
    version: '1.0.0',
    description: 'API documentation for KN Backend - Super Admin Module and Admin Management',
    contact: {
      name: 'KN Backend Support'
    }
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Local Development Server'
    }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token in the format: Bearer <token>'
      }
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          message: {
            type: 'string',
            example: 'Error description message'
          }
        }
      },
      SuperAdminLoginRequest: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: {
            type: 'string',
            example: 'superadmin'
          },
          password: {
            type: 'string',
            example: 'superadmin123'
          }
        }
      },
      SuperAdminLoginResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true
          },
          message: {
            type: 'string',
            example: 'Super Admin login successful'
          },
          token: {
            type: 'string',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
          },
          user: {
            type: 'object',
            properties: {
              role: {
                type: 'string',
                example: 'superadmin'
              },
              username: {
                type: 'string',
                example: 'Nagendra'
              }
            }
          }
        }
      },
      AdminLoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            example: 'admin@knfinance.com'
          },
          password: {
            type: 'string',
            example: 'password123'
          }
        }
      },
      AdminLoginResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Admin login successful' },
          token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          user: {
            type: 'object',
            properties: {
              id: { type: 'string', example: '66f3a987b654c321d012e999' },
              username: { type: 'string', example: 'admin01' },
              name: { type: 'string', example: 'Admin One' },
              email: { type: 'string', example: 'admin@knfinance.com' },
              role: { type: 'string', example: 'admin' },
              status: { type: 'string', example: 'active' }
            }
          }
        }
      },
      ForgotPasswordRequest: {
        type: 'object',
        required: ['email'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            example: 'employee@knfinance.com'
          }
        }
      },
      VerifyOtpRequest: {
        type: 'object',
        required: ['email', 'otp'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            example: 'employee@knfinance.com'
          },
          otp: {
            type: 'string',
            minLength: 6,
            maxLength: 6,
            example: '573469'
          }
        }
      },
      VerifyOtpResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'OTP verified successfully' },
          resetToken: { type: 'string', example: 'b5e1a2f3c4d5e6f7a8b9c0d1e2f3a4b5...' }
        }
      },
      ResendOtpRequest: {
        type: 'object',
        required: ['email'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            example: 'employee@knfinance.com'
          }
        }
      },
      ResetPasswordRequest: {
        type: 'object',
        required: ['resetToken', 'newPassword', 'confirmPassword'],
        properties: {
          resetToken: {
            type: 'string',
            example: 'b5e1a2f3c4d5e6f7a8b9c0d1e2f3a4b5...'
          },
          newPassword: {
            type: 'string',
            minLength: 8,
            example: 'Admin@123'
          },
          confirmPassword: {
            type: 'string',
            minLength: 8,
            example: 'Admin@123'
          }
        }
      },
      GenericSuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Operation completed successfully' }
        }
      },
      CreateAdminRequest: {
        type: 'object',
        required: ['username', 'password', 'name', 'email', 'phone'],
        properties: {
          username: {
            type: 'string',
            example: 'admin01'
          },
          password: {
            type: 'string',
            example: 'password123'
          },
          name: {
            type: 'string',
            example: 'Admin One'
          },
          email: {
            type: 'string',
            format: 'email',
            example: 'admin@example.com'
          },
          phone: {
            type: 'string',
            example: '9876543210'
          }
        }
      },
      UpdateAdminRequest: {
        type: 'object',
        properties: {
          username: {
            type: 'string',
            example: 'admin01_updated'
          },
          name: {
            type: 'string',
            example: 'Admin Full Name'
          },
          email: {
            type: 'string',
            format: 'email',
            example: 'updatedadmin@example.com'
          },
          phone: {
            type: 'string',
            example: '9123456780'
          },
          password: {
            type: 'string',
            description: 'Optional new password. If provided, must be at least 6 characters.',
            example: 'newpassword123'
          }
        }
      },
      UpdateAdminStatusRequest: {
        type: 'object',
        required: ['status'],
        properties: {
          status: {
            type: 'string',
            enum: ['active', 'inactive'],
            example: 'inactive'
          }
        }
      },
      AdminResponse: {
        type: 'object',
        properties: {
          _id: {
            type: 'string',
            example: '66f3a987b654c321d012e999'
          },
          username: {
            type: 'string',
            example: 'admin01'
          },
          name: {
            type: 'string',
            example: 'Admin One'
          },
          email: {
            type: 'string',
            example: 'admin@example.com'
          },
          phone: {
            type: 'string',
            example: '9876543210'
          },
          role: {
            type: 'string',
            example: 'admin'
          },
          status: {
            type: 'string',
            example: 'active'
          },
          createdBy: {
            type: 'string',
            example: 'Nagendra'
          },
          createdAt: {
            type: 'string',
            format: 'date-time'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time'
          }
        }
      },
      LedgerInstallmentPaymentItem: {
        type: 'object',
        properties: {
          date: { type: 'string', example: '08-08' },
          amount: { type: 'number', example: 500 },
          paymentType: { type: 'string', enum: ['Cash', 'UPI', 'Card'], example: 'Cash' }
        }
      },
      LedgerBorrowerRowResponse: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '66f3b111a123b456c789d001' },
          sNo: { type: 'number', example: 1 },
          date: { type: 'string', example: '03-08' },
          borrowDate: { type: 'string', example: '03-08' },
          nameTelugu: { type: 'string', example: 'కృష్ణారావు' },
          nameEnglish: { type: 'string', example: 'Krishna Rao' },
          item: { type: 'string', example: 'బంగారు గాజులు' },
          productItem: { type: 'string', example: 'బంగారు గాజులు' },
          amount: { type: 'number', example: 15000 },
          principalAmount: { type: 'number', example: 15000 },
          initialRemaining: { type: 'number', example: 18900 },
          interestRate: { type: 'number', example: 5 },
          isClosed: { type: 'boolean', example: false },
          totalPaid: { type: 'number', example: 2000 },
          remainingBalance: { type: 'number', example: 16900 },
          payments: {
            type: 'object',
            additionalProperties: { $ref: '#/components/schemas/LedgerInstallmentPaymentItem' },
            example: {
              '0': { date: '08-08', amount: 500, paymentType: 'Cash' },
              '1': { date: '15-08', amount: 500, paymentType: 'Cash' }
            }
          }
        }
      },
      FinanceBookActiveResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Active finance book ledger retrieved successfully' },
          data: {
            type: 'object',
            properties: {
              ledgerBook: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: '66f3a987b654c321d012e111' },
                  branchId: { type: 'string', example: 'NY-104' },
                  title: { type: 'string', example: 'KN FINANCE - FINANCE BOOK LEDGER' },
                  academicYear: { type: 'string', example: '2026-2027' },
                  isActive: { type: 'boolean', example: true },
                  version: { type: 'number', example: 1 }
                }
              },
              dateColumns: {
                type: 'array',
                items: { type: 'string' },
                example: ['08-08', '15-08', '22-08']
              },
              columns: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', example: '66f3b000a123b456c789d001' },
                    columnIndex: { type: 'number', example: 0 },
                    headerDate: { type: 'string', example: '08-08' },
                    labelTelugu: { type: 'string', example: 'వాయిదా 1' }
                  }
                }
              },
              rows: {
                type: 'array',
                items: { $ref: '#/components/schemas/LedgerBorrowerRowResponse' }
              },
              totals: {
                type: 'object',
                properties: {
                  principalAmount: { type: 'number', example: 15000 },
                  totalPaid: { type: 'number', example: 2000 },
                  remainingBalance: { type: 'number', example: 16900 }
                }
              }
            }
          }
        }
      },
      CreateBorrowerRowRequest: {
        type: 'object',
        required: ['nameTelugu', 'productItem', 'principalAmount'],
        properties: {
          ledgerBookId: { type: 'string', example: '66f3a987b654c321d012e111' },
          borrowDate: { type: 'string', example: '03-08' },
          nameTelugu: { type: 'string', example: 'కృష్ణారావు' },
          nameEnglish: { type: 'string', example: 'Krishna Rao' },
          productItem: { type: 'string', example: 'బంగారు గాజులు' },
          principalAmount: { type: 'number', example: 15000 },
          interestRate: { type: 'number', example: 5 }
        }
      },
      UpdateBorrowerRowRequest: {
        type: 'object',
        properties: {
          borrowDate: { type: 'string', example: '03-08' },
          nameTelugu: { type: 'string', example: 'కృష్ణారావు' },
          nameEnglish: { type: 'string', example: 'Krishna Rao' },
          productItem: { type: 'string', example: 'బంగారు గాజులు' },
          principalAmount: { type: 'number', example: 16000 },
          initialRemaining: { type: 'number', example: 20160 },
          interestRate: { type: 'number', example: 5 },
          applyFivePercentIncrement: { type: 'boolean', example: false }
        }
      },
      UpdateBorrowerStatusRequest: {
        type: 'object',
        required: ['isClosed'],
        properties: {
          isClosed: { type: 'boolean', example: true }
        }
      },
      BatchSaveRequest: {
        type: 'object',
        required: ['rows'],
        properties: {
          ledgerBookId: { type: 'string', example: '66f3a987b654c321d012e111' },
          version: { type: 'number', example: 1 },
          dateColumns: {
            type: 'array',
            items: { type: 'string' },
            example: ['08-08', '15-08', '22-08']
          },
          rows: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', example: '66f3b111a123b456c789d001' },
                sNo: { type: 'number', example: 1 },
                date: { type: 'string', example: '03-08' },
                nameTelugu: { type: 'string', example: 'కృష్ణారావు' },
                nameEnglish: { type: 'string', example: 'Krishna Rao' },
                item: { type: 'string', example: 'బంగారు గాజులు' },
                amount: { type: 'number', example: 15000 },
                initialRemaining: { type: 'number', example: 18900 },
                interestRate: { type: 'number', example: 5 },
                isClosed: { type: 'boolean', example: false },
                payments: {
                  type: 'object',
                  example: {
                    '0': { date: '08-08', amount: 500 },
                    '1': { date: '15-08', amount: 500 }
                  }
                }
              }
            }
          }
        }
      },
      EmployeeResponse: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '66f3c111a123b456c789d001' },
          employeeId: { type: 'string', example: 'EMP001' },
          fullName: { type: 'string', example: 'Ravi Kumar' },
          age: { type: 'number', example: 28 },
          phone: { type: 'string', example: '9876543210' },
          altPhone: { type: 'string', example: '9123456780' },
          email: { type: 'string', format: 'email', example: 'ravi@example.com' },
          aadharCard: { type: 'string', example: 'XXXX-XXXX-1234' },
          panCard: { type: 'string', example: 'ABCDE1234F' },
          village: { type: 'string', example: 'Ravulapalem' },
          assignedOperationalArea: { type: 'string', example: 'Area-01' },
          joiningDate: { type: 'string', format: 'date-time' },
          references: { type: 'string', example: 'Reference details' },
          status: { type: 'string', enum: ['Active', 'Inactive'], example: 'Active' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      CreateEmployeeRequest: {
        type: 'object',
        required: ['fullName', 'age', 'phone', 'email', 'assignedOperationalArea', 'password'],
        properties: {
          employeeId: { type: 'string', example: 'EMP001' },
          fullName: { type: 'string', example: 'Ravi Kumar' },
          age: { type: 'number', example: 28 },
          phone: { type: 'string', example: '9876543210' },
          altPhone: { type: 'string', example: '9123456780' },
          email: { type: 'string', format: 'email', example: 'ravi@example.com' },
          aadharCard: { type: 'string', example: 'XXXX-XXXX-1234' },
          panCard: { type: 'string', example: 'ABCDE1234F' },
          village: { type: 'string', example: 'Ravulapalem' },
          assignedOperationalArea: { type: 'string', example: 'Area-01' },
          joiningDate: { type: 'string', example: '2026-09-28' },
          references: { type: 'string', example: 'Reference details' },
          password: { type: 'string', example: 'Initial@123' },
          confirmPassword: { type: 'string', example: 'Initial@123' }
        }
      },
      UpdateEmployeeRequest: {
        type: 'object',
        properties: {
          fullName: { type: 'string', example: 'Ravi Kumar' },
          age: { type: 'number', example: 29 },
          phone: { type: 'string', example: '9876543210' },
          altPhone: { type: 'string', example: '9123456780' },
          email: { type: 'string', format: 'email', example: 'ravi@example.com' },
          aadharCard: { type: 'string', example: 'XXXX-XXXX-1234' },
          panCard: { type: 'string', example: 'ABCDE1234F' },
          village: { type: 'string', example: 'Ravulapalem' },
          assignedOperationalArea: { type: 'string', example: 'Area-02' },
          joiningDate: { type: 'string', example: '2026-09-28' },
          references: { type: 'string', example: 'Updated reference' }
        }
      },
      UpdateEmployeeStatusRequest: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['Active', 'Inactive'], example: 'Inactive' }
        }
      },
      ResetEmployeePasswordRequest: {
        type: 'object',
        required: ['newPassword'],
        properties: {
          newPassword: { type: 'string', example: 'NewPassword@123' }
        }
      },
      EmployeeLoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'ravi@example.com' },
          password: { type: 'string', example: 'Initial@123' }
        }
      },
      EmployeeLoginResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Employee login successful' },
          token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          employee: {
            type: 'object',
            properties: {
              id: { type: 'string', example: '66f3c111a123b456c789d001' },
              employeeId: { type: 'string', example: 'EMP001' },
              fullName: { type: 'string', example: 'Ravi Kumar' },
              email: { type: 'string', example: 'ravi@example.com' },
              phone: { type: 'string', example: '9876543210' },
              assignedOperationalArea: { type: 'string', example: 'Area-01' },
              village: { type: 'string', example: 'Ravulapalem' },
              status: { type: 'string', example: 'Active' }
            }
          }
        }
      },
      RecordCollectionRequest: {
        type: 'object',
        required: ['borrowerId', 'amount'],
        properties: {
          borrowerId: { type: 'string', example: '66f3b111a123b456c789d001' },
          amount: { type: 'number', example: 500 },
          paymentDate: { type: 'string', example: '2026-09-28' },
          paymentType: { type: 'string', enum: ['Cash', 'UPI', 'Card'], example: 'Cash' }
        }
      },
      AuditLog: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '66f4c222b123c456d789e001' },
          userId: { type: 'string', example: 'admin001' },
          userRole: { type: 'string', example: 'admin' },
          action: { type: 'string', example: 'UPDATE' },
          entityType: { type: 'string', example: 'Employee' },
          entityId: { type: 'string', example: '66f3a000a123b456c789d001' },
          details: {
            type: 'object',
            example: {
              changedFields: ['phone', 'village'],
              before: { phone: '9876543210', village: 'Ravulapalem' },
              after: { phone: '9123456780', village: 'Narsapuram' }
            }
          },
          ipAddress: { type: 'string', example: '127.0.0.1' },
          userAgent: { type: 'string', example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
          createdAt: { type: 'string', format: 'date-time', example: '2026-09-29T10:30:00.000Z' }
        }
      },
      AuditLogPagination: {
        type: 'object',
        properties: {
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 25 },
          totalRecords: { type: 'integer', example: 71 },
          totalPages: { type: 'integer', example: 3 }
        }
      },
      AuditLogListResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/AuditLog' }
          },
          pagination: { $ref: '#/components/schemas/AuditLogPagination' }
        }
      },
      AuditLogDetailResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: { $ref: '#/components/schemas/AuditLog' }
        }
      }
    }
  },
  tags: [
    {
      name: 'General',
      description: 'System health and info'
    },
    {
      name: 'Authentication',
      description: 'Super Admin login & admin @ JWT generation'
    },
    {
      name: 'Super Admin - Admins',
      description: 'Admin management endpoints (Super Admin only)'
    },
    {
      name: 'Finance Book Ledger',
      description: 'Operations Portal Finance Book (ఖాతా పుస్తకం) endpoints'
    },
    {
      name: 'Admin - Employee Management',
      description: 'Admin Portal - Employee registry, lifecycle, and credential reset'
    },
    {
      name: 'Employee Portal',
      description: 'Employee Portal - Authentication, field borrower routes, and collections'
    },
    {
      name: 'Audit Logs',
      description: 'Centralized immutable audit trail and activity logging endpoints (Admin / Super Admin)'
    }
  ],

  paths: {
    '/': {
      get: {
        tags: ['General'],
        summary: 'Root API status',
        description: 'Verify that KN Backend is online and running.',
        responses: {
          200: {
            description: 'Service online',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'KN Backend API is running' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/health': {
      get: {
        tags: ['General'],
        summary: 'Health check endpoint',
        description: 'Get backend uptime and timestamp.',
        responses: {
          200: {
            description: 'Health status',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    timestamp: { type: 'string', example: '2026-09-24T11:30:00.000Z' },
                    uptime: { type: 'number', example: 120.5 }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/auth/superadmin/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Super Admin Login',
        description: 'Authenticate as Super Admin using username and password to obtain a JWT bearer token.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/SuperAdminLoginRequest'
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/SuperAdminLoginResponse'
                }
              }
            }
          },
          400: {
            description: 'Missing username or password',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          },
          401: {
            description: 'Invalid credentials',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          },
          403: {
            description: 'Account is inactive',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      }
    },
    '/api/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Admin Login',
        description: 'Authenticate as an Admin using email and password to obtain a JWT bearer token.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/AdminLoginRequest'
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AdminLoginResponse'
                }
              }
            }
          },
          400: {
            description: 'Missing email or password',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          401: {
            description: 'Invalid credentials',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          403: {
            description: 'Admin account is inactive',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/auth/forgot-password': {
      post: {
        tags: ['Authentication'],
        summary: 'Forgot Password - Request OTP',
        description: 'Generates a 6-digit OTP and dispatches it to the registered Admin email address. Responds with consistent anti-enumeration message.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ForgotPasswordRequest'
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Verification OTP dispatched',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/GenericSuccessResponse'
                }
              }
            }
          },
          400: {
            description: 'Invalid email address',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          429: {
            description: 'Resend cooldown in effect (60s)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/auth/resend-otp': {
      post: {
        tags: ['Authentication'],
        summary: 'Resend Password Reset OTP',
        description: 'Issues a fresh 6-digit OTP code subject to a 60-second cooldown period.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ResendOtpRequest'
              }
            }
          }
        },
        responses: {
          200: {
            description: 'New OTP dispatched',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/GenericSuccessResponse' }
              }
            }
          },
          429: {
            description: 'Cooldown period active (wait 60s)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/auth/verify-otp': {
      post: {
        tags: ['Authentication'],
        summary: 'Verify 6-Digit OTP',
        description: 'Validates the submitted OTP against the stored cryptographic hash. Returns a short-lived reset token upon success.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/VerifyOtpRequest'
              }
            }
          }
        },
        responses: {
          200: {
            description: 'OTP verified successfully; resetToken issued',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/VerifyOtpResponse'
                }
              }
            }
          },
          400: {
            description: 'Invalid or expired OTP',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          429: {
            description: 'Maximum attempts (5) exceeded',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/auth/reset-password': {
      post: {
        tags: ['Authentication'],
        summary: 'Set New Password',
        description: 'Updates the Admin password using the verified reset token. Hashes new password with bcrypt and invalidates the reset session.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ResetPasswordRequest'
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Password reset successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/GenericSuccessResponse'
                }
              }
            }
          },
          400: {
            description: 'Invalid/expired token, password mismatch, or weak password',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/superadmin/admins': {
      post: {
        tags: ['Super Admin - Admins'],
        summary: 'Create a new Admin',
        description: 'Allows authenticated Super Admin to create a new Admin account.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CreateAdminRequest'
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Admin created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Admin created successfully' },
                    admin: { $ref: '#/components/schemas/AdminResponse' }
                  }
                }
              }
            }
          },
          400: {
            description: 'Validation error (missing fields or password < 6 characters)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          401: {
            description: 'Unauthorized (token missing or invalid)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          403: {
            description: 'Forbidden (Super Admin role required)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          409: {
            description: 'Username already exists',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      },
      get: {
        tags: ['Super Admin - Admins'],
        summary: 'Get all Admins',
        description: 'Retrieve a list of all Admin accounts (passwords excluded).',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'List of admins',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    admins: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/AdminResponse'
                      }
                    }
                  }
                }
              }
            }
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          403: {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/superadmin/admins/{adminId}': {
      get: {
        tags: ['Super Admin - Admins'],
        summary: 'Get single Admin by ID',
        description: 'Retrieve details of a specific Admin by their MongoDB ID.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'adminId',
            in: 'path',
            required: true,
            description: 'MongoDB ObjectId of the Admin',
            schema: {
              type: 'string',
              example: '66f3a987b654c321d012e999'
            }
          }
        ],
        responses: {
          200: {
            description: 'Admin details found',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    admin: { $ref: '#/components/schemas/AdminResponse' }
                  }
                }
              }
            }
          },
          400: {
            description: 'Invalid Admin ID format',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          403: {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          404: {
            description: 'Admin not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      },
      put: {
        tags: ['Super Admin - Admins'],
        summary: 'Update an Admin',
        description: 'Update fields for an Admin (username, name, email, phone, password). Role and createdBy cannot be modified.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'adminId',
            in: 'path',
            required: true,
            description: 'MongoDB ObjectId of the Admin',
            schema: {
              type: 'string',
              example: '66f3a987b654c321d012e999'
            }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/UpdateAdminRequest'
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Admin updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Admin updated successfully' },
                    admin: { $ref: '#/components/schemas/AdminResponse' }
                  }
                }
              }
            }
          },
          400: {
            description: 'Invalid input or invalid ID format',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          403: {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          404: {
            description: 'Admin not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          409: {
            description: 'New username already taken by another admin',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      },
      delete: {
        tags: ['Super Admin - Admins'],
        summary: 'Delete an Admin',
        description: 'Permanently delete an Admin account.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'adminId',
            in: 'path',
            required: true,
            description: 'MongoDB ObjectId of the Admin',
            schema: {
              type: 'string',
              example: '66f3a987b654c321d012e999'
            }
          }
        ],
        responses: {
          200: {
            description: 'Admin deleted successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Admin deleted successfully' }
                  }
                }
              }
            }
          },
          400: {
            description: 'Invalid Admin ID format',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          403: {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          404: {
            description: 'Admin not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/superadmin/admins/{adminId}/status': {
      patch: {
        tags: ['Super Admin - Admins'],
        summary: 'Activate or Inactivate an Admin',
        description: 'Change the status of an Admin to either "active" or "inactive".',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'adminId',
            in: 'path',
            required: true,
            description: 'MongoDB ObjectId of the Admin',
            schema: {
              type: 'string',
              example: '66f3a987b654c321d012e999'
            }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/UpdateAdminStatusRequest'
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Status updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Admin status updated to inactive' },
                    admin: { $ref: '#/components/schemas/AdminResponse' }
                  }
                }
              }
            }
          },
          400: {
            description: 'Invalid status or invalid Admin ID format',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          403: {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          404: {
            description: 'Admin not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/v1/finance-book/active': {
      get: {
        tags: ['Finance Book Ledger'],
        summary: 'Get active Finance Book ledger',
        description: 'Retrieves the complete active ledger book, installment date columns, borrower rows, payment cells, and calculated grand totals.',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Active ledger retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FinanceBookActiveResponse' }
              }
            }
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          403: {
            description: 'Forbidden - Authorized Staff or Admin only',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/v1/finance-book/batch-save': {
      post: {
        tags: ['Finance Book Ledger'],
        summary: 'Batch save complete staged ledger state',
        description: 'Saves date columns, borrower rows, and installment payments atomically in a single request. Recalculates balances and logs audit action.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/BatchSaveRequest' }
            }
          }
        },
        responses: {
          200: {
            description: 'Ledger changes saved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FinanceBookActiveResponse' }
              }
            }
          },
          400: {
            description: 'Invalid batch payload',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          409: {
            description: 'Conflict - Stale ledger version',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/v1/finance-book/columns': {
      post: {
        tags: ['Finance Book Ledger'],
        summary: 'Add next installment column',
        description: 'Calculates the next weekly date (+7 days) from the last column and adds a sequential date column with Telugu installment label.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  ledgerBookId: { type: 'string', example: '66f3a987b654c321d012e111' }
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Installment column added successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Installment column added successfully' },
                    data: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', example: '66f3b000a123b456c789d001' },
                        columnIndex: { type: 'number', example: 3 },
                        headerDate: { type: 'string', example: '29-08' },
                        labelTelugu: { type: 'string', example: 'వాయిదా 4' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/v1/finance-book/columns/{index}': {
      delete: {
        tags: ['Finance Book Ledger'],
        summary: 'Delete installment column',
        description: 'Deletes the target column, removes its installment payments, shifts higher column indexes and payment indexes down by 1 atomically.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'index',
            in: 'path',
            required: true,
            description: 'Column index to delete',
            schema: { type: 'integer', example: 1 }
          },
          {
            name: 'ledgerBookId',
            in: 'query',
            description: 'Optional ledger book ID',
            schema: { type: 'string' }
          }
        ],
        responses: {
          200: {
            description: 'Column deleted and shifted successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Column index 1 deleted successfully and remaining columns shifted' },
                    data: {
                      type: 'object',
                      properties: {
                        deletedColumnIndex: { type: 'number', example: 1 },
                        remainingColumnsCount: { type: 'number', example: 2 }
                      }
                    }
                  }
                }
              }
            }
          },
          404: {
            description: 'Column index not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/v1/finance-book/rows': {
      post: {
        tags: ['Finance Book Ledger'],
        summary: 'Create borrower row',
        description: 'Adds a new borrower row, calculates initialRemaining (P * 1.20 * 1.05), assigns sequential sNo, and synchronizes with FinanceRecord.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateBorrowerRowRequest' }
            }
          }
        },
        responses: {
          201: {
            description: 'Borrower row created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Borrower row created successfully' },
                    data: { $ref: '#/components/schemas/LedgerBorrowerRowResponse' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/v1/finance-book/rows/{id}': {
      patch: {
        tags: ['Finance Book Ledger'],
        summary: 'Update borrower row',
        description: 'Updates borrower details, handles principal adjustments, recalculates initial remaining, or applies +5% target increment.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Borrower row ObjectId',
            schema: { type: 'string', example: '66f3b111a123b456c789d001' }
          }
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateBorrowerRowRequest' }
            }
          }
        },
        responses: {
          200: {
            description: 'Borrower row updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Borrower row updated successfully' },
                    data: { $ref: '#/components/schemas/LedgerBorrowerRowResponse' }
                  }
                }
              }
            }
          }
        }
      },
      delete: {
        tags: ['Finance Book Ledger'],
        summary: 'Delete borrower row',
        description: 'Deletes the borrower row, associated payments, and automatically renumbers subsequent rows (sNo - 1).',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Borrower row ObjectId',
            schema: { type: 'string', example: '66f3b111a123b456c789d001' }
          }
        ],
        responses: {
          200: {
            description: 'Borrower row deleted successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Borrower row deleted successfully and serial numbers renumbered' },
                    data: {
                      type: 'object',
                      properties: {
                        deletedRowId: { type: 'string', example: '66f3b111a123b456c789d001' },
                        deletedSNo: { type: 'number', example: 1 },
                        remainingRowsCount: { type: 'number', example: 3 }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/v1/finance-book/rows/{id}/status': {
      patch: {
        tags: ['Finance Book Ledger'],
        summary: 'Close or reopen borrower account',
        description: 'Validates financial closure rules (remainingBalance <= 0 AND totalPaid > 0) before closing the borrower account.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Borrower row ObjectId',
            schema: { type: 'string', example: '66f3b111a123b456c789d001' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateBorrowerStatusRequest' }
            }
          }
        },
        responses: {
          200: {
            description: 'Account status updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Account closed successfully' },
                    data: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', example: '66f3b111a123b456c789d001' },
                        sNo: { type: 'number', example: 1 },
                        nameTelugu: { type: 'string', example: 'కృష్ణారావు' },
                        isClosed: { type: 'boolean', example: true },
                        totalPaid: { type: 'number', example: 18900 },
                        remainingBalance: { type: 'number', example: 0 }
                      }
                    }
                  }
                }
              }
            }
          },
          400: {
            description: 'Closure validation failed (remaining balance > 0 or total paid <= 0)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/v1/auth/employee/login': {
      post: {
        tags: ['Employee Portal'],
        summary: 'Employee portal login',
        description: 'Authenticates active employees using email and bcrypt password. Returns JWT containing employeeId and tokenVersion.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/EmployeeLoginRequest' }
            }
          }
        },
        responses: {
          200: {
            description: 'Employee login successful',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/EmployeeLoginResponse' }
              }
            }
          },
          401: {
            description: 'Invalid credentials',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          403: {
            description: 'Employee account is inactive',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/v1/admin/employees': {
      get: {
        tags: ['Admin - Employee Management'],
        summary: 'List employees with search and filters',
        description: 'Lists active employees with optional search, village filter, area filter, status filter, and pagination.',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search by employeeId, name, phone, email, village' },
          { name: 'village', in: 'query', schema: { type: 'string' }, description: 'Filter by village' },
          { name: 'assignedOperationalArea', in: 'query', schema: { type: 'string' }, description: 'Filter by operational area' },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['Active', 'Inactive'] }, description: 'Filter by status' },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 }, description: 'Page number' },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 }, description: 'Items per page' }
        ],
        responses: {
          200: {
            description: 'Employees retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Employees retrieved successfully' },
                    data: {
                      type: 'object',
                      properties: {
                        employees: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/EmployeeResponse' }
                        },
                        pagination: {
                          type: 'object',
                          properties: {
                            total: { type: 'integer', example: 1 },
                            page: { type: 'integer', example: 1 },
                            limit: { type: 'integer', example: 10 },
                            totalPages: { type: 'integer', example: 1 }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          401: { description: 'Unauthorized' },
          403: { description: 'Forbidden - Admin only' }
        }
      },
      post: {
        tags: ['Admin - Employee Management'],
        summary: 'Create employee',
        description: 'Admin creates a new employee account with initial password, assigned operational area, and auto-generated EMP### ID.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateEmployeeRequest' }
            }
          }
        },
        responses: {
          201: {
            description: 'Employee created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Employee created successfully' },
                    data: {
                      type: 'object',
                      properties: {
                        employee: { $ref: '#/components/schemas/EmployeeResponse' }
                      }
                    }
                  }
                }
              }
            }
          },
          400: { description: 'Validation error' },
          409: { description: 'Duplicate employee email or employeeId' }
        }
      }
    },
    '/api/v1/admin/employees/{id}': {
      put: {
        tags: ['Admin - Employee Management'],
        summary: 'Update employee profile',
        description: 'Updates employee details (does NOT allow password updates through this endpoint).',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, description: 'Employee ObjectId', schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateEmployeeRequest' }
            }
          }
        },
        responses: {
          200: {
            description: 'Employee updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Employee updated successfully' },
                    data: {
                      type: 'object',
                      properties: {
                        employee: { $ref: '#/components/schemas/EmployeeResponse' }
                      }
                    }
                  }
                }
              }
            }
          },
          404: { description: 'Employee not found' },
          409: { description: 'Email conflict' }
        }
      },
      delete: {
        tags: ['Admin - Employee Management'],
        summary: 'Archive/Delete employee',
        description: 'Soft deletes / archives an employee and immediately revokes their active sessions.',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, description: 'Employee ObjectId', schema: { type: 'string' } }
        ],
        responses: {
          200: {
            description: 'Employee archived successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Employee archived successfully' }
                  }
                }
              }
            }
          },
          404: { description: 'Employee not found' }
        }
      }
    },
    '/api/v1/admin/employees/{id}/status': {
      patch: {
        tags: ['Admin - Employee Management'],
        summary: 'Change employee status',
        description: 'Toggles status between Active and Inactive. When deactivating (Active -> Inactive), tokenVersion is incremented to revoke active JWT sessions immediately.',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, description: 'Employee ObjectId', schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateEmployeeStatusRequest' }
            }
          }
        },
        responses: {
          200: {
            description: 'Status changed successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Employee status changed to Inactive successfully' },
                    data: {
                      type: 'object',
                      properties: {
                        employee: { $ref: '#/components/schemas/EmployeeResponse' }
                      }
                    }
                  }
                }
              }
            }
          },
          400: { description: 'Invalid status' },
          404: { description: 'Employee not found' }
        }
      }
    },
    '/api/v1/admin/employees/{id}/reset-password': {
      post: {
        tags: ['Admin - Employee Management'],
        summary: 'Admin resets employee password',
        description: 'Direct Admin password reset. Hashes the new password with bcrypt and increments tokenVersion to revoke all existing sessions immediately.',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, description: 'Employee ObjectId', schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ResetEmployeePasswordRequest' }
            }
          }
        },
        responses: {
          200: {
            description: 'Employee password reset successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Employee password reset successfully' }
                  }
                }
              }
            }
          },
          400: { description: 'Invalid new password format' },
          404: { description: 'Employee not found' }
        }
      }
    },
    '/api/v1/employee/profile': {
      get: {
        tags: ['Employee Portal'],
        summary: 'Get employee profile',
        description: 'Returns authenticated employee profile details.',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Profile retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Employee profile retrieved successfully' },
                    data: {
                      type: 'object',
                      properties: {
                        profile: { $ref: '#/components/schemas/EmployeeResponse' }
                      }
                    }
                  }
                }
              }
            }
          },
          401: { description: 'Unauthorized or tokenVersion revoked' }
        }
      }
    },
    '/api/v1/employee/assigned-borrowers': {
      get: {
        tags: ['Employee Portal'],
        summary: 'Get assigned borrowers',
        description: 'Returns active borrowers assigned to the authenticated employee operational area.',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Assigned borrowers retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Assigned borrowers retrieved successfully' },
                    data: {
                      type: 'object',
                      properties: {
                        borrowers: {
                          type: 'array',
                          items: { type: 'object' }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          401: { description: 'Unauthorized or tokenVersion revoked' }
        }
      }
    },
    '/api/v1/employee/collections': {
      post: {
        tags: ['Employee Portal'],
        summary: 'Record borrower installment collection',
        description: 'Records daily/weekly field collection from assigned borrower. Updates financial balance and sets collectedBy to authenticated employee.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RecordCollectionRequest' }
            }
          }
        },
        responses: {
          201: {
            description: 'Collection recorded successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Collection recorded successfully' },
                    data: { type: 'object' }
                  }
                }
              }
            }
          },
          400: { description: 'Invalid amount or closed borrower account' },
          404: { description: 'Borrower record not found' }
        }
      }
    },
    '/api/audit-logs': {
      get: {
        tags: ['Audit Logs'],
        summary: 'Query audit logs with pagination, multi-field filtering, and safe search',
        description: 'Retrieves audit records chronologically (newest first). Supported by Admins and Super Admins. Returns pagination metadata and masked sensitive credentials.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'page',
            in: 'query',
            description: 'Page number (default 1)',
            required: false,
            schema: { type: 'integer', default: 1 }
          },
          {
            name: 'limit',
            in: 'query',
            description: 'Items per page (default 25, max 100)',
            required: false,
            schema: { type: 'integer', default: 25, maximum: 100 }
          },
          {
            name: 'userId',
            in: 'query',
            description: 'Filter logs by actor userId (username, employeeId, or ObjectId)',
            required: false,
            schema: { type: 'string' }
          },
          {
            name: 'userRole',
            in: 'query',
            description: 'Filter logs by actor userRole (superadmin, admin, employee)',
            required: false,
            schema: { type: 'string' }
          },
          {
            name: 'action',
            in: 'query',
            description: 'Filter by action (CREATE, UPDATE, DELETE, LOGIN, LOGIN_FAILED, STATUS_CHANGE, PASSWORD_RESET, ADD_COLUMN, REMOVE_COLUMN, etc.)',
            required: false,
            schema: { type: 'string' }
          },
          {
            name: 'entityType',
            in: 'query',
            description: 'Filter by affected entity type (Admin, Employee, FinanceRecord, LedgerBorrowerRow, LedgerDateColumn, FinanceBook, Auth)',
            required: false,
            schema: { type: 'string' }
          },
          {
            name: 'entityId',
            in: 'query',
            description: 'Filter by affected entity identifier or ObjectId',
            required: false,
            schema: { type: 'string' }
          },
          {
            name: 'startDate',
            in: 'query',
            description: 'Start of date range (ISO date: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)',
            required: false,
            schema: { type: 'string' }
          },
          {
            name: 'endDate',
            in: 'query',
            description: 'End of date range (ISO date: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)',
            required: false,
            schema: { type: 'string' }
          },
          {
            name: 'search',
            in: 'query',
            description: 'Free-text search across userId, action, entityType, entityId, and ipAddress',
            required: false,
            schema: { type: 'string' }
          }
        ],
        responses: {
          200: {
            description: 'Paginated audit logs successfully retrieved',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuditLogListResponse' }
              }
            }
          },
          400: {
            description: 'Invalid query parameters or date format',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          401: {
            description: 'Unauthorized - Missing or invalid Bearer token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          403: {
            description: 'Forbidden - Insufficient permissions (Requires Admin or Super Admin role)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          500: {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      },
      delete: {
        tags: ['Audit Logs'],
        summary: 'Permanently clear all audit logs (Super Admin only)',
        description: 'Permanently clears all audit logs from the auditlogs collection while preserving collection structure and indexes. Requires Super Admin authentication and exact confirmation token "CLEAR_ALL_AUDIT_LOGS". Action is immutably recorded in systemsecuritylogs. Normal Admins receive 403 Forbidden.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['confirmation'],
                properties: {
                  confirmation: {
                    type: 'string',
                    example: 'CLEAR_ALL_AUDIT_LOGS',
                    description: 'Must be exactly "CLEAR_ALL_AUDIT_LOGS"'
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Audit logs cleared successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Audit logs cleared successfully' },
                    deletedCount: { type: 'integer', example: 71 }
                  }
                }
              }
            }
          },
          400: {
            description: 'Confirmation required or invalid confirmation value',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          401: {
            description: 'Unauthorized - Missing or invalid Bearer token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          403: {
            description: 'Forbidden - Access denied. Super Admin only.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          500: {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/audit-logs/{id}': {
      get: {
        tags: ['Audit Logs'],
        summary: 'Get audit log details by ID',
        description: 'Returns the complete audit log document including before/after change diffs and network metadata.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'MongoDB ObjectId of the audit log record',
            schema: { type: 'string', example: '66f4c222b123c456d789e001' }
          }
        ],
        responses: {
          200: {
            description: 'Audit log record details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuditLogDetailResponse' }
              }
            }
          },
          400: {
            description: 'Invalid Audit Log ID format',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          401: {
            description: 'Unauthorized - Missing or invalid Bearer token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          403: {
            description: 'Forbidden - Requires Admin or Super Admin role',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          404: {
            description: 'Audit log record not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          500: {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    }
  }
};


