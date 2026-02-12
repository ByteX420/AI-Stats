// Purpose: Executor for openai / audio.translations.
// Why: Isolates provider-specific behavior per capability.
// How: Maps IR audio translation requests to OpenAI Whisper translation API.

// OpenAI Audio Translation - Translate to English
// Documentation: https://platform.openai.com/docs/api-reference/audio/createTranslation
// Models: whisper-1

import type { IRAudioTranslationRequest, IRAudioTranslationResponse } from "@core/ir";
import type { ExecutorExecuteArgs, ExecutorResult } from "@executors/types";
import { computeBill } from "@pipeline/pricing/engine";
import { openAICompatHeaders, openAICompatUrl, resolveOpenAICompatKey } from "@providers/openai-compatible/config";
import type { ProviderExecutor } from "../../types";

export async function execute(args: ExecutorExecuteArgs): Promise<ExecutorResult> {
	const ir = args.ir as IRAudioTranslationRequest;
	const keyInfo = await resolveOpenAICompatKey(args as any);
	const key = keyInfo.key;

	// Build OpenAI translation request (multipart/form-data)
	const formData = new FormData();
	formData.append("model", args.providerModelSlug || ir.model || "whisper-1");

	// Handle audio input
	if (ir.audioUrl) {
		formData.append("file", ir.audioUrl);
	} else if (ir.audioBase64) {
		// Convert base64 to blob
		const audioData = Uint8Array.from(atob(ir.audioBase64), c => c.charCodeAt(0));
		const blob = new Blob([audioData], { type: "audio/mpeg" });
		formData.append("file", blob, "audio.mp3");
	}

	if (ir.prompt) formData.append("prompt", ir.prompt);
	if (typeof ir.temperature === "number") formData.append("temperature", String(ir.temperature));
	formData.append("response_format", "verbose_json");

	const captureRequest = Boolean(args.meta.returnUpstreamRequest || args.meta.echoUpstreamRequest);
	const mappedRequest = captureRequest ? "[multipart/form-data]" : undefined;

	const headers = openAICompatHeaders(args.providerId, key);
	// Remove Content-Type to let browser set it with boundary for multipart
	delete (headers as any)["Content-Type"];

	const res = await fetch(openAICompatUrl(args.providerId, "/audio/translations"), {
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

	const responseIr: IRAudioTranslationResponse = {
		id: args.requestId,
		nativeId: json?.id || res.headers.get("x-request-id") || undefined,
		model: json?.model || args.providerModelSlug || ir.model || "whisper-1",
		provider: args.providerId,
		text: json?.text || "",
		segments: json?.segments,
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
