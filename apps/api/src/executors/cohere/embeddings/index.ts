// Purpose: Executor for cohere / embeddings.
// Why: Isolates provider-specific behavior per capability.
// How: Maps IR embeddings to Cohere embeddings API (OpenAI-compatible) and normalizes usage.

// Cohere Embeddings - Embed v4 models via OpenAI Compatibility API
// Documentation: https://docs.cohere.com/docs/compatibility-api
// Models: embed-english-v3.0, embed-multilingual-v3.0, embed-english-light-v3.0, embed-multilingual-light-v3.0, embed-english-v4.0, embed-multilingual-v4.0

import type { IREmbeddingsRequest, IREmbeddingsResponse } from "@core/ir";
import type { ExecutorExecuteArgs, ExecutorResult } from "@executors/types";
import { computeBill } from "@pipeline/pricing/engine";
import { encodeOpenAIEmbeddingsRequest } from "@protocols/openai-embeddings/encode";
import { decodeOpenAIEmbeddingsResponse } from "@protocols/openai-embeddings/decode";
import { openAICompatHeaders, openAICompatUrl, resolveOpenAICompatKey } from "@providers/openai-compatible/config";
import type { ProviderExecutor } from "../../types";

function usageToMeters(usage?: IREmbeddingsResponse["usage"]): Record<string, number> | undefined {
	if (!usage) return undefined;
	const inputTokens = usage.inputTokens ?? usage.embeddingTokens ?? 0;
	const totalTokens = usage.totalTokens ?? inputTokens;
	const embeddingTokens = usage.embeddingTokens ?? inputTokens;
	return {
		input_tokens: inputTokens,
		input_text_tokens: inputTokens,
		total_tokens: totalTokens,
		embedding_tokens: embeddingTokens,
		output_tokens: 0,
		output_text_tokens: 0,
	};
}

export async function execute(args: ExecutorExecuteArgs): Promise<ExecutorResult> {
	const ir = args.ir as IREmbeddingsRequest;
	const keyInfo = await resolveOpenAICompatKey(args as any);
	const key = keyInfo.key;

	const requestBody = encodeOpenAIEmbeddingsRequest({
		...ir,
		model: args.providerModelSlug || ir.model,
	});

	const captureRequest = Boolean(args.meta.returnUpstreamRequest || args.meta.echoUpstreamRequest);
	const mappedRequest = captureRequest ? JSON.stringify(requestBody) : undefined;

	const res = await fetch(openAICompatUrl(args.providerId, "/embeddings"), {
		method: "POST",
		headers: openAICompatHeaders(args.providerId, key),
		body: JSON.stringify(requestBody),
	});

	const json = await res.clone().json().catch(() => null);
	const responseIr = json ? decodeOpenAIEmbeddingsResponse(json) : {
		object: "list",
		model: ir.model,
		data: [],
	} as IREmbeddingsResponse;

	responseIr.rawResponse = json ?? null;
	ir.rawRequest = requestBody;

	const usageMeters = usageToMeters(responseIr.usage);
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
		rawResponse: json ?? null,
	};
}

export const executor: ProviderExecutor = async (args: ExecutorExecuteArgs) => execute(args);
