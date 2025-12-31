# MCP Protocol Patterns for Guardrail-Sim

**Purpose:** Reference for MCP server implementation patterns
**Based on:** logpare-MCP experience + official MCP specification
**Status:** Reference Documentation (Implementation Pending)
**Last Updated:** December 30, 2025

> **Note:** This document describes target MCP implementation patterns. The `@guardrail-sim/mcp-server` package is currently a stub — these patterns will guide its implementation.

---

## Overview

Model Context Protocol (MCP) is an open standard for connecting AI assistants to external tools and data sources. Guardrail-Sim exposes pricing policy evaluation as an MCP tool that any compatible AI agent can call.

---

## MCP Architecture Basics

### How MCP Works

```text
┌─────────────────┐         ┌─────────────────┐
│                 │         │                 │
│   AI AGENT      │◄───────►│   MCP SERVER    │
│   (Claude,      │  JSON   │   (Your Tool)   │
│    GPT, etc.)   │  RPC    │                 │
│                 │         │                 │
└─────────────────┘         └─────────────────┘
        │                           │
        │ Natural Language          │ Tool Logic
        ▼                           ▼
┌─────────────────┐         ┌─────────────────┐
│      User       │         │   Your APIs/    │
│                 │         │   Databases     │
└─────────────────┘         └─────────────────┘
```

### Key Concepts

**Server:** Exposes tools, resources, and prompts
**Client:** The AI agent that calls the server
**Transport:** How they communicate (stdio, HTTP/SSE, WebSocket)
**Tools:** Functions the AI can call (like `evaluate_policy`)
**Resources:** Data the AI can read (like policy documents)
**Prompts:** Reusable prompt templates

---

## Transport Options

### stdio (Local Development)

Best for: Claude Desktop, local testing

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server(
  { name: 'guardrail-sim', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// ... register handlers ...

const transport = new StdioServerTransport();
await server.connect(transport);
```

Configuration (Claude Desktop `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "guardrail-sim": {
      "command": "node",
      "args": ["/path/to/guardrail-sim/dist/index.js"],
      "env": {
        "SUPABASE_URL": "...",
        "SUPABASE_KEY": "..."
      }
    }
  }
}
```

### HTTP + SSE (Production/Remote)

Best for: Deployed servers, multi-client access

```typescript
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';

const app = express();

app.get('/sse', async (req, res) => {
  const transport = new SSEServerTransport('/messages', res);
  await server.connect(transport);
});

app.post('/messages', async (req, res) => {
  // Handle incoming messages
});

app.listen(3001);
```

### For Guardrail-Sim

**Development:** stdio (test with Claude Desktop)
**Production:** HTTP + SSE (deployed on Railway)

---

## Tool Definition Patterns

### Basic Tool Structure

```typescript
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'tool_name',
      description: 'Clear description of what this tool does and when to use it',
      inputSchema: {
        type: 'object',
        properties: {
          // Parameters the tool accepts
        },
        required: ['required_param'],
      },
    },
  ],
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'tool_name':
      return handleToolName(args);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});
