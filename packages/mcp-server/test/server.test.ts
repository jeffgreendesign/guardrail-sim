import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { Client } from '@modelcontextprotocol/client';
import { InMemoryTransport } from '@modelcontextprotocol/server';
import { createServer, VERSION } from '../dist/index.js';
import { clearSessions } from '../dist/checkout-store.js';
import { GUARDRAIL_UCP_PROFILE } from '@guardrail-sim/ucp-types';

describe('MCP Server', () => {
  async function createTestClient() {
    const server = createServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    const client = new Client({ name: 'test-client', version: '1.0.0' }, { capabilities: {} });

    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);

    return { client, server };
  }

  describe('Server Info', () => {
    it('advertises the version from package.json', () => {
      // Asserting against the manifest rather than a literal keeps the advertised
      // version from drifting away from the published one, as it previously had.
      const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
        version: string;
      };
      assert.strictEqual(VERSION, pkg.version);
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
      assert.ok(parsed.rules.length === 3);

      // The summary is generated from the policy's own thresholds rather than
      // hardcoded prose, so it must name the policy's rules and its real numbers.
      assert.ok(parsed.summary.includes('margin_floor'));
      assert.ok(parsed.summary.includes('15%'), 'should cite the policy margin floor');
      assert.ok(parsed.summary.includes('25%'), 'should cite the policy discount cap');

      const marginRule = (parsed.rules as { name: string; description: string }[]).find(
        (r) => r.name === 'margin_floor'
      );
      // Without this, a missing rule fails with "cannot read properties of undefined"
      // rather than naming the actual problem.
      assert.notStrictEqual(marginRule, undefined, 'policy summary omitted margin_floor');
      assert.strictEqual(marginRule?.description.includes('15%'), true);
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

      assert.strictEqual(result.resources.length, 2);

      const uris = result.resources.map((r) => r.uri);
      assert.ok(uris.includes('guardrail://policies/active'));
      assert.ok(uris.includes('guardrail://profile/well-known-ucp'));
    });

    it('should read active policy resource', async () => {
      const { client } = await createTestClient();
      const result = await client.readResource({ uri: 'guardrail://policies/active' });

      assert.strictEqual(result.contents.length, 1);
      const policy = JSON.parse(result.contents[0].text as string);
      assert.strictEqual(policy.id, 'default');
      assert.strictEqual(policy.rules.length, 3);
    });

    it('should serve the UCP profile from the ucp-types constants', async () => {
      const { client } = await createTestClient();

      const result = await client.readResource({ uri: 'guardrail://profile/well-known-ucp' });
      assert.strictEqual(result.contents.length, 1);
      assert.strictEqual(result.contents[0].mimeType, 'application/json');

      // Serialized from GUARDRAIL_UCP_PROFILE rather than read from disk, so a
      // published tarball cannot lose the fixture and no inline fallback can drift.
      const profile = JSON.parse(result.contents[0].text as string);
      assert.deepStrictEqual(profile, GUARDRAIL_UCP_PROFILE);
      assert.strictEqual(profile.capabilities.length, 3);
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

    it('rejects orders_per_persona above the declared maximum', async () => {
      const { client } = await createTestClient();

      // The tool's inputSchema declares max 50 and the SDK enforces it, so an
      // out-of-range request is refused rather than silently clamped. The bound
      // is discoverable by the caller in tools/list.
      const result = await client.callTool({
        name: 'run_simulation',
        arguments: { personas: ['budget-buyer'], orders_per_persona: 100 },
      });

      assert.ok(result.isError, 'out-of-range input should be an error result');
      assert.match((result.content[0] as { type: 'text'; text: string }).text, /validation/i);
    });

    it('accepts orders_per_persona at the maximum', async () => {
      const { client } = await createTestClient();

      const result = await client.callTool({
        name: 'run_simulation',
        arguments: { personas: ['budget-buyer'], orders_per_persona: 50 },
      });

      const parsed = JSON.parse((result.content[0] as { type: 'text'; text: string }).text);
      assert.strictEqual(parsed.totalSessions, 50);
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
    it('rejects an unknown tool with a JSON-RPC error', async () => {
      const { client } = await createTestClient();

      // Previously an isError result carrying a custom "UNKNOWN_TOOL" string.
      // The SDK now answers with InvalidParams (-32602), which is what ADR 003
      // asked for when it flagged the custom error codes as a gap.
      await assert.rejects(
        client.callTool({ name: 'unknown_tool', arguments: {} }),
        (error: unknown) => {
          assert.strictEqual((error as { code: number }).code, -32602);
          return true;
        }
      );
    });

    it('reports a handler failure as an isError result', async () => {
      const { client } = await createTestClient();

      // Tool-level failures stay in-band so the model can read and react to them.
      const result = await client.callTool({
        name: 'get_checkout',
        arguments: { id: 'does-not-exist' },
      });

      assert.ok(result.isError);
      const parsed = JSON.parse((result.content[0] as { type: 'text'; text: string }).text);
      assert.strictEqual(parsed.code, 'NOT_FOUND');
    });
  });
});

describe('MCP 2026-07-28 conformance', () => {
  async function connect() {
    const server = createServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'test-client', version: '1.0.0' }, { capabilities: {} });
    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
    return client;
  }

  it('declares an outputSchema on every tool', async () => {
    const client = await connect();
    const { tools } = await client.listTools();

    assert.strictEqual(tools.length, 12);
    for (const tool of tools) {
      assert.ok(tool.outputSchema, `${tool.name} is missing an outputSchema`);
      assert.ok(tool.inputSchema, `${tool.name} is missing an inputSchema`);
    }
  });

  it('returns structuredContent alongside the text block', async () => {
    const client = await connect();

    const result = await client.callTool({
      name: 'evaluate_policy',
      arguments: {
        order: { order_value: 50000, quantity: 120, product_margin: 0.4 },
        proposed_discount: 0.12,
      },
    });

    // The text block is kept for 2025-era clients that only read `content`.
    const fromText = JSON.parse((result.content[0] as { type: 'text'; text: string }).text);
    assert.ok(result.structuredContent, 'structuredContent must be present');
    assert.deepStrictEqual(result.structuredContent, fromText);
    assert.strictEqual((result.structuredContent as { approved: boolean }).approved, true);
  });

  it('lists tools in a stable order across connections', async () => {
    // The revision asks for a deterministic tools/list so clients can cache it.
    const first = (await (await connect()).listTools()).tools.map((t) => t.name);
    const second = (await (await connect()).listTools()).tools.map((t) => t.name);

    assert.deepStrictEqual(first, second);
    assert.strictEqual(first[0], 'evaluate_policy');
  });
});

