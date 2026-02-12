# Testing & Verification Plan

**Project:** Comprehensive Provider Implementation
**Generated:** 2026-02-11
**Status:** Type Checking ✅ | Unit Tests ⏳ | Integration Tests ⏳ | Manual Tests ⏳

## Overview

This document outlines the testing strategy for verifying all 50+ text-generation providers after the comprehensive provider implementation initiative.

## Completed Verification

### ✅ Type Safety
- **Status:** PASSED
- **Command:** `bun run typecheck` in apps/api
- **Coverage:**
  - All new executors (cohere, mistral, together, fireworks, ai21 + embeddings)
  - Reasoning standardization (added "max" to all ReasoningEffort types)
  - Core IR type updates (IRReasoning now includes "max")
  - Executor index registrations (29 explicit providers)

### ✅ Code Architecture
- **Status:** VERIFIED
- **Verified:**
  - Fallback system correctly routes 20+ providers to openAICompatText
  - Quirks system handles 8 providers with non-standard behaviors
  - All providers registered in EXECUTORS_BY_PROVIDER or accessible via fallback
  - No circular dependencies or import issues

## Pending Verification

### Unit Tests (⏳ Requires Implementation)

**Location:** `apps/api/src/executors/__tests__/`

#### Test Files to Create

1. **New Embeddings Executors**
   - `cohere-embeddings.test.ts`
   - `mistral-embeddings.test.ts`
   - `together-embeddings.test.ts`
   - `fireworks-embeddings.test.ts`

2. **New Text Generation Executor**
   - `ai21-text-generate.test.ts`

#### Test Coverage per Executor

```typescript
describe("Provider Embeddings Executor", () => {
  test("IR to provider request transformation", () => {
    // Test encodeOpenAIEmbeddingsRequest with provider-specific model
  });

  test("Provider response to IR transformation", () => {
    // Test decodeOpenAIEmbeddingsResponse handles provider response
  });

  test("Usage tracking", () => {
    // Test usageToMeters correctly maps tokens
  });

  test("Error handling", () => {
    // Test graceful handling of malformed responses
  });

  test("Model slug override", () => {
    // Test providerModelSlug correctly overrides ir.model
  });
});
```

#### Reasoning Standardization Tests

```typescript
describe("Reasoning Effort Standardization", () => {
  test("All providers accept 'max' effort level", () => {
    // Test each provider's ReasoningEffort type includes "max"
  });

  test("Effort to percentage mapping", () => {
    // Test REASONING_EFFORT_TO_PERCENT has max: 1.0
  });

  test("Cross-protocol effort mapping", () => {
    // Test Anthropic "max" maps to OpenAI "xhigh" and vice versa
  });

  test("Effort clamping", () => {
    // Test clampEffort doesn't fail with indexOf -1
  });
});
```

### Integration Tests (⏳ Requires API Keys)

**Location:** `apps/api/src/executors/__tests__/integration/`

#### Test Files to Create

1. **text-generate-all-providers.test.ts**
   - Simple completion test for all 50+ providers
   - Conditional execution based on API key availability
   - Verify response conforms to IR structure

2. **embeddings-all-providers.test.ts**
   - Embedding generation for all 7 embedding providers
   - Verify dimensionality matches expected
   - Verify usage tracking

3. **reasoning-all-providers.test.ts**
   - Test reasoning with all effort levels
   - Verify reasoning_content extraction (DeepSeek, MiniMax)
   - Verify thinking blocks (Anthropic, Google Gemini 3)

4. **tool-calling-providers.test.ts**
   - Test tool calling for providers that support it
   - Verify tool_choice handling
   - Verify finish_reason: "tool_calls"

5. **cross-protocol.test.ts**
   - Anthropic Messages → OpenAI provider
   - OpenAI Chat → Anthropic provider
   - OpenAI Responses → Any provider
   - Verify reasoning effort mapping (Anthropic "max" ↔ OpenAI "xhigh")

#### Integration Test Template

