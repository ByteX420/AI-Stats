// Purpose: Executor for openai / image.edit.
// Why: Isolates provider-specific behavior per capability.
// How: Maps IR image edit requests to OpenAI Image Edit API.

// OpenAI Image Edit
// Documentation: https://platform.openai.com/docs/api-reference/images/createEdit
// Models: dall-e-2 (Deprecated May 12, 2026)
// Note: Image editing is currently only supported by DALL-E 2.
//       gpt-image models do not support image editing yet.

import type { IRImageGenerationRequest, IRImageGenerationResponse } from "@core/ir";
import type { ExecutorExecuteArgs, ExecutorResult } from "@executors/types";
import { computeBill } from "@pipeline/pricing/engine";
import { openAICompatHeaders, openAICompatUrl, resolveOpenAICompatKey } from "@providers/openai-compatible/config";
import type { ProviderExecutor } from "../../types";

export async function execute(args: ExecutorExecuteArgs): Promise<ExecutorResult> {
	const ir = args.ir as IRImageGenerationRequest;
	const keyInfo = await resolveOpenAICompatKey(args as any);
	const key = keyInfo.key;

	// Build OpenAI image edit request (multipart/form-data)
	const formData = new FormData();
	formData.append("model", args.providerModelSlug || ir.model || "dall-e-2");
	formData.append("prompt", ir.prompt);

	// Handle image and mask inputs
	const rawRequest = (ir.rawRequest ?? {}) as Record<string, any>;
	if (ir.image || rawRequest.image) {
		formData.append("image", ir.image || rawRequest.image);
	}
	if (ir.mask || rawRequest.mask) {
		formData.append("mask", ir.mask || rawRequest.mask);
	}

	if (ir.size) formData.append("size", ir.size);
	if (typeof ir.n === "number") formData.append("n", String(ir.n));
	if (ir.userId || rawRequest.user) formData.append("user", ir.userId || rawRequest.user);

	const captureRequest = Boolean(args.meta.returnUpstreamRequest || args.meta.echoUpstreamRequest);
	const mappedRequest = captureRequest ? "[multipart/form-data]" : undefined;

	const headers = openAICompatHeaders(args.providerId, key);
	// Remove Content-Type to let browser set it with boundary for multipart
	delete (headers as any)["Content-Type"];

	const res = await fetch(openAICompatUrl(args.providerId, "/images/edits"), {
		method: "POST",
		headers,
		body: formData,
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
		model: args.providerModelSlug || ir.model || "dall-e-2",
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
		requests: 1,
		total_tokens: 0,
	};

	const bill = {
		cost_cents: 0,
		currency: "USD" as const,
		usage: undefined as any,
		upstream_id: res.headers.get("x-request-id"),
		finish_reason: null,
	};

	if (usageMeters) {
		const priced = computeBill(usageMeters, args.pricingCard);
		bill.cost_cents = priced.pricing.total_cents;
		bill.currency = priced.pricing.currency;
		bill.usage = priced;
	}

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
