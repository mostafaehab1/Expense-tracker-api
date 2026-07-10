/**
 * Hand-written OpenAPI 3.0 document, served by swagger-ui-express at /docs.
 * Kept in one place so the docs are a single source of truth reviewers can read.
 */
export const openapiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Expense Tracker API',
    version: '1.0.0',
    description:
      'REST API for personal expense tracking. JWT auth, per-user isolation, and ' +
      'MongoDB-aggregation reports. All money fields are in major units (e.g. 19.99).',
  },
  servers: [{ url: '/api/v1', description: 'API v1' }],
  tags: [
    { name: 'Auth' },
    { name: 'Categories' },
    { name: 'Expenses' },
    { name: 'Budgets' },
    { name: 'Reports' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string' },
              details: { type: 'array', items: { type: 'object' } },
            },
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          user: { $ref: '#/components/schemas/User' },
          token: { type: 'string' },
        },
      },
      Category: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string', example: 'Food' },
          color: { type: 'string', example: '#FF8800' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Expense: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          amount: { type: 'number', example: 19.99 },
          currency: { type: 'string', example: 'USD' },
          description: { type: 'string' },
          date: { type: 'string', format: 'date-time' },
          categoryId: { type: 'string' },
          category: { $ref: '#/components/schemas/Category' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Budget: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          categoryId: { type: 'string' },
          month: { type: 'string', example: '2026-07' },
          amount: { type: 'number', example: 500 },
          currency: { type: 'string', example: 'USD' },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          limit: { type: 'integer' },
          total: { type: 'integer' },
          totalPages: { type: 'integer' },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'name'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                  name: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Created',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } },
            },
          },
          '409': { description: 'Email already registered', content: errContent() },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } },
            },
          },
          '401': { description: 'Invalid credentials', content: errContent() },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Current user',
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { user: { $ref: '#/components/schemas/User' } },
                },
              },
            },
          },
          '401': { description: 'Unauthenticated', content: errContent() },
        },
      },
    },
    '/categories': {
      get: {
        tags: ['Categories'],
        summary: 'List categories',
        responses: { '200': listOf('Category') },
      },
      post: {
        tags: ['Categories'],
        summary: 'Create a category',
        requestBody: bodyOf({
          required: ['name'],
          properties: { name: { type: 'string' }, color: { type: 'string', example: '#FF8800' } },
        }),
        responses: {
          '201': itemOf('Category'),
          '409': { description: 'Duplicate name', content: errContent() },
        },
      },
    },
    '/categories/{id}': {
      parameters: [idParam()],
      get: {
        tags: ['Categories'],
        summary: 'Get a category',
        responses: { '200': itemOf('Category'), '404': notFound() },
      },
      patch: {
        tags: ['Categories'],
        summary: 'Update a category',
        requestBody: bodyOf({
          properties: { name: { type: 'string' }, color: { type: 'string' } },
        }),
        responses: { '200': itemOf('Category'), '404': notFound() },
      },
      delete: {
        tags: ['Categories'],
        summary: 'Delete a category',
        responses: {
          '204': { description: 'Deleted' },
          '409': { description: 'Category in use', content: errContent() },
          '404': notFound(),
        },
      },
    },
    '/expenses': {
      get: {
        tags: ['Expenses'],
        summary: 'List expenses (paginated, filterable, sortable)',
        parameters: [
          q('page', 'integer'),
          q('limit', 'integer'),
          q('from', 'string', 'date-time'),
          q('to', 'string', 'date-time'),
          q('categoryId', 'string'),
          q('minAmount', 'number'),
          q('maxAmount', 'number'),
          q('q', 'string'),
          q('currency', 'string'),
          q('sort', 'string'),
          q('order', 'string'),
        ],
        responses: { '200': paginatedOf('Expense') },
      },
      post: {
        tags: ['Expenses'],
        summary: 'Create an expense',
        requestBody: bodyOf({
          required: ['amount', 'categoryId'],
          properties: {
            amount: { type: 'number', example: 19.99 },
            categoryId: { type: 'string' },
            description: { type: 'string' },
            date: { type: 'string', format: 'date-time' },
            currency: { type: 'string', example: 'USD' },
          },
        }),
        responses: {
          '201': itemOf('Expense'),
          '400': { description: 'Validation error', content: errContent() },
        },
      },
    },
    '/expenses/{id}': {
      parameters: [idParam()],
      get: {
        tags: ['Expenses'],
        summary: 'Get an expense',
        responses: { '200': itemOf('Expense'), '404': notFound() },
      },
      patch: {
        tags: ['Expenses'],
        summary: 'Update an expense',
        requestBody: bodyOf({
          properties: {
            amount: { type: 'number' },
            categoryId: { type: 'string' },
            description: { type: 'string' },
            date: { type: 'string', format: 'date-time' },
            currency: { type: 'string' },
          },
        }),
        responses: { '200': itemOf('Expense'), '404': notFound() },
      },
      delete: {
        tags: ['Expenses'],
        summary: 'Delete an expense',
        responses: { '204': { description: 'Deleted' }, '404': notFound() },
      },
    },
    '/budgets': {
      get: {
        tags: ['Budgets'],
        summary: 'List budgets',
        parameters: [q('month', 'string')],
        responses: { '200': listOf('Budget') },
      },
      post: {
        tags: ['Budgets'],
        summary: 'Create a budget',
        requestBody: bodyOf({
          required: ['categoryId', 'month', 'amount'],
          properties: {
            categoryId: { type: 'string' },
            month: { type: 'string', example: '2026-07' },
            amount: { type: 'number', example: 500 },
            currency: { type: 'string', example: 'USD' },
          },
        }),
        responses: {
          '201': itemOf('Budget'),
          '409': { description: 'Duplicate budget', content: errContent() },
        },
      },
    },
    '/budgets/{id}': {
      parameters: [idParam()],
      patch: {
        tags: ['Budgets'],
        summary: 'Update a budget',
        requestBody: bodyOf({
          properties: { amount: { type: 'number' }, currency: { type: 'string' } },
        }),
        responses: { '200': itemOf('Budget'), '404': notFound() },
      },
      delete: {
        tags: ['Budgets'],
        summary: 'Delete a budget',
        responses: { '204': { description: 'Deleted' }, '404': notFound() },
      },
    },
    '/reports/monthly': {
      get: {
        tags: ['Reports'],
        summary: 'Total spend per month for a year',
        parameters: [q('year', 'integer'), q('currency', 'string')],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: { month: { type: 'string' }, total: { type: 'number' } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/reports/by-category': {
      get: {
        tags: ['Reports'],
        summary: 'Spend grouped by category',
        parameters: [
          q('from', 'string', 'date-time'),
          q('to', 'string', 'date-time'),
          q('currency', 'string'),
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          categoryId: { type: 'string' },
                          name: { type: 'string' },
                          total: { type: 'number' },
                          count: { type: 'integer' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/reports/budget-vs-actual': {
      get: {
        tags: ['Reports'],
        summary: 'Budget vs actual spend for a month',
        parameters: [q('month', 'string'), q('currency', 'string')],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          categoryId: { type: 'string' },
                          name: { type: 'string' },
                          budget: { type: 'number' },
                          actual: { type: 'number' },
                          remaining: { type: 'number' },
                          percentUsed: { type: 'number' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

// --- small helpers to keep the paths above readable ---
function errContent() {
  return { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } };
}
function notFound() {
  return { description: 'Not found', content: errContent() };
}
function itemOf(schema: string) {
  return {
    description: 'OK',
    content: { 'application/json': { schema: { $ref: `#/components/schemas/${schema}` } } },
  };
}
function listOf(schema: string) {
  return {
    description: 'OK',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            data: { type: 'array', items: { $ref: `#/components/schemas/${schema}` } },
          },
        },
      },
    },
  };
}
function paginatedOf(schema: string) {
  return {
    description: 'OK',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            data: { type: 'array', items: { $ref: `#/components/schemas/${schema}` } },
            pagination: { $ref: '#/components/schemas/Pagination' },
          },
        },
      },
    },
  };
}
function bodyOf(schema: object) {
  return {
    required: true,
    content: { 'application/json': { schema: { type: 'object', ...schema } } },
  };
}
function idParam() {
  return { name: 'id', in: 'path', required: true, schema: { type: 'string' } };
}
function q(name: string, type: string, format?: string) {
  const schema: Record<string, string> = { type };
  if (format) schema.format = format;
  return { name, in: 'query', required: false, schema };
}
