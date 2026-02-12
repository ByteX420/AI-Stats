// Purpose: Executor for x-ai / image.generate.
// Why: Isolates provider-specific behavior per capability.
// How: Maps IR image generation requests to X.AI Grok Imagine API.

// X.AI Grok Imagine - Image Generation
// Documentation: https://docs.x.ai/docs/api/image-generation
// Models: grok-imagine-1 (and variants)
//
// Key Difference from OpenAI:
// - Uses application/json for ALL operations (including image editing)
// - No multipart/form-data support for image editing

import type { IRImageGenerationRequest, IRImageGenerationResponse } from "@core/ir";
import type { ExecutorExecuteArgs, ExecutorResult } from "@executors/types";
import { computeBill } from "@pipeline/pricing/engine";
import { openAICompatHeaders, openAICompatUrl, resolveOpenAICompatKey } from "@providers/openai-compatible/config";
import type { ProviderExecutor } from "../../types";

export async function execute(args: ExecutorExecuteArgs): Promise<ExecutorResult> {
	const ir = args.ir as IRImageGenerationRequest;
	const keyInfo = await resolveOpenAICompatKey(args as any);
	const key = keyInfo.key;

	// Build X.AI image generation request (JSON format, not multipart)
	const model = args.providerModelSlug || ir.model || "grok-imagine-1";
	const requestBody: any = {
		model,
		prompt: ir.prompt,
	};

	// Common parameters
	if (ir.size) requestBody.size = ir.size;
	if (typeof ir.n === "number") requestBody.n = ir.n;
	if (ir.quality) requestBody.quality = ir.quality;
	if (ir.responseFormat) requestBody.response_format = ir.responseFormat;
	if (ir.userId) requestBody.user = ir.userId;

	// X.AI specific parameters (if any)
	const rawRequest = (ir.rawRequest ?? {}) as Record<string, any>;
	if (rawRequest.style) requestBody.style = rawRequest.style;

	const captureRequest = Boolean(args.meta.returnUpstreamRequest || args.meta.echoUpstreamRequest);
	const mappedRequest = captureRequest ? JSON.stringify(requestBody) : undefined;

	const res = await fetch(openAICompatUrl(args.providerId, "/images/generations"), {
		method: "POST",
		headers: {
			...openAICompatHeaders(args.providerId, key),
			"Content-Type": "application/json",
		},
		body: JSON.stringify(requestBody),
	});

	const json = await res.clone().json().catch(() => null);

	if (!res.ok) {
		return {
			kind: "completed",
			upstream: res,
			ir: undefined,
			bill: {
				cost_cents: 0,
				currency: "USD" as const,
				usage: undefined as any,
				upstream_id: res.headers.get("x-request-id"),
				finish_reason: null,
			},
			keySource: keyInfo.source,
			byokKeyId: keyInfo.byokId,
			mappedRequest,
			rawResponse: json,
		};
	}

	const created = json?.created ? Number(json.created) : Math.floor(Date.now() / 1000);

	const responseIr: IRImageGenerationResponse = {
		id: args.requestId,
		nativeId: json?.id || res.headers.get("x-request-id") || undefined,
		created: Number.isFinite(created) ? created : Math.floor(Date.now() / 1000),
		model,
		provider: args.providerId,
		data: Array.isArray(json?.data)
			? json.data.map((item: any) => ({
				url: item?.url || null,
				b64Json: item?.b64_json || item?.b64Json || null,
				revisedPrompt: item?.revised_prompt || item?.revisedPrompt || null,
			}))
			: [],
		usage: {
			inputTokens: 0,
			outputTokens: 0,
			totalTokens: 0,
		},
		rawResponse: json,
	};

	const usageMeters = {
		total_tokens: 0,
	};

	const bill = {
		cost_cents: 0,
		currency: "USD" as const,
		usage: undefined as any,
		upstream_id: res.headers.get("x-request-id"),
		finish_reason: null,
	};

	const priced = computeBill(usageMeters, args.pricingCard);
	bill.cost_cents = priced.pricing.total_cents;
	bill.currency = priced.pricing.currency;
	bill.usage = priced;

	return {
		kind: "completed",
		upstream: res,
		ir: responseIr,
		bill,
		keySource: keyInfo.source,
		byokKeyId: keyInfo.byokId,
		mappedRequest,
		rawResponse: json,
	};
}

export const executor: ProviderExecutor = async (args: ExecutorExecuteArgs) => execute(args);
