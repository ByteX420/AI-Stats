"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Logo } from "@/components/Logo";

type ComparisonCandidate = {
	key: string;
	displayName: string;
	provider: string;
};

function formatProviderLabel(providerId: string): string {
	const known: Record<string, string> = {
		openai: "OpenAI",
		anthropic: "Anthropic",
		google: "Google",
		"google-ai-studio": "Google AI Studio",
		"google-vertex": "Google Vertex",
		"x-ai": "xAI",
		aws: "AWS",
		azure: "Azure",
	};

	if (known[providerId]) {
		return known[providerId];
	}

	return providerId
		.replace(/[-_]+/g, " ")
		.replace(/\b\w/g, (char) => char.toUpperCase());
}

type PricingModel = {
	provider: string;
	model: string;
	endpoint: string;
	display_name?: string;
	pricing_plan?: string | null;
	meters: Array<{
		meter: string;
		unit: string;
		unit_size: number;
		price_per_unit: string;
		currency: string;
	}>;
};

interface ModelSelectorProps {
	models: PricingModel[];
	selectedModelId: string;
	selectedEndpoint: string;
	availableEndpoints: string[];
	comparisonCandidates: ComparisonCandidate[];
	comparisonModelKeys: string[];
	maxComparisonModels: number;
	onModelSelect: (modelId: string) => void;
	onEndpointSelect: (endpoint: string) => void;
	onToggleComparisonModel: (modelKey: string) => void;
}