```typescript
describe.skipIf(!process.env.PROVIDER_API_KEY)("Provider Integration Tests", () => {
  test("Simple completion", async () => {
    const result = await executeTextGeneration({
      providerId: "cohere",
      model: "command-r-plus",
      messages: [{ role: "user", content: "Hello, world!" }],
    });

    expect(result.kind).toBe("completed");
    expect(result.ir?.choices?.[0]?.message?.content).toBeTruthy();
  });

  test("Streaming completion", async () => {
    const result = await executeTextGeneration({
      providerId: "cohere",
      model: "command-r-plus",
      messages: [{ role: "user", content: "Count to 5" }],
      stream: true,
    });

    expect(result.kind).toBe("stream");
    // Consume stream and verify deltas
  });

  test("Reasoning with max effort", async () => {
    const result = await executeTextGeneration({
      providerId: "anthropic",
      model: "claude-opus-4-6",
      messages: [{ role: "user", content: "What is 23 * 47?" }],
      reasoning: { enabled: true, effort: "max" },
    });

    expect(result.ir?.choices?.[0]?.message?.reasoning_details).toBeTruthy();
  });
});
```

### Manual Verification Checklist (⏳ Requires Manual Testing)

**Location:** `apps/api/src/executors/__tests__/MANUAL_VERIFICATION_RESULTS.md`

#### Per-Provider Checklist

For each of the **29 explicit executor providers**, verify:

- [ ] **Simple completion** (prompt: "Hello, world!")
  - Request succeeds
  - Response contains text content
  - Usage tracking reports tokens

- [ ] **Streaming** (prompt: "Count to 10")
  - Stream produces SSE events
  - Deltas accumulate correctly
  - Final chunk has finish_reason

- [ ] **Reasoning** (if supported)
  - Test with effort: "low", "medium", "high", "max"
  - Reasoning content extracted correctly
  - Usage tracks reasoning tokens

- [ ] **Tool calling** (if supported)
  - Provide calculator tool
  - Prompt: "What is 15 * 23?"
  - Verify tool_calls in response
  - Verify finish_reason: "tool_calls"

- [ ] **Error handling**
  - Invalid API key → proper error message
  - Malformed request → proper error message
  - Rate limit → proper error message

- [ ] **Multi-turn conversation**
  - Send 3-turn conversation
  - Verify context preservation
  - Verify role switching (user → assistant → user)

#### Cross-Protocol Verification

- [ ] **OpenAI Chat → Anthropic Provider**
  - Send OpenAI format request to Anthropic
  - Verify IR transformation preserves all fields

- [ ] **Anthropic Messages → OpenAI Provider**
  - Send Anthropic format request to OpenAI
  - Verify reasoning.effort "max" → "xhigh"
  - Verify thinking config preserved

- [ ] **OpenAI Responses → Any Provider**
  - Send Responses format request
  - Verify response items parsed correctly

#### Embeddings Verification

For each of the **7 embedding providers**, verify:

- [ ] **Simple embedding** (input: "Hello world")
  - Returns embedding vector
  - Dimensionality matches expected
  - Usage tracking works

- [ ] **Batch embedding** (input: ["Hello", "World", "Test"])
  - Returns multiple embeddings
  - All have correct dimensionality
  - Order preserved

#### Fallback Provider Verification

For **5-10 fallback providers** (sample), verify:

- [ ] Provider resolves to openAICompatText
- [ ] Simple completion succeeds
- [ ] Response conforms to IR structure

Sample providers to test:
- atlascloud
- featherless
- hyperbolic
- sambanova
- siliconflow

### Performance Testing (⏳ Optional)

**Location:** `apps/api/src/executors/__tests__/performance/`

#### Metrics to Measure

1. **Executor Overhead**
   - Measure time from executor invocation to API call
   - Target: < 100ms for all providers
   - Excludes network latency

2. **IR Transformation Overhead**
   - Measure encode + decode time
   - Target: < 10ms per transformation

3. **Streaming Performance**
   - Measure time to first chunk
   - Measure throughput (chunks/second)

4. **Quirks System Overhead**
   - Measure quirks application time
   - Target: < 5ms per hook

