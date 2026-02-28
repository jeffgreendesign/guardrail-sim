import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer, VERSION } from '../src/index.ts';

describe('MCP Server', () => {
  async function createTestClient() {
    const server = createServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    const client = new Client({ name: 'test-client', version: '1.0.0' }, { capabilities: {} });

    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);

    return { client, server };
  }

  describe('Server Info', () => {
    it('should have correct version', () => {
      assert.strictEqual(VERSION, '0.0.1');
    });
  });

  describe('Tools', () => {
    it('should list all available tools', async () => {
      const { client } = await createTestClient();
      const result = await client.listTools();

      assert.strictEqual(result.tools.length, 7);

      const toolNames = result.tools.map((t) => t.name);
      assert.ok(toolNames.includes('evaluate_policy'));
      assert.ok(toolNames.includes('get_policy_summary'));
      assert.ok(toolNames.includes('get_max_discount'));
      // UCP-aligned tools
      assert.ok(toolNames.includes('validate_discount_code'));
      assert.ok(toolNames.includes('simulate_checkout_discount'));
      // Simulation tools
      assert.ok(toolNames.includes('run_simulation'));
      assert.ok(toolNames.includes('analyze_simulation'));
    });

    it('should have proper schemas for evaluate_policy', async () => {
      const { client } = await createTestClient();
      const result = await client.listTools();

      const evaluateTool = result.tools.find((t) => t.name === 'evaluate_policy');
      assert.ok(evaluateTool);
      assert.ok(evaluateTool.inputSchema);
      assert.deepStrictEqual(evaluateTool.inputSchema.required, ['order', 'proposed_discount']);
    });
  });

  describe('evaluate_policy tool', () => {
    it('should approve a valid discount', async () => {
      const { client } = await createTestClient();

      const result = await client.callTool({
        name: 'evaluate_policy',
        arguments: {
          order: {
            order_value: 5000,
            quantity: 100,
            product_margin: 0.4,
          },
          proposed_discount: 0.1,
        },
      });

      assert.ok(result.content);
      assert.strictEqual(result.content.length, 1);
      assert.strictEqual(result.content[0].type, 'text');

      const parsed = JSON.parse((result.content[0] as { type: 'text'; text: string }).text);
      assert.strictEqual(parsed.approved, true);
      assert.strictEqual(parsed.violations.length, 0);
      assert.strictEqual(parsed.policy_id, 'default');
    });

    it('should reject discount exceeding max', async () => {
      const { client } = await createTestClient();

      const result = await client.callTool({
        name: 'evaluate_policy',
        arguments: {
          order: {
            order_value: 5000,
            quantity: 100,
            product_margin: 0.5,
          },
          proposed_discount: 0.3,
        },
      });

      const parsed = JSON.parse((result.content[0] as { type: 'text'; text: string }).text);
      assert.strictEqual(parsed.approved, false);
      assert.ok(parsed.violations.length > 0);
    });

    it('should reject discount violating margin floor', async () => {
      const { client } = await createTestClient();

      const result = await client.callTool({
        name: 'evaluate_policy',
        arguments: {
          order: {
            order_value: 5000,
            quantity: 100,
            product_margin: 0.25,
          },
          proposed_discount: 0.15,
        },
      });

      const parsed = JSON.parse((result.content[0] as { type: 'text'; text: string }).text);
      assert.strictEqual(parsed.approved, false);
      assert.ok(parsed.violations.some((v: { rule: string }) => v.rule === 'margin_floor'));
    });

    it('should reject volume tier violation', async () => {
      const { client } = await createTestClient();

      const result = await client.callTool({
        name: 'evaluate_policy',
        arguments: {
          order: {
            order_value: 5000,
            quantity: 50, // Below volume threshold
            product_margin: 0.4,
          },
          proposed_discount: 0.12, // Above 10% base limit
        },
      });

      const parsed = JSON.parse((result.content[0] as { type: 'text'; text: string }).text);
      assert.strictEqual(parsed.approved, false);
      assert.ok(parsed.violations.some((v: { rule: string }) => v.rule === 'volume_tier'));
    });
  });

  describe('get_policy_summary tool', () => {
    it('should return policy summary', async () => {
      const { client } = await createTestClient();

      const result = await client.callTool({
        name: 'get_policy_summary',
        arguments: {},
      });

      const parsed = JSON.parse((result.content[0] as { type: 'text'; text: string }).text);
      assert.strictEqual(parsed.policy_id, 'default');
      assert.ok(parsed.summary.includes('Margin Floor'));
      assert.ok(parsed.rules.length === 3);
    });
  });

  describe('get_max_discount tool', () => {
    it('should calculate max discount for high margin product', async () => {
      const { client } = await createTestClient();

      const result = await client.callTool({
        name: 'get_max_discount',
        arguments: {
          order: {
            order_value: 5000,
            quantity: 100,
            product_margin: 0.4,
          },
        },
      });

      const parsed = JSON.parse((result.content[0] as { type: 'text'; text: string }).text);
      assert.strictEqual(parsed.max_discount, 0.15); // Volume tier limit
      assert.strictEqual(parsed.limiting_factor, 'volume_tier');
    });

    it('should calculate max discount for low margin product', async () => {
      const { client } = await createTestClient();

      const result = await client.callTool({
        name: 'get_max_discount',
        arguments: {
          order: {
            order_value: 5000,
            quantity: 100,
            product_margin: 0.2, // 20% margin, so max 5% discount to stay above 15%
          },
        },
      });

      const parsed = JSON.parse((result.content[0] as { type: 'text'; text: string }).text);
      // Use approximate comparison due to floating point precision
      assert.ok(Math.abs(parsed.max_discount - 0.05) < 0.0001); // Limited by margin floor
      assert.strictEqual(parsed.limiting_factor, 'margin_floor');
    });

    it('should calculate max discount for small orders', async () => {
      const { client } = await createTestClient();

      const result = await client.callTool({
        name: 'get_max_discount',
        arguments: {
          order: {
            order_value: 500,
            quantity: 10, // Below volume threshold
            product_margin: 0.5,
          },
        },
      });

      const parsed = JSON.parse((result.content[0] as { type: 'text'; text: string }).text);
      assert.strictEqual(parsed.max_discount, 0.1); // Base tier limit
      assert.strictEqual(parsed.limiting_factor, 'volume_tier');
    });
  });

  describe('Resources', () => {
    it('should list available resources', async () => {
      const { client } = await createTestClient();
      const result = await client.listResources();

      assert.strictEqual(result.resources.length, 4);

      const uris = result.resources.map((r) => r.uri);
      assert.ok(uris.includes('guardrail://policies/active'));
      // MCP Apps UI resources
      assert.ok(uris.includes('ui://guardrail-sim/evaluation-result'));
      assert.ok(uris.includes('ui://guardrail-sim/policy-dashboard'));
      assert.ok(uris.includes('ui://guardrail-sim/simulation-results'));
    });

    it('should read active policy resource', async () => {
      const { client } = await createTestClient();
      const result = await client.readResource({ uri: 'guardrail://policies/active' });

      assert.strictEqual(result.contents.length, 1);
      const policy = JSON.parse(result.contents[0].text as string);
      assert.strictEqual(policy.id, 'default');
      assert.strictEqual(policy.rules.length, 3);
    });

    it('should read UI resources', async () => {
      const { client } = await createTestClient();

      // Test evaluation result UI
      const evalResult = await client.readResource({ uri: 'ui://guardrail-sim/evaluation-result' });
      assert.strictEqual(evalResult.contents.length, 1);
      assert.strictEqual(evalResult.contents[0].mimeType, 'text/html');
      assert.ok((evalResult.contents[0].text as string).includes('<!doctype html>'));
      assert.ok((evalResult.contents[0].text as string).includes('@modelcontextprotocol/ext-apps'));

      // Test policy dashboard UI
      const dashResult = await client.readResource({ uri: 'ui://guardrail-sim/policy-dashboard' });
      assert.strictEqual(dashResult.contents.length, 1);
      assert.strictEqual(dashResult.contents[0].mimeType, 'text/html');
      assert.ok((dashResult.contents[0].text as string).includes('<!doctype html>'));
    });
  });

  describe('run_simulation tool', () => {
    it('should run simulation with default parameters', async () => {
      const { client } = await createTestClient();

      const result = await client.callTool({
        name: 'run_simulation',
        arguments: {},
      });

      const parsed = JSON.parse((result.content[0] as { type: 'text'; text: string }).text);
      assert.ok(parsed.totalSessions > 0);
      assert.ok(typeof parsed.approvalRate === 'number');
      assert.ok(typeof parsed.averageDiscountApproved === 'number');
      assert.ok(parsed.outcomesByPersona);
      assert.strictEqual(parsed.seed, 42);
      assert.strictEqual(parsed.persona_count, 5);
    });

    it('should run simulation with specific personas', async () => {
      const { client } = await createTestClient();

      const result = await client.callTool({
        name: 'run_simulation',
        arguments: {
          personas: ['budget-buyer', 'margin-hunter'],
          orders_per_persona: 5,
          seed: 123,
        },
      });

      const parsed = JSON.parse((result.content[0] as { type: 'text'; text: string }).text);
      assert.strictEqual(parsed.totalSessions, 10); // 2 personas × 5 orders
      assert.strictEqual(parsed.persona_count, 2);
      assert.strictEqual(parsed.seed, 123);
    });

    it('should cap orders_per_persona at 50', async () => {
      const { client } = await createTestClient();

      const result = await client.callTool({
        name: 'run_simulation',
        arguments: {
          personas: ['budget-buyer'],
          orders_per_persona: 100,
        },
      });

      const parsed = JSON.parse((result.content[0] as { type: 'text'; text: string }).text);
      assert.strictEqual(parsed.totalSessions, 50); // capped at 50
    });
  });

  describe('analyze_simulation tool', () => {
    it('should return metrics and insights', async () => {
      const { client } = await createTestClient();

      const result = await client.callTool({
        name: 'analyze_simulation',
        arguments: {
          orders_per_persona: 10,
        },
      });

      const parsed = JSON.parse((result.content[0] as { type: 'text'; text: string }).text);
      assert.ok(parsed.metrics);
      assert.ok(parsed.insights);
      assert.ok(typeof parsed.insights.total === 'number');
      assert.ok(Array.isArray(parsed.insights.items));
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown tool gracefully', async () => {
      const { client } = await createTestClient();

      const result = await client.callTool({
        name: 'unknown_tool',
        arguments: {},
      });

      assert.ok(result.isError);
      const parsed = JSON.parse((result.content[0] as { type: 'text'; text: string }).text);
      assert.strictEqual(parsed.code, 'UNKNOWN_TOOL');
    });
  });
});