```

### Guardrail-Sim Tool Definitions

```typescript
const TOOLS = [
  {
    name: 'evaluate_policy',
    description: `Evaluate a proposed discount against the active pricing policy.
    
Use this tool when:
- A B2B buyer requests a discount
- You need to check if a discount is allowed before committing
- You want to understand the policy constraints for negotiation

Returns: approved, rejected, escalate, or counter_offer with reasoning.`,
    inputSchema: {
      type: 'object',
      properties: {
        order: {
          type: 'object',
          description: 'The order details for evaluation',
          properties: {
            order_value: {
              type: 'number',
              description: 'Total order value in dollars',
            },
            quantity: {
              type: 'number',
              description: 'Total units in the order',
            },
            customer_segment: {
              type: 'string',
              enum: ['new', 'bronze', 'silver', 'gold', 'platinum'],
              description: 'Customer tier/segment',
            },
            product_margin: {
              type: 'number',
              description: 'Base margin as decimal (0.40 = 40%)',
            },
          },
          required: ['order_value', 'quantity', 'product_margin'],
        },
        proposed_discount: {
          type: 'number',
          description: 'Requested discount as decimal (0.15 = 15% off)',
        },
        policy_id: {
          type: 'string',
          description: 'Optional: specific policy ID. Uses active policy if omitted.',
        },
      },
      required: ['order', 'proposed_discount'],
    },
  },

  {
    name: 'get_policy_summary',
    description: `Get a human-readable summary of the active policy rules.
    
Use this tool when:
- You need to explain discount limits to a buyer
- You want to understand what discounts are possible
- Preparing for a negotiation`,
    inputSchema: {
      type: 'object',
      properties: {
        policy_id: {
          type: 'string',
          description: 'Optional: specific policy ID',
        },
      },
    },
  },

  {
    name: 'log_negotiation_outcome',
    description: `Log the final outcome of a negotiation for audit trail.
    
Use this tool when:
- A negotiation concludes (accepted, rejected, or abandoned)
- You want to record what discount was agreed upon`,
    inputSchema: {
      type: 'object',
      properties: {
        order_id: { type: 'string' },
        initial_request: { type: 'number' },
        final_discount: { type: 'number' },
        outcome: {
          type: 'string',
          enum: ['accepted', 'rejected', 'escalated', 'abandoned'],
        },
        turns: { type: 'number' },
        notes: { type: 'string' },
      },
      required: ['order_id', 'final_discount', 'outcome'],
    },
  },
];
```

---

## Tool Implementation Patterns

### The evaluate_policy Handler

```typescript
async function handleEvaluatePolicy(args: {
  order: {
    order_value: number;
    quantity: number;
    customer_segment?: string;
    product_margin: number;
  };
  proposed_discount: number;
  policy_id?: string;
}): Promise<ToolResponse> {
  // 1. Get the policy
  const policy = args.policy_id ? await getPolicy(args.policy_id) : await getActivePolicy();

  if (!policy) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: 'No active policy found',
            code: 'NO_POLICY',
          }),
        },
      ],
      isError: true,
    };
  }

  // 2. Run through rules engine
  const engine = buildEngine(policy.rules);
  const facts = {
    order_value: args.order.order_value,
    quantity: args.order.quantity,
    customer_segment: args.order.customer_segment || 'new',
    product_margin: args.order.product_margin,
    requested_discount: args.proposed_discount,
    calculated_margin: args.order.product_margin - args.proposed_discount,
  };

  const { events } = await engine.run(facts);

  // 3. Determine outcome
  const result = determineOutcome(events, args.proposed_discount, policy);

  // 4. Log evaluation (for audit trail)
  await logEvaluation({
    policy_id: policy.id,
    order: args.order,
    proposed_discount: args.proposed_discount,
    result,
    timestamp: new Date(),
  });

  // 5. Return result
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}
```

### Response Format

```typescript
interface PolicyEvaluationResult {
  decision: 'approved' | 'rejected' | 'escalate' | 'counter_offer';

  // Always included
  requested_discount: number;
  policy_version: string;

  // For approved
  approved_discount?: number;

  // For counter_offer
  counter_offer?: number;
  counter_reason?: string;

  // For rejected/escalate
  rejection_reason?: string;
  escalation_contact?: string;

  // Always included
  constraints: {
    margin_floor: number;
    max_discount: number;
    customer_tier_allowance: number;
  };

  // Audit
  evaluation_id: string;
  timestamp: string;
}
```

---

## Resource Patterns (Optional)

MCP also supports "resources" — read-only data the AI can access:

```typescript
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// List resources
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: 'guardrail://policies/active',
      name: 'Active Policy',
      description: 'The currently active pricing policy',
      mimeType: 'application/json',
    },
    {
      uri: 'guardrail://simulations/latest',
      name: 'Latest Simulation',
      description: 'Results from the most recent simulation run',
      mimeType: 'application/json',
    },
  ],
}));

// Read resource
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  switch (uri) {
    case 'guardrail://policies/active':
      const policy = await getActivePolicy();
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(policy, null, 2),
          },
        ],
      };

    case 'guardrail://simulations/latest':
      const sim = await getLatestSimulation();
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(sim, null, 2),
          },
        ],
      };

    default:
      throw new Error(`Unknown resource: ${uri}`);
  }
});
```

---

## Error Handling Patterns

### Structured Errors

```typescript
class GuardrailError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'GuardrailError';
  }
}