describe('UCP 2026-04-08 totals sign convention', () => {
  beforeEach(() => clearSessions());

  async function connectClient() {
    const server = createServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'test-client', version: '1.0.0' }, { capabilities: {} });
    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
    return client;
  }

  function totalsOf(result: unknown): { type: string; amount: number }[] {
    const parsed = JSON.parse(
      ((result as { content: { text: string }[] }).content[0] as { text: string }).text
    ) as { checkout: { totals: { type: string; amount: number }[] } };
    return parsed.checkout.totals;
  }

  it('records a discount as a negative entry that reduces the total', async () => {
    const client = await connectClient();

    const result = await client.callTool({
      name: 'create_checkout',
      arguments: {
        checkout: {
          currency: 'USD',
          line_items: [{ item: { id: 'item-1', title: 'Widget', price: 5000 }, quantity: 2 }],
          buyer: { email: 'buyer@example.com' },
          'dev.ucp.shopping.discount': { codes: ['SAVE10'] },
        },
      },
    });

    const totals = totalsOf(result);
    const subtotal = totals.find((t) => t.type === 'subtotal');
    const discount = totals.find((t) => t.type === 'discount');
    const total = totals.find((t) => t.type === 'total');

    assert.ok(subtotal, 'subtotal entry missing');
    assert.ok(discount, 'discount entry missing from totals[]');
    assert.ok(total, 'total entry missing');

    // 2026-04-08: the totals[] discount entry is negative, reflecting its
    // effect on the receipt. Totals previously ignored discounts entirely,
    // so total always equalled subtotal.
    assert.ok(discount.amount < 0, `discount total should be negative, got ${discount.amount}`);
    assert.equal(total.amount, subtotal.amount + discount.amount);
    assert.ok(total.amount < subtotal.amount);
  });

  it('leaves totals unreduced when no discount applies', async () => {
    const client = await connectClient();

    const result = await client.callTool({
      name: 'create_checkout',
      arguments: {
        checkout: {
          currency: 'USD',
          line_items: [{ item: { id: 'item-1', title: 'Widget', price: 5000 }, quantity: 2 }],
          buyer: { email: 'buyer@example.com' },
        },
      },
    });

    const totals = totalsOf(result);
    assert.equal(
      totals.find((t) => t.type === 'discount'),
      undefined
    );
    assert.equal(
      totals.find((t) => t.type === 'total')?.amount,
      totals.find((t) => t.type === 'subtotal')?.amount
    );
  });

  it('restores the total when discount codes are removed', async () => {
    const client = await connectClient();

    const created = await client.callTool({
      name: 'create_checkout',
      arguments: {
        checkout: {
          currency: 'USD',
          line_items: [{ item: { id: 'item-1', title: 'Widget', price: 5000 }, quantity: 2 }],
          buyer: { email: 'buyer@example.com' },
          'dev.ucp.shopping.discount': { codes: ['SAVE10'] },
        },
      },
    });
    const id = (
      JSON.parse((created.content[0] as { type: 'text'; text: string }).text) as {
        checkout: { id: string };
      }
    ).checkout.id;

    const updated = await client.callTool({
      name: 'update_checkout',
      arguments: { id, checkout: { 'dev.ucp.shopping.discount': { codes: [] } } },
    });

    const totals = totalsOf(updated);
    assert.equal(
      totals.find((t) => t.type === 'discount'),
      undefined
    );
    assert.equal(
      totals.find((t) => t.type === 'total')?.amount,
      totals.find((t) => t.type === 'subtotal')?.amount
    );
  });
});

