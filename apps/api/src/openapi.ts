const spec = {
  openapi: "3.0.3",
  info: {
    title: "Flowbit Analytics API",
    version: "0.1.0",
    description: "REST API for dashboard data and Chat-with-Data proxy",
  },
  servers: [{ url: "http://localhost:4000" }],
  paths: {
    "/health": {
      get: {
        summary: "Health check",
        responses: { "200": { description: "OK" } },
      },
    },
    "/stats": {
      get: {
        summary: "Dashboard stats",
        responses: {
          "200": {
            description: "Stats payload",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    totalSpendYTD: { type: "number" },
                    totalInvoicesProcessed: { type: "integer" },
                    documentsUploaded: { type: "integer" },
                    averageInvoiceValue: { type: "number" },
                  },
                  required: [
                    "totalSpendYTD",
                    "totalInvoicesProcessed",
                    "documentsUploaded",
                    "averageInvoiceValue",
                  ],
                },
              },
            },
          },
        },
      },
    },
    "/invoice-trends": {
      get: {
        summary: "Monthly invoice count and spend",
        responses: {
          "200": {
            description: "Array of monthly points",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      month: { type: "string", example: "2024-01" },
                      invoice_count: { type: "integer" },
                      total_spend: { type: "number" },
                    },
                    required: ["month", "invoice_count", "total_spend"],
                  },
                },
              },
            },
          },
        },
      },
    },
    "/vendors/top10": {
      get: {
        summary: "Top vendors by spend",
        responses: {
          "200": {
            description: "Top 10 vendors",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      vendor: { type: "string" },
                      spend: { type: "number" },
                    },
                    required: ["vendor", "spend"],
                  },
                },
              },
            },
          },
        },
      },
    },
    "/category-spend": {
      get: {
        summary: "Spend by category",
        responses: {
          "200": {
            description: "Category aggregation",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      category: { type: "string" },
                      amount: { type: "number" },
                    },
                    required: ["category", "amount"],
                  },
                },
              },
            },
          },
        },
      },
    },
    "/cash-outflow": {
      get: {
        summary: "Upcoming cash outflow by day",
        parameters: [
          { name: "start", in: "query", schema: { type: "string" } },
          { name: "end", in: "query", schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Per-day outflow",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      date: { type: "string", example: "2024-01-01" },
                      outflow: { type: "number" },
                    },
                    required: ["date", "outflow"],
                  },
                },
              },
            },
          },
        },
      },
    },
    "/invoices": {
      get: {
        summary: "Paginated invoices",
        parameters: [
          { name: "q", in: "query", schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "pageSize", in: "query", schema: { type: "integer", default: 20 } },
          { name: "sort", in: "query", schema: { type: "string", example: "invoiceDate:desc" } },
        ],
        responses: {
          "200": {
            description: "Page of invoices",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    page: { type: "integer" },
                    pageSize: { type: "integer" },
                    total: { type: "integer" },
                    items: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "integer" },
                          vendor: { type: "string", nullable: true },
                          invoiceDate: { type: "string", nullable: true },
                          invoiceNumber: { type: "string", nullable: true },
                          amount: { type: "number", nullable: true },
                          status: { type: "string", nullable: true },
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
    "/chat-with-data": {
      post: {
        summary: "Proxy to Vanna service",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", properties: { prompt: { type: "string" } }, required: ["prompt"] },
            },
          },
        },
        responses: {
          "200": {
            description: "SQL + rows returned by Vanna",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    sql: { type: "string" },
                    columns: { type: "array", items: { type: "string" } },
                    rows: { type: "array", items: { type: "array", items: {} } },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

export default spec;