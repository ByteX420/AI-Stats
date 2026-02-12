# Provider Verification Checklist (2026)

**Purpose:** Verify all provider implementations against current (2026) documentation
**Status:** ⚠️ NEEDS VERIFICATION
**Last Updated:** 2026-02-11

---

## ❓ Critical Questions Before Production

### OpenAI
- [ ] **Models:** Do GPT-5, GPT-5-pro, GPT-5.1, GPT-5.2, GPT-5.3 exist? Or are these placeholders?
- [ ] **Current Models:** What are the actual available models in Feb 2026?
  - GPT-4? GPT-4 Turbo?
  - o1, o1-preview, o1-mini, o3-mini? (confirmed in code)
  - GPT-5 family? (speculative in code)
- [ ] **Reasoning Support:** Which models actually support reasoning.effort?
  - Code says o1/o3-mini support ["low", "medium", "high"]
  - Code says gpt-5.3 supports up to "xhigh"
  - Are these current?
- [ ] **DALL-E 3:** Is it deprecated as of May 2026? (note in code says scheduled)
- [ ] **TTS Models:** Are tts-1, tts-1-hd, gpt-4o-mini-tts, gpt-4o-audio-preview current?
- [ ] **Whisper:** Is whisper-1 still the current STT model?

### Anthropic
- [ ] **Models:** What are current Claude models in 2026?
  - Claude 3 (Opus, Sonnet, Haiku)?
  - Claude 3.7 Sonnet? (seen in test code)
  - Claude 4?
  - Claude 4.6? (mentioned in memory as Opus 4.6)
- [ ] **Output Config:** Does output_config.effort support ["low", "medium", "high", "max"]?
- [ ] **Thinking API:** Current syntax for thinking config?
- [ ] **Base URL:** Still api.anthropic.com/v1/messages?

### Google Gemini
- [ ] **Models:** Current Gemini models in 2026?
  - Gemini 2.0?
  - Gemini 3.0?
  - Are these via AI Studio or Vertex or both?
- [ ] **Reasoning:** Does Gemini support reasoning/thinking natively now?
- [ ] **Effort Levels:** What effort levels does thinkingConfig support?
- [ ] **Base URL:** Still generativelanguage.googleapis.com?

### Cohere
- [ ] **Models:** Current Command models?
  - Command R+?
  - Jamba models (via AI21 partnership)?
- [ ] **Embeddings:** Embed v4 still current?
- [ ] **OpenAI Compat:** Is /compatibility/v1 still the correct path?
- [ ] **Base URL:** Still api.cohere.com?

### Mistral
- [ ] **Models:** Current Mistral models?
  - Mistral Large?
  - Codestral?
- [ ] **Embeddings:** mistral-embed, codestral-embed current?
- [ ] **Base URL:** Still api.mistral.ai/v1?

### Together AI
- [ ] **Models:** Which of 200+ models are production-ready?
- [ ] **Embeddings:** BGE, M2-BERT models still available?
- [ ] **Base URL:** Current API endpoint?

### Fireworks AI
- [ ] **Models:** Current model list?
- [ ] **Embeddings:** Qwen3-embeddings-8B available?
- [ ] **Image Generation:** Still supports FLUX models?

### Groq
- [ ] **Models:** Current Groq-hosted models?
- [ ] **LPU Performance:** Still 3000+ tok/s?

### DeepSeek
- [ ] **Models:** DeepSeek v3 current?
- [ ] **Reasoning:** Still uses reasoning_content field?
- [ ] **Base URL:** Current API endpoint?

### X.AI (Grok)
- [ ] **Models:** Grok-4, Grok-4.1 exist?
- [ ] **Reasoning:** Does Grok support reasoning natively?
- [ ] **Model Routing:** Still uses grok-4.1-reasoning vs grok-4.1-fast-non-reasoning?

### MiniMax
- [ ] **Models:** Current MiniMax models?
- [ ] **Thinking Format:** Still uses interleaved <think> blocks?
- [ ] **Tool Calling:** Still uses XML <invoke> format?

### AI21 Labs
- [ ] **Models:** Jamba 1.5 Large/Mini, Jamba 1.6 Mini current?
- [ ] **OpenAI Compat:** Does AI21 Studio API still support OpenAI format?
- [ ] **Base URL:** Still api.ai21.com/studio/v1?

### Other Providers (20+ Fallback)
- [ ] **Base URLs:** Verify each provider's base URL is current
- [ ] **API Versions:** Check if /v1 paths are still valid
- [ ] **Authentication:** Verify API key format/headers unchanged

---

## 🔧 Implementation Issues Found

### Issue 1: Speculative Model Names
**Location:** `executors/openai/text-generate/index.ts` lines 43-56
**Problem:** References to GPT-5 family models that may not exist
**Risk:** HIGH - Will fail if users try to use these models
**Fix:** Verify OpenAI's actual model list and update OPENAI_REASONING_EFFORT_SUPPORT

### Issue 2: Hardcoded Reasoning Support
**Location:** Multiple executors
**Problem:** New reasoning-capable models won't be recognized
**Risk:** MEDIUM - Falls back to defaults, but suboptimal
**Fix:** Consider dynamic model capability detection or regular updates

