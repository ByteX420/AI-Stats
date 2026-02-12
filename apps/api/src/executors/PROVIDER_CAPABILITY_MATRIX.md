# Provider Capability Matrix

**Generated:** 2026-02-11
**Total Providers:** 50+ (29 explicit executors + 20+ fallback)

## Architecture Overview

The AI Stats Gateway uses a **two-tier provider system**:

1. **Explicit Executors:** Providers with custom implementations (usually for quirks or optimizations)
2. **Fallback System:** Standard OpenAI-compatible providers use shared `openAICompatText` executor

### Fallback Logic

```typescript
// From apps/api/src/executors/index.ts:213-226
1. Check EXECUTORS_BY_PROVIDER for explicit executor
2. If not found + capability is text.generate + provider in OPENAI_COMPAT_CONFIG:
   → Use openAICompatText fallback
3. For non-text capabilities: Use adapter bridge (if supported)
```

## Text Generation Providers

### Explicit Executors (29 providers)

| Provider | Models | Reasoning | Quirks |
|----------|--------|-----------|--------|
| **openai** | GPT-4, GPT-5, o1, o3-mini | ✅ effort | Standard |
| **anthropic** | Claude 3, Claude 4 | ✅ effort + thinking | Adaptive thinking |
| **azure** | Azure OpenAI models | ✅ | Standard |
| **google** | Gemini 2, Gemini 3 | ✅ thinkingConfig | Standard |
| **google-ai-studio** | Gemini models | ✅ thinkingConfig | Standard |
| **google-vertex** | Vertex AI models | ✅ | Standard |
| **x-ai** / **xai** | Grok-4, Grok-4.1 | ✅ effort | Model routing quirks |
| **deepseek** | DeepSeek v3 | ✅ | reasoning_content field |
| **minimax** | MiniMax models | ✅ | Interleaved thinking, XML tools |
| **minimax-lightning** | MiniMax Lightning | ✅ | Interleaved thinking |
| **alibaba** | Qwen models | ✅ | Standard |
| **qwen** | Qwen models | ✅ | Standard |
| **z-ai** | GLM models | ✅ | GLM-specific |
| **zai** | ZAI models | ✅ | Standard |
| **xiaomi** | Xiaomi models | ✅ | chat_template_kwargs |
| **mistral** | Mistral Large, Codestral | ✅ | json_schema fallback |
| **moonshot-ai** | Moonshot models | ✅ | Provider-specific |
| **moonshot-ai-turbo** | Moonshot Turbo | ✅ | Provider-specific |
| **aion-labs** / **aionlabs** | AION models | ✅ | Think blocks |
| **amazon-bedrock** | Bedrock models | ✅ | Standard |
| **cohere** | Command R+, Jamba | ✅ | Standard |
| **perplexity** | Sonar models | ✅ | Standard |
| **together** / **together-ai** | 200+ OSS models | ✅ | Standard |
| **groq** | Llama, Mixtral (LPU) | ✅ | Standard |
| **fireworks** / **fireworks-ai** | 100+ models | ✅ | Standard |
| **cerebras** | Fast inference | ✅ | Standard |
| **deepinfra** | Multi-cloud | ✅ | Standard |
| **baseten** | ML infrastructure | ✅ | Standard |
| **novitaai** | Global network | ✅ | Standard |
| **liquid-ai** | Liquid models | ✅ | Standard |
| **ai21** | Jamba 1.5/1.6 | ✅ | Standard |

### Fallback via openAICompatText (20+ providers)

These providers use the shared OpenAI-compatible executor automatically:

- **atlascloud** / **atlas-cloud**
- **arcee** / **arcee-ai**
- **clarifai**
- **chutes**
- **cloudflare**
- **crusoe**
- **featherless**
- **friendli**
- **gmicloud**
- **hyperbolic**
- **inception**
- **infermatic**
- **inflection**
- **mancer**
- **morph**
- **morpheus**
- **parasail**
- **phala**
- **sambanova**
- **siliconflow**
- **sourceful**
- **relace**
- **liquid** (alias for liquid-ai)
- **nebius-token-factory**
- **weights-and-biases**

**Note:** New OpenAI-compatible providers can be added to `OPENAI_COMPAT_CONFIG` and get instant text-generation support via fallback.

## Embeddings Providers

| Provider | Models | Dimensions |
|----------|--------|------------|
| **openai** | text-embedding-3-small/large, ada-002 | 1536, 3072 |
| **google** | text-embedding-004 | 768 |
| **google-ai-studio** | text-embedding-004 | 768 |
| **cohere** | embed-english-v4, embed-multilingual-v4 | 1024 |
| **mistral** | mistral-embed, codestral-embed | 1024 |
| **together** | BGE, M2-BERT (2k/8k/32k context) | Varies |
| **fireworks** | Qwen3-embeddings-8B, nomic-embed-text | Varies |