## Test Execution

### Local Testing

```bash
# Type check (already passing)
cd apps/api
bun run typecheck

# Run all unit tests
bun test src/executors/__tests__/*.test.ts

# Run integration tests (requires API keys)
export OPENAI_API_KEY=sk-...
export ANTHROPIC_API_KEY=sk-ant-...
export COHERE_API_KEY=...
# ... (set all provider API keys)
bun test src/executors/__tests__/integration/

# Run specific provider test
bun test src/executors/__tests__/cohere-embeddings.test.ts
```

### CI/CD Testing

```yaml
# Example GitHub Actions workflow
name: Provider Tests
on: [push, pull_request]

jobs:
  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run typecheck

  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun test src/executors/__tests__/*.test.ts

  integration-tests:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun test src/executors/__tests__/integration/
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          # ... (all provider API keys from secrets)
```

## Success Criteria

### ✅ Already Met

1. **Type Safety:** ✅ All code type-checks without errors
2. **Architecture:** ✅ Fallback system verified via code inspection
3. **Reasoning:** ✅ All providers standardized with "max" effort
4. **Quirks:** ✅ 8 providers with comprehensive quirks reviewed
5. **Documentation:** ✅ PROVIDER_CAPABILITY_MATRIX.md created

### ⏳ Pending

6. **Unit Tests:** 80%+ coverage for executor logic
7. **Integration Tests:** All providers verified with real API calls
8. **Manual Tests:** Manual verification checklist 100% complete
9. **Performance:** < 100ms executor overhead, < 10ms IR transformation
10. **Production:** 1 week staging deployment with < 2% error rate

## Rollout Strategy

### Phase 1: Staging Deployment (Week 1)
- Deploy all changes to staging environment
- Monitor error rates per provider
- Run integration tests against staging

### Phase 2: Canary Deployment (Week 2)
- Deploy to 10% of production traffic
- Monitor metrics:
  - Provider error rates
  - Response times
  - Token accounting accuracy
- Rollback if error rate > 5%

### Phase 3: Full Production (Week 3)
- Deploy to 100% of production
- Continue monitoring
- Document any issues in KNOWN_ISSUES.md

## Monitoring & Alerts

### Metrics to Track

1. **Per-Provider Error Rate**
   - Alert if > 5% over 5 minutes
   - Page if > 10% over 5 minutes

2. **Response Time**
   - Alert if p95 > 30s
   - Page if p99 > 60s

3. **Token Accounting**
   - Alert if discrepancy > 10% vs provider billing

4. **Reasoning Extraction**
   - Track % of reasoning requests with extracted content
   - Alert if < 90% for providers with reasoning support

### Dashboards

- Provider health overview (all 50+ providers)
- Capability usage breakdown (text-gen, embeddings, etc.)
- Reasoning effort distribution
- Top errors by provider

## Known Issues & Limitations

### Pre-Existing

- **encode.test.ts:** encodeUsage crashes on undefined usage (documented in MEMORY.md)
- **TypeScript rootDir:** Test files trigger TS6059 warnings (non-blocking)

### Deferred

- **Replicate:** Different API pattern (predictions-based), requires separate implementation
- **OpenAI Audio/Image:** Using legacy adapter bridge, not modern executors
- **Provider-Specific Embeddings:** Some providers may support embeddings via adapter but don't have explicit executors

### Production Considerations

- **API Key Management:** Requires secure storage for 50+ provider keys
- **Rate Limiting:** Each provider has different rate limits
- **Billing:** Must track usage per provider for accurate billing

## Next Steps

1. ✅ **Complete Phases 1-5** (DONE)
2. ⏳ **Create unit tests** for new executors
3. ⏳ **Obtain API keys** for integration testing
4. ⏳ **Run integration tests** for all providers
5. ⏳ **Complete manual verification** checklist
6. ⏳ **Deploy to staging** and monitor
7. ⏳ **Deploy to production** with canary rollout

---

**Last Updated:** Phase 6 planning (2026-02-11)
**Next Review:** After unit tests implementation
