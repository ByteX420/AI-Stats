// Purpose: Executor for openai / audio.speech (TTS).
// Why: Isolates provider-specific behavior per capability.
// How: Maps IR audio speech requests to OpenAI TTS API.

// OpenAI Audio Speech (TTS) - Text-to-Speech
// Documentation: https://platform.openai.com/docs/api-reference/audio/createSpeech
// Models: tts-1, tts-1-hd, gpt-4o-mini-tts, gpt-4o-audio-preview
// Voices: alloy, echo, fable, onyx, nova, shimmer

import type { IRAudioSpeechRequest, IRAudioSpeechResponse } from "@core/ir";
import type { ExecutorExecuteArgs, ExecutorResult } from "@executors/types";
import { computeBill } from "@pipeline/pricing/engine";
import { openAICompatHeaders, openAICompatUrl, resolveOpenAICompatKey } from "@providers/openai-compatible/config";
import type { ProviderExecutor } from "../../types";

function base64FromArrayBuffer(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = "";
	const chunk = 0x8000;
	for (let i = 0; i < bytes.length; i += chunk) {
		const slice = bytes.subarray(i, i + chunk);
		binary += String.fromCharCode(...slice);
	}
	return btoa(binary);
}

export async function execute(args: ExecutorExecuteArgs): Promise<ExecutorResult> {
	const ir = args.ir as IRAudioSpeechRequest;
	const keyInfo = await resolveOpenAICompatKey(args as any);
	const key = keyInfo.key;

	// Build OpenAI TTS request
	const requestBody: any = {
		model: args.providerModelSlug || ir.model,
		input: ir.input,
		voice: ir.voice || "alloy",
	};

	if (ir.format) requestBody.response_format = ir.format;
	if (typeof ir.speed === "number") requestBody.speed = ir.speed;
	if (ir.instructions) requestBody.instructions = ir.instructions;
	if (ir.userId) requestBody.user = ir.userId;

	const captureRequest = Boolean(args.meta.returnUpstreamRequest || args.meta.echoUpstreamRequest);
	const mappedRequest = captureRequest ? JSON.stringify(requestBody) : undefined;

	const res = await fetch(openAICompatUrl(args.providerId, "/audio/speech"), {
		method: "POST",
		headers: {
			...openAICompatHeaders(args.providerId, key),
			"Content-Type": "application/json",
		},
		body: JSON.stringify(requestBody),
	});

	if (!res.ok) {
		const errorText = await res.clone().text().catch(() => "");
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
			rawResponse: errorText,
		};
	}

	// Read audio data
	const audioBuffer = await res.clone().arrayBuffer();
	const audioBase64 = base64FromArrayBuffer(audioBuffer);
	const mimeType = res.headers.get("content-type") || "audio/mpeg";

	const inputTokens = ir.input?.length ? Math.ceil(ir.input.length / 4) : 0;

	const responseIr: IRAudioSpeechResponse = {
		id: args.requestId,
		nativeId: res.headers.get("x-request-id") || undefined,
		model: requestBody.model,
		provider: args.providerId,
		audio: {
			data: audioBase64,
			url: undefined,
			mimeType,
		},
		usage: {
			inputTokens,
			outputTokens: 0,
			totalTokens: inputTokens,
		},
		rawResponse: null,
	};

	const usageMeters = {
		requests: 1,
		input_text_tokens: inputTokens,
		total_tokens: inputTokens,
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
		rawResponse: null,
	};
}

export const executor: ProviderExecutor = async (args: ExecutorExecuteArgs) => execute(args);