// Usage
throw new GuardrailError('Discount exceeds maximum allowed', 'DISCOUNT_EXCEEDED', {
  requested: 0.35,
  maximum: 0.25,
});
```

### Error Response Format

```typescript
function errorResponse(error: GuardrailError): ToolResponse {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          error: true,
          code: error.code,
          message: error.message,
          details: error.details,
        }),
      },
    ],
    isError: true,
  };
}
```

### Common Error Codes

| Code                  | Meaning                                |
| --------------------- | -------------------------------------- |
| `NO_POLICY`           | No active policy found                 |
| `INVALID_INPUT`       | Required parameters missing/invalid    |
| `DISCOUNT_EXCEEDED`   | Requested discount above maximum       |
| `MARGIN_VIOLATION`    | Discount would push margin below floor |
| `ESCALATION_REQUIRED` | Human approval needed                  |
| `DATABASE_ERROR`      | Supabase connection/query failed       |

---

## Testing with Claude Desktop

### Local Development Setup

1. Build the MCP server:

```bash
npm run build
```

2. Configure Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "guardrail-sim": {
      "command": "node",
      "args": ["/Users/jeff/projects/guardrail-sim/dist/index.js"],
      "env": {
        "SUPABASE_URL": "http://localhost:54321",
        "SUPABASE_KEY": "your-local-key"
      }
    }
  }
}
```

3. Restart Claude Desktop
4. Ask Claude to use the tool:

```text
"I'm negotiating a B2B order. The customer is a Gold tier account
wanting to place a $5,000 order for 100 units. They're asking for
18% discount. The product margin is 40%. Can you check if this
discount is allowed under our policy?"
```

Claude should call `evaluate_policy` and report the result.

---

## Logging & Observability

### Structured Logging

```typescript
import pino from 'pino';

const logger = pino({
  name: 'guardrail-sim',
  level: process.env.LOG_LEVEL || 'info',
});

// Log every tool call
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const startTime = Date.now();
  const { name, arguments: args } = request.params;

  logger.info({ tool: name, args }, 'Tool call received');

  try {
    const result = await handleToolCall(name, args);

    logger.info(
      {
        tool: name,
        duration: Date.now() - startTime,
        success: true,
      },
      'Tool call completed'
    );

    return result;
  } catch (error) {
    logger.error(
      {
        tool: name,
        duration: Date.now() - startTime,
        error: error.message,
      },
      'Tool call failed'
    );

    throw error;
  }
});
```

### Audit Trail for Policy Evaluations

```typescript
interface AuditEntry {
  id: string;
  timestamp: Date;
  tool: string;
  input: Record<string, any>;
  output: Record<string, any>;
  policy_id: string;
  policy_version: string;
  duration_ms: number;
}

async function logAuditEntry(entry: AuditEntry): Promise<void> {
  await supabase.from('audit_log').insert(entry);
}
```

---

## Deployment Configuration

### Railway Deployment

```dockerfile
# Dockerfile
FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist

ENV PORT=3001
EXPOSE 3001

CMD ["node", "dist/index.js"]
```

```yaml
# railway.toml
[build]
builder = "dockerfile"

[deploy]
startCommand = "node dist/index.js"
healthcheckPath = "/health"
healthcheckTimeout = 100
```

### Environment Variables

```bash
# Required
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Optional
LOG_LEVEL=info
PORT=3001
NODE_ENV=production
```

### Health Check Endpoint

```typescript
// Add health check for Railway/monitoring
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});
```

---

## Lessons from logpare-MCP

### What Worked Well

1. **Simple tool interface** — One primary tool with clear input/output
2. **JSON responses** — Easy for Claude to parse and explain
3. **stdio for development** — Fast iteration without deployment
4. **Comprehensive descriptions** — Claude understands when to use the tool

### What to Do Differently

1. **Add resource support** — Policies as readable resources (not just tools)
2. **Batch operations** — Support evaluating multiple orders at once
3. **Better error messages** — Include actionable guidance in errors
4. **Version in responses** — Always include policy version for audit

---

## References

- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP Examples](https://github.com/modelcontextprotocol/servers)
- [logpare-MCP](https://github.com/jeffgreendesign/logpare-mcp) (prior art)
- [MCP Inspector](https://github.com/modelcontextprotocol/inspector)