describe('regression: discount amounts and multi-code checkouts', () => {
  beforeEach(() => clearSessions());

  async function connectClient() {
    const server = createServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'test-client', version: '1.0.0' }, { capabilities: {} });
    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
    return client;
  }

  function parse(result: unknown): Record<string, never> {
    return JSON.parse(
      ((result as { content: { text: string }[] }).content[0] as { text: string }).text
    ) as Record<string, never>;
  }

  it('states the discount in the same minor units as the line items', async () => {
    const client = await connectClient();

    const result = await client.callTool({
      name: 'simulate_checkout_discount',
      arguments: {
        codes: ['SUMMER20'],
        line_items: [
          {
            item: { id: 'a', title: 'A', price: 500000 },
            quantity: 1,
            totals: [{ type: 'subtotal', amount: 500000 }],
          },
          {
            item: { id: 'b', title: 'B', price: 250000 },
            quantity: 1,
            totals: [{ type: 'subtotal', amount: 250000 }],
          },
        ],
        currency: 'USD',
        discount_percentage: 0.1,
        product_margin: 0.4,
      },
    });

    // fromUCPLineItems sums line-item subtotals, which UCP states in minor units, so
    // order_value is already cents. A second dollars->cents conversion inflated every
    // discount by 100x: 10% of 750000 was reported as 7500000.
    const parsed = parse(result) as unknown as {
      applied: { amount: number }[];
      allocations: { amount: number }[];
    };
    assert.strictEqual(parsed.applied[0].amount, 75000);
    assert.deepStrictEqual(
      parsed.allocations.map((a) => a.amount),
      [50000, 25000]
    );
  });

  it('splits one discount across codes instead of granting each the full amount', async () => {
    for (const codeCount of [1, 3, 11]) {
      clearSessions();
      const client = await connectClient();
      const codes = Array.from({ length: codeCount }, (_, i) => `CODE${i}`);

      const created = await client.callTool({
        name: 'create_checkout',
        arguments: {
          checkout: {
            currency: 'USD',
            line_items: [{ item: { id: 'a', title: 'A', price: 100000 }, quantity: 1 }],
            buyer: { email: 'buyer@example.com' },
            'dev.ucp.shopping.discount': { codes },
          },
        },
      });

      const checkout = (
        parse(created) as unknown as {
          checkout: {
            totals: { type: string; amount: number }[];
            'dev.ucp.shopping.discount': { applied: { amount: number }[] };
          };
        }
      ).checkout;

      const applied = checkout['dev.ucp.shopping.discount'].applied;
      const sum = applied.reduce((acc, a) => acc + a.amount, 0);
      const total = checkout.totals.find((t) => t.type === 'total')?.amount;

      // Every code used to carry the FULL basket discount, so N codes granted N times
      // the discount. Eleven codes drove the order total below zero.
      assert.strictEqual(sum, 10000, `${codeCount} codes should still total one 10% discount`);
      assert.strictEqual(total, 90000, `${codeCount} codes should leave the same total`);
    }
  });

  it('never lets a discount drive the total below zero', async () => {
    const client = await connectClient();
    const codes = Array.from({ length: 50 }, (_, i) => `C${i}`);

    const created = await client.callTool({
      name: 'create_checkout',
      arguments: {
        checkout: {
          currency: 'USD',
          line_items: [{ item: { id: 'a', title: 'A', price: 1000 }, quantity: 1 }],
          buyer: { email: 'buyer@example.com' },
          'dev.ucp.shopping.discount': { codes },
        },
      },
    });

    const totals = (
      parse(created) as unknown as { checkout: { totals: { type: string; amount: number }[] } }
    ).checkout.totals;
    const total = totals.find((t) => t.type === 'total')?.amount ?? -1;
    assert.strictEqual(total >= 0, true, `total went negative: ${total}`);
  });

  it('preserves spec-named UCP address fields instead of stripping them', async () => {
    const client = await connectClient();

    const created = await client.callTool({
      name: 'create_checkout',
      arguments: {
        checkout: {
          currency: 'USD',
          line_items: [{ item: { id: 'a', title: 'A', price: 1000 }, quantity: 1 }],
          buyer: { email: 'buyer@example.com', full_name: 'Ada Lovelace' },
          shipping_address: {
            street_address: '1 Main St',
            address_locality: 'Springfield',
            address_region: 'IL',
            address_country: 'US',
            postal_code: '62701',
          },
        },
      },
    });

    // The schema used invented field names, and z.object strips unknown keys, so a
    // client sending spec-correct UCP address fields lost every one of them.
    const checkout = (
      parse(created) as unknown as {
        checkout: {
          shipping_address?: Record<string, string>;
          buyer?: Record<string, string>;
        };
      }
    ).checkout;

    assert.strictEqual(checkout.shipping_address?.street_address, '1 Main St');
    assert.strictEqual(checkout.shipping_address?.address_locality, 'Springfield');
    assert.strictEqual(checkout.shipping_address?.address_country, 'US');
    assert.strictEqual(checkout.buyer?.full_name, 'Ada Lovelace');
  });
});
