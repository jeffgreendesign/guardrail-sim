import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer, VERSION } from '../dist/index.js';
import { clearSessions } from '../dist/checkout-store.js';

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

      assert.strictEqual(result.tools.length, 12);

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
      // Standard UCP Checkout tools
      assert.ok(toolNames.includes('create_checkout'));
      assert.ok(toolNames.includes('get_checkout'));
      assert.ok(toolNames.includes('update_checkout'));
      assert.ok(toolNames.includes('complete_checkout'));
      assert.ok(toolNames.includes('cancel_checkout'));
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

      assert.strictEqual(result.resources.length, 5);

      const uris = result.resources.map((r) => r.uri);
      assert.ok(uris.includes('guardrail://policies/active'));
      assert.ok(uris.includes('guardrail://profile/well-known-ucp'));
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

  describe('UCP Checkout Tools', () => {
    beforeEach(() => {
      clearSessions();
    });

    it('should create a checkout session', async () => {
      const { client } = await createTestClient();

      const result = await client.callTool({
        name: 'create_checkout',
        arguments: {
          checkout: {
            currency: 'USD',
            line_items: [{ item: { id: 'item-1', title: 'Widget', price: 5000 }, quantity: 2 }],
            buyer: { email: 'buyer@example.com', first_name: 'Test' },
          },
        },
      });

      const parsed = JSON.parse((result.content[0] as { type: 'text'; text: string }).text);
      assert.ok(parsed.checkout.id);
      assert.strictEqual(parsed.checkout.currency, 'USD');
      assert.strictEqual(parsed.checkout.line_items.length, 1);
      assert.strictEqual(parsed.checkout.status, 'ready_for_complete');
    });

    it('should get a checkout session by ID', async () => {
      const { client } = await createTestClient();

      // Create first
      const createResult = await client.callTool({
        name: 'create_checkout',
        arguments: {
          checkout: {
            currency: 'USD',
            line_items: [{ item: { id: 'item-1', title: 'Widget', price: 5000 }, quantity: 1 }],
            buyer: { email: 'test@test.com' },
          },
        },
      });
      const created = JSON.parse((createResult.content[0] as { type: 'text'; text: string }).text);

      // Get by ID
      const getResult = await client.callTool({
        name: 'get_checkout',
        arguments: { id: created.checkout.id },
      });
      const fetched = JSON.parse((getResult.content[0] as { type: 'text'; text: string }).text);
      assert.strictEqual(fetched.checkout.id, created.checkout.id);
    });

    it('should return error for non-existent checkout', async () => {
      const { client } = await createTestClient();

      const result = await client.callTool({
        name: 'get_checkout',
        arguments: { id: 'non-existent-id' },
      });

      assert.ok(result.isError);
      const parsed = JSON.parse((result.content[0] as { type: 'text'; text: string }).text);
      assert.strictEqual(parsed.code, 'NOT_FOUND');
    });

    it('should update a checkout session', async () => {
      const { client } = await createTestClient();

      // Create
      const createResult = await client.callTool({
        name: 'create_checkout',
        arguments: {
          checkout: {
            currency: 'USD',
            line_items: [{ item: { id: 'item-1', title: 'Widget', price: 5000 }, quantity: 1 }],
          },
        },
      });
      const created = JSON.parse((createResult.content[0] as { type: 'text'; text: string }).text);

      // Update with buyer info
      const updateResult = await client.callTool({
        name: 'update_checkout',
        arguments: {
          id: created.checkout.id,
          checkout: {
            buyer: { email: 'updated@test.com', first_name: 'Updated' },
          },
        },
      });
      const updated = JSON.parse((updateResult.content[0] as { type: 'text'; text: string }).text);
      assert.strictEqual(updated.checkout.buyer.email, 'updated@test.com');
      assert.strictEqual(updated.checkout.status, 'ready_for_complete');
    });

    it('should complete a checkout session', async () => {
      const { client } = await createTestClient();

      // Create with buyer (to get ready_for_complete status)
      const createResult = await client.callTool({
        name: 'create_checkout',
        arguments: {
          checkout: {
            currency: 'USD',
            line_items: [{ item: { id: 'item-1', title: 'Widget', price: 5000 }, quantity: 1 }],
            buyer: { email: 'buyer@test.com' },
          },
        },
      });
      const created = JSON.parse((createResult.content[0] as { type: 'text'; text: string }).text);
      assert.strictEqual(created.checkout.status, 'ready_for_complete');

      // Complete
      const completeResult = await client.callTool({
        name: 'complete_checkout',
        arguments: { id: created.checkout.id },
      });
      const completed = JSON.parse(
        (completeResult.content[0] as { type: 'text'; text: string }).text
      );
      assert.strictEqual(completed.checkout.status, 'completed');
      assert.ok(completed.checkout.order);
      assert.ok(completed.checkout.order.id);
    });

    it('should reject completing an incomplete session', async () => {
      const { client } = await createTestClient();

      // Create without buyer (stays incomplete)
      const createResult = await client.callTool({
        name: 'create_checkout',
        arguments: {
          checkout: {
            currency: 'USD',
            line_items: [{ item: { id: 'item-1', title: 'Widget', price: 5000 }, quantity: 1 }],
          },
        },
      });
      const created = JSON.parse((createResult.content[0] as { type: 'text'; text: string }).text);
      assert.strictEqual(created.checkout.status, 'incomplete');

      // Try to complete
      const completeResult = await client.callTool({
        name: 'complete_checkout',
        arguments: { id: created.checkout.id },
      });
      assert.ok(completeResult.isError);
    });

    it('should cancel a checkout session', async () => {
      const { client } = await createTestClient();

      // Create
      const createResult = await client.callTool({
        name: 'create_checkout',
        arguments: {
          checkout: {
            currency: 'USD',
            line_items: [{ item: { id: 'item-1', title: 'Widget', price: 5000 }, quantity: 1 }],
          },
        },
      });
      const created = JSON.parse((createResult.content[0] as { type: 'text'; text: string }).text);

      // Cancel
      const cancelResult = await client.callTool({
        name: 'cancel_checkout',
        arguments: { id: created.checkout.id },
      });
      const canceled = JSON.parse((cancelResult.content[0] as { type: 'text'; text: string }).text);
      assert.strictEqual(canceled.checkout.status, 'canceled');
    });

    it('should accept _meta.ucp.profile', async () => {
      const { client } = await createTestClient();

      const result = await client.callTool({
        name: 'create_checkout',
        arguments: {
          checkout: {
            currency: 'USD',
            line_items: [{ item: { id: 'item-1', title: 'Widget', price: 5000 }, quantity: 1 }],
          },
          _meta: {
            ucp: {
              profile: 'https://platform.example/.well-known/ucp',
            },
          },
        },
      });

      const parsed = JSON.parse((result.content[0] as { type: 'text'; text: string }).text);
      assert.ok(parsed.checkout.id); // Tool accepted the profile without error
    });

    it('should handle idempotency keys', async () => {
      const { client } = await createTestClient();

      const idempotencyKey = 'test-idem-key-123';

      // First create
      const result1 = await client.callTool({
        name: 'create_checkout',
        arguments: {
          checkout: {
            currency: 'USD',
            line_items: [{ item: { id: 'item-1', title: 'Widget', price: 5000 }, quantity: 1 }],
          },
          idempotency_key: idempotencyKey,
        },
      });
      const parsed1 = JSON.parse((result1.content[0] as { type: 'text'; text: string }).text);

      // Second create with same key
      const result2 = await client.callTool({
        name: 'create_checkout',
        arguments: {
          checkout: {
            currency: 'USD',
            line_items: [{ item: { id: 'item-2', title: 'Different', price: 9999 }, quantity: 5 }],
          },
          idempotency_key: idempotencyKey,
        },
      });
      const parsed2 = JSON.parse((result2.content[0] as { type: 'text'; text: string }).text);

      // Same session ID returned
      assert.strictEqual(parsed1.checkout.id, parsed2.checkout.id);
    });

    it('should create checkout with discount codes', async () => {
      const { client } = await createTestClient();

      const result = await client.callTool({
        name: 'create_checkout',
        arguments: {
          checkout: {
            currency: 'USD',
            line_items: [{ item: { id: 'item-1', title: 'Widget', price: 5000 }, quantity: 100 }],
            buyer: { email: 'buyer@test.com' },
            'dev.ucp.shopping.discount': {
              codes: ['SAVE10'],
            },
          },
        },
      });

      const parsed = JSON.parse((result.content[0] as { type: 'text'; text: string }).text);
      assert.ok(parsed.checkout['dev.ucp.shopping.discount']);
      assert.deepStrictEqual(parsed.checkout['dev.ucp.shopping.discount'].codes, ['SAVE10']);
    });

    it('should preserve original discount data on idempotency replay', async () => {
      const { client } = await createTestClient();

      const idempotencyKey = 'idem-discount-replay';

      // First create with discount
      const result1 = await client.callTool({
        name: 'create_checkout',
        arguments: {
          checkout: {
            currency: 'USD',
            line_items: [{ item: { id: 'item-1', title: 'Widget', price: 5000 }, quantity: 100 }],
            buyer: { email: 'buyer@test.com' },
            'dev.ucp.shopping.discount': { codes: ['SAVE10'] },
          },
          idempotency_key: idempotencyKey,
        },
      });
      const parsed1 = JSON.parse((result1.content[0] as { type: 'text'; text: string }).text);
      const originalDiscount = parsed1.checkout['dev.ucp.shopping.discount'];

      // Replay with different discount codes — should return original unchanged
      const result2 = await client.callTool({
        name: 'create_checkout',
        arguments: {
          checkout: {
            currency: 'USD',
            line_items: [{ item: { id: 'item-2', title: 'Gadget', price: 9999 }, quantity: 50 }],
            'dev.ucp.shopping.discount': { codes: ['DIFFERENT_CODE'] },
          },
          idempotency_key: idempotencyKey,
        },
      });
      const parsed2 = JSON.parse((result2.content[0] as { type: 'text'; text: string }).text);

      assert.strictEqual(parsed1.checkout.id, parsed2.checkout.id);
      assert.deepStrictEqual(parsed2.checkout['dev.ucp.shopping.discount'], originalDiscount);
    });

    it('should re-evaluate existing discount when line_items change', async () => {
      const { client } = await createTestClient();

      // Create with discount
      const createResult = await client.callTool({
        name: 'create_checkout',
        arguments: {
          checkout: {
            currency: 'USD',
            line_items: [{ item: { id: 'item-1', title: 'Widget', price: 5000 }, quantity: 100 }],
            buyer: { email: 'buyer@test.com' },
            'dev.ucp.shopping.discount': { codes: ['SAVE10'] },
          },
        },
      });
      const created = JSON.parse((createResult.content[0] as { type: 'text'; text: string }).text);
      assert.ok(created.checkout['dev.ucp.shopping.discount']);

      // Update line_items without resending discount codes
      const updateResult = await client.callTool({
        name: 'update_checkout',
        arguments: {
          id: created.checkout.id,
          checkout: {
            line_items: [
              { item: { id: 'item-2', title: 'Expensive Widget', price: 50000 }, quantity: 10 },
            ],
          },
        },
      });
      const updated = JSON.parse((updateResult.content[0] as { type: 'text'; text: string }).text);

      // Discount should still be present and re-evaluated with original codes
      assert.ok(updated.checkout['dev.ucp.shopping.discount']);
      assert.deepStrictEqual(updated.checkout['dev.ucp.shopping.discount'].codes, ['SAVE10']);
    });
  });

  describe('UCP Profile Resource', () => {
    it('should read UCP profile resource', async () => {
      const { client } = await createTestClient();
      const result = await client.readResource({ uri: 'guardrail://profile/well-known-ucp' });

      assert.strictEqual(result.contents.length, 1);
      const profile = JSON.parse(result.contents[0].text as string);
      assert.strictEqual(profile.name, 'guardrail-sim');
      assert.ok(profile.capabilities.length > 0);
      assert.ok(
        profile.capabilities.some((c: { name: string }) => c.name === 'dev.ucp.shopping.checkout')
      );
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