### Issue 3: DALL-E 3 Deprecation
**Location:** `executors/openai/image-generate/index.ts` line 8
**Problem:** Note says "scheduled for deprecation on May 12, 2026"
**Risk:** MEDIUM - We're in Feb 2026, might deprecate soon
**Fix:** Verify current status, plan migration if deprecated

### Issue 4: No Model List Validation
**Location:** All executors
**Problem:** No validation that requested model exists for provider
**Risk:** LOW - Provider API will return error, but poor UX
**Fix:** Add model validation before API call (optional)

---

## ✅ Verification Process

For each provider, verify:

### 1. Documentation Review
```bash
# Check provider's official docs dated 2026 or later
- Current base URL
- Available models (especially reasoning-capable)
- API version
- Authentication format
- Request/response formats
- Rate limiting
```

### 2. API Endpoint Test
```bash
# Make actual API call to verify connectivity
curl https://api.{provider}.com/v1/models \
  -H "Authorization: Bearer $API_KEY"

# Verify:
- ✅ Endpoint responds
- ✅ Returns current model list
- ✅ Model names match code
```

### 3. Reasoning Capability Test
```bash
# For providers with reasoning support, verify effort levels
POST /v1/chat/completions
{
  "model": "...",
  "messages": [...],
  "reasoning": { "effort": "high" }  // or provider-specific format
}

# Verify:
- ✅ Accepts reasoning config
- ✅ Returns reasoning content
- ✅ Effort levels supported match code
```

### 4. Model Availability Test
```typescript
// For each model in reasoning support maps, verify exists
const modelsToVerify = [
  { provider: "openai", models: ["gpt-5", "gpt-5-pro", "o1", "o3-mini"] },
  { provider: "anthropic", models: ["claude-opus-4-6", "claude-3-7-sonnet"] },
  { provider: "google", models: ["gemini-2", "gemini-3"] },
  // ... etc
];

// Make API call for each and verify model exists
```

---

## 🚦 Production Readiness Status

| Category | Status | Blocker? |
|----------|--------|----------|
| **Architecture** | ✅ Excellent | No |
| **Type Safety** | ✅ Passing | No |
| **IR Transformations** | ✅ Correct | No |
| **Fallback System** | ✅ Working | No |
| **Quirks Handling** | ✅ Comprehensive | No |
| **Model Names** | ⚠️ **UNVERIFIED** | **YES** |
| **Base URLs** | ⚠️ **UNVERIFIED** | **YES** |
| **Reasoning Support** | ⚠️ **UNVERIFIED** | MEDIUM |
| **API Versions** | ⚠️ **UNVERIFIED** | MEDIUM |
| **Integration Tests** | ❌ **NOT RUN** | **YES** |

---

## 📊 Confidence Levels

### HIGH Confidence (Architecture)
- ✅ IR system handles all transformations correctly
- ✅ Fallback mechanism routes providers properly
- ✅ Quirks system handles non-standard providers
- ✅ Type system enforces correctness
- ✅ Cross-protocol compatibility works

### MEDIUM Confidence (Current State)
- ⚠️ Most provider base URLs likely correct (stable infrastructure)
- ⚠️ Core models likely available (GPT-4, Claude, Gemini)
- ⚠️ Basic text generation probably works for most providers

### LOW Confidence (Provider Specifics)
- ❌ Model names match current offerings
- ❌ Reasoning support maps are accurate
- ❌ API versions are current
- ❌ Deprecated models removed
- ❌ New capabilities captured

---

## 🎯 Recommended Action Plan

### Phase 1: Critical Verification (Before Any Production Use)
1. **OpenAI Model Audit** (30 min)
   - Verify GPT-5 family exists or remove from code
   - Update OPENAI_REASONING_EFFORT_SUPPORT with actual models
   - Check DALL-E 3 deprecation status

2. **Anthropic Model Audit** (15 min)
   - Verify Claude 4.6 exists and supports output_config.effort
   - Confirm current model names

3. **Top 5 Provider Base URLs** (15 min)
   - OpenAI, Anthropic, Google, Cohere, Mistral
   - Verify base URLs unchanged
   - Test /v1/models endpoint for each

### Phase 2: Comprehensive Verification (Before Broad Rollout)
4. **All Provider Base URLs** (2 hours)
   - Verify all 50+ provider base URLs
   - Update OPENAI_COMPAT_CONFIG as needed

5. **Reasoning Support Matrix** (2 hours)
   - Test reasoning with each provider that claims support
   - Update effort level maps

6. **Integration Tests** (4 hours)
   - Write tests for top 10 providers
   - Run with real API keys
   - Verify responses conform to IR

### Phase 3: Ongoing Maintenance
7. **Automated Model Discovery** (Future)
   - Hit /v1/models endpoints periodically
   - Warn if configured models not found
   - Suggest new models available

8. **Provider Health Checks** (Future)
   - Ping each provider's base URL daily
   - Alert if base URL returns 404
   - Track API version changes

---

## 💡 Quick Win: Model Name Validation

Add this to catch invalid models early:

```typescript
// executors/_shared/model-validation.ts
export function validateModel(provider: string, model: string): boolean {
  // Fetch from /v1/models or use cached list
  // Return true if model exists, false otherwise
  // Log warning if model not found
}
```

---

**Bottom Line:** Architecture is production-ready, but **provider-specific details need verification** before confident deployment. Estimate **4-6 hours** to verify critical details for top 10 providers.
