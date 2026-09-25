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
      description: 'Super Admin login & JWT generation'
    },
    {
      name: 'Super Admin - Admins',
      description: 'Admin management endpoints (Super Admin only)'
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
    }
  }
};