export function ModelSelector({
	models,
	selectedModelId,
	selectedEndpoint,
	availableEndpoints,
	comparisonCandidates,
	comparisonModelKeys,
	maxComparisonModels,
	onModelSelect,
	onEndpointSelect,
	onToggleComparisonModel,
}: ModelSelectorProps) {
	const [openModel, setOpenModel] = useState(false);

	// Build model data with provider information
	const availableModels = useMemo(() => {
		const modelMap = new Map<
			string,
			{ modelId: string; displayName: string; providers: Set<string> }
		>();

		models.forEach((m) => {
			if (!modelMap.has(m.model)) {
				modelMap.set(m.model, {
					modelId: m.model,
					displayName: m.display_name || m.model,
					providers: new Set(),
				});
			}
			modelMap.get(m.model)!.providers.add(m.provider);
		});

		return Array.from(modelMap.values())
			.map((m) => ({
				...m,
				providers: Array.from(m.providers).sort(),
			}))
			.sort((a, b) => a.displayName.localeCompare(b.displayName));
	}, [models]);

	const selectedComparisonModels = useMemo(() => {
		const map = new Map(comparisonCandidates.map((candidate) => [candidate.key, candidate]));
		return comparisonModelKeys
			.map((key) => map.get(key))
			.filter((candidate): candidate is ComparisonCandidate => Boolean(candidate));
	}, [comparisonCandidates, comparisonModelKeys]);

	const selectorLabel = useMemo(() => {
		if (selectedComparisonModels.length === 0) {
			return "Select models...";
		}
		if (selectedComparisonModels.length === 1) {
			return `${selectedComparisonModels[0].displayName} (1/${maxComparisonModels})`;
		}
		return `${selectedComparisonModels.length} models selected (${selectedComparisonModels.length}/${maxComparisonModels})`;
	}, [selectedComparisonModels, maxComparisonModels]);

	return (
		<Card>
			<CardHeader className="pb-4">
				<CardTitle className="flex items-center justify-between gap-3 flex-wrap">
					<span>Model Selection</span>
					<Badge variant="outline" className="text-[11px]">
						{availableModels.length.toLocaleString()} models
					</Badge>
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-5">
				<div className="space-y-2">
					<Label htmlFor="model-select">Select Models (primary + comparison)</Label>
					<Popover open={openModel} onOpenChange={setOpenModel}>
						<PopoverTrigger asChild>
							<Button
								variant="outline"
								role="combobox"
								aria-expanded={openModel}
								className="w-full justify-between"
							>
								{selectorLabel}
								<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-[min(620px,95vw)] p-0">
							<Command>
								<CommandInput placeholder="Search models..." />
								<CommandList>
									<CommandEmpty>No model found.</CommandEmpty>
								{selectedEndpoint && comparisonCandidates.length > 0 ? (
										<>
											{selectedComparisonModels.length > 0 && (
												<CommandGroup heading="Selected">
													{selectedComparisonModels.map((model) => {
														return (
															<CommandItem
																key={`selected-${model.key}`}
																value={`selected ${model.displayName} ${model.provider}`}
																onSelect={() => {
																	onToggleComparisonModel(model.key);
																	setTimeout(() => setOpenModel(true), 0);
																}}
																className="flex items-center justify-between gap-2"
															>
																<div className="flex items-start gap-2">
																	<Check className="h-4 w-4 mt-0.5 opacity-100" />
																<div className="flex flex-col">
																	<span className="text-sm">{model.displayName}</span>
																	<span className="text-xs text-muted-foreground">
																		{formatProviderLabel(model.provider)}
																	</span>
																</div>
																</div>
																<Logo
																	id={model.provider}
																	width={16}
																	height={16}
																	className="w-4 h-4"
																	fallback={<div className="w-4 h-4 bg-muted rounded" />}
																/>
															</CommandItem>
														);
													})}
												</CommandGroup>
											)}

											<CommandGroup heading="Models">
												{comparisonCandidates.map((candidate) => {
													const isSelected = comparisonModelKeys.includes(candidate.key);
													const atLimit =
														!isSelected &&
														comparisonModelKeys.length >= maxComparisonModels;

													return (
														<CommandItem
															key={candidate.key}
															value={`all ${candidate.displayName} ${candidate.provider}`}
															onSelect={() => {
																if (!atLimit) {
																	onToggleComparisonModel(candidate.key);
																	setTimeout(() => setOpenModel(true), 0);
																}
															}}
															disabled={atLimit}
															className="flex items-center justify-between gap-2"
														>
															<div className="flex items-start gap-2">
																<Check
																	className={cn(
																		"h-4 w-4 mt-0.5",
																		isSelected ? "opacity-100" : "opacity-0"
																	)}
																/>
																<div className="flex flex-col">
																	<span className="text-sm">{candidate.displayName}</span>
																	<span className="text-xs text-muted-foreground">
																		{formatProviderLabel(candidate.provider)}
																	</span>
																</div>
															</div>
															<Logo
																id={candidate.provider}
																width={16}
																height={16}
																className="w-4 h-4"
																fallback={<div className="w-4 h-4 bg-muted rounded" />}
															/>
														</CommandItem>
													);
												})}
											</CommandGroup>
										</>
									) : (
										<CommandGroup heading="Models">
											{availableModels.map((model) => (
												<CommandItem
													key={model.modelId}
													value={model.displayName}
													onSelect={() => {
														onModelSelect(model.modelId);
														setTimeout(() => setOpenModel(true), 0);
													}}
													className="flex items-center justify-between"
												>
													<div className="flex items-center">
														<Check
															className={cn(
																"mr-2 h-4 w-4",
																selectedModelId === model.modelId
																	? "opacity-100"
																	: "opacity-0"
															)}
														/>
														{model.displayName}
													</div>
													<div className="flex items-center gap-1 ml-4">
														{model.providers.map((provider) => (
															<Logo
																key={provider}
																id={provider}
																width={16}
																height={16}
																className="w-4 h-4"
																fallback={<div className="w-4 h-4 bg-muted rounded" />}
															/>
														))}
													</div>
												</CommandItem>
											))}
										</CommandGroup>
									)}
								</CommandList>
							</Command>
						</PopoverContent>
					</Popover>
				</div>

				{selectedComparisonModels.length > 0 && (
					<div className="flex flex-wrap gap-2 rounded-lg border bg-muted/20 p-3">
						{selectedComparisonModels.map((model) => {
							return (
								<Badge
									key={model.key}
									variant="secondary"
									className="flex items-center gap-1.5 py-1"
								>
									<span className="max-w-[220px] truncate">{model.displayName}</span>
									<button
										type="button"
										className="inline-flex items-center"
										onClick={() => onToggleComparisonModel(model.key)}
										aria-label={`Remove ${model.displayName} from comparison`}
									>
										<X className="h-3 w-3" />
									</button>
								</Badge>
							);
						})}
					</div>
				)}

				{selectedModelId && availableEndpoints.length > 0 && (
					<div className="space-y-2">
						<Label htmlFor="endpoint-select">Select Endpoint</Label>
						<Select
							value={selectedEndpoint}
							onValueChange={onEndpointSelect}
						>
							<SelectTrigger id="endpoint-select">
								<SelectValue placeholder="Select endpoint..." />
							</SelectTrigger>
							<SelectContent>
								{availableEndpoints.map((endpoint) => (
									<SelectItem key={endpoint} value={endpoint}>
										{endpoint}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