## Video Generation Providers

| Provider | Models | Notes |
|----------|--------|-------|
| **openai** | sora-1.0 | Video generation |
| **google** | Veo 2 | Google video models |
| **google-ai-studio** | Veo 2 | Google AI Studio |
| **fal** / **fal-ai** | Various | Fal.ai video models |
| **alibaba** | Alibaba video | Alibaba video generation |

## Moderation Providers

| Provider | Models | Notes |
|----------|--------|-------|
| **openai** | omni-moderation-latest | OpenAI moderation |

## Audio/Image Capabilities (via Adapter Bridge)

The following capabilities are supported via the legacy adapter bridge:

### Audio
- **Speech (TTS):** openai, elevenlabs
- **Transcription (STT):** openai, elevenlabs
- **Translation:** openai, elevenlabs

### Image
- **Generation:** All OpenAI-compatible providers (via fallback)
- **Editing:** OpenAI-compatible providers (excluding google-ai-studio)

### Other
- **OCR:** mistral
- **Music Generation:** suno, elevenlabs

## Reasoning/Thinking Support

### Effort Levels

All providers support the full effort spectrum:
```
none → minimal → low → medium → high → xhigh → max
```

**Mappings:**
- `none`: 0% of max reasoning tokens
- `minimal`: 15%
- `low`: 30%
- `medium`: 50%
- `high`: 75%
- `xhigh`: 90%
- `max`: 100%

### Provider-Specific Reasoning

- **Anthropic:** Native `thinking` with adaptive mode + `output_config.effort`
- **OpenAI:** `reasoning.effort` for o-series models
- **Google/Gemini:** `thinkingConfig` for Gemini 3+
- **DeepSeek:** `reasoning_content` field
- **MiniMax:** Interleaved `<think>` blocks
- **X.AI:** Grok model routing based on reasoning flag

## Cross-Protocol Compatibility

The IR (Intermediate Representation) enables seamless protocol translation:

- **Anthropic "max" ↔ OpenAI "xhigh"**
- **OpenAI Chat Completions ↔ OpenAI Responses**
- **OpenAI ↔ Anthropic Messages**

Clients can send requests in any supported protocol format and get routed to any provider with automatic transformation.

## Provider Quirks System

Located in `apps/api/src/executors/_shared/text-generate/openai-compat/providers/*/quirks.ts`

### Hook Points
1. **transformRequest:** Modify request before sending (e.g., json_schema fallback)
2. **extractReasoning:** Extract reasoning from response (e.g., reasoning_content)
3. **transformStreamChunk:** Modify streaming deltas (e.g., accumulate <think> blocks)
4. **normalizeResponse:** Final response cleanup (e.g., set finish_reason to tool_calls)

### Providers with Quirks
- **deepseek:** reasoning_content extraction
- **minimax:** Interleaved thinking + XML tool invocations
- **xiaomi:** chat_template_kwargs
- **z-ai:** GLM model handling
- **mistral:** json_schema → json_object fallback
- **moonshot-ai:** Provider-specific handling
- **x-ai:** Grok model routing
- **aion-labs:** Think block parsing

## Adding New Providers

### Standard OpenAI-Compatible Provider
1. Add to `OPENAI_COMPAT_CONFIG` in `providers/openai-compatible/config.ts`
2. That's it! Automatic fallback to `openAICompatText`

### Provider with Quirks
1. Add to `OPENAI_COMPAT_CONFIG`
2. Create quirks file in `executors/_shared/text-generate/openai-compat/providers/{provider}/quirks.ts`
3. Implement relevant hooks (transformRequest, extractReasoning, etc.)
4. Register quirks in shared executor

### Provider Requiring Full Executor
1. Create `executors/{provider}/text-generate/index.ts`
2. Implement `preprocess`, `execute`, `postprocess`, `transformStream`
3. Import and register in `executors/index.ts` → `EXECUTORS_BY_PROVIDER`

## Testing Status

- ✅ **Type Safety:** All providers pass TypeScript type checking
- ✅ **Reasoning Standardization:** All ReasoningEffort types include "max"
- ✅ **Fallback System:** Verified via code inspection
- ⏳ **Integration Tests:** Require API keys for all providers
- ⏳ **Manual Verification:** Pending per-provider smoke tests

## Notes

- **Replicate:** Deferred (different API pattern - predictions-based, not chat completions)
- **Adapter Bridge:** Legacy system still used for non-text capabilities (audio, image)
- **Blocklist:** Currently empty - all OpenAI-compat providers enabled
- **Config Overrides:** Providers can specify baseUrl, pathPrefix, supportsResponses

---

**Last Updated:** Phase 5 completion (2026-02-11)
**Maintainer:** AI Stats Gateway Team
