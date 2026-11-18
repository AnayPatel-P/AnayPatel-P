# Learning tracker

The brief picks the next unchecked concept each day (rotating tracks), unless the news makes another one timely. Mark `[x]` yourself or tell Claude "I did the exercise".

## Track A — LLM engineering
- [ ] Tokenization and why it breaks number handling
- [ ] Embeddings and vector similarity (cosine vs dot product, normalization)
- [ ] RAG pipeline anatomy: chunking, retrieval, reranking, generation
- [ ] Retrieval evals: recall@k, MRR, building a golden set
- [ ] LLM-as-judge: how to build one and its failure modes
- [ ] Structured outputs and tool calling
- [ ] Agent loops: planning, tool use, stopping conditions
- [ ] MCP: servers, tools, resources — when to build one
- [ ] Prompt caching and cost/latency engineering
- [x] Guardrails: number fidelity, grounding checks, refusal design (2026-11-17, as "provenance guardrails")
- [ ] Fine-tuning vs prompting vs RAG: decision framework
- [ ] LoRA / QLoRA intuition
- [ ] Inference: KV cache, batching, quantization, speculative decoding
- [ ] Context engineering for long-running agents

## Track B — ML engineering & MLOps
- [ ] Experiment tracking with MLflow: what to log and why
- [ ] Calibration: reliability diagrams, Platt vs isotonic
- [ ] Data leakage patterns in tabular ML
- [ ] Feature stores and training/serving skew
- [ ] Model monitoring: drift (PSI, KS) and alerting
- [ ] Gradient boosting internals (why XGBoost wins on tabular)
- [ ] Probabilistic forecasting and proper scoring rules (CRPS, log loss)
- [ ] Bayesian hierarchical models and partial pooling
- [ ] CI for ML: testing data, models, and services
- [ ] Serving: batch vs online, latency budgets, Docker for ML

## Track C — Forward-deployed engineering
- [ ] Scoping an AI project with a customer: the first meeting
- [ ] Turning a vague ask into an eval set
- [ ] Demo craft: building a convincing 2-day prototype
- [ ] Writing a one-page technical proposal
- [ ] Handling "the model is wrong" escalations
- [ ] Measuring ROI of an AI deployment

## Track D — Math & foundations refresh
- [ ] Attention as soft dictionary lookup
- [ ] Cross-entropy, KL divergence, and why LLM loss is what it is
- [ ] Bias–variance in the age of overparameterized models
- [ ] Information retrieval scoring: BM25 intuition

## Covered
<!-- YYYY-MM-DD — concept (track) — issue link -->
- 2026-11-17 — Provenance guardrails (A) — issues/2026-11-17.html #11

## Exercises assigned
<!-- YYYY-MM-DD — exercise — status: open / done -->
- 2026-11-17 — provenance.py: check_numbers() with 6 acceptance tests — status: open

## Rabbit holes
<!-- Follow-up threads worth continuing -->
- Candidates queued from No. 1: PSI/delayed-label monitoring for credit models (work pitch), SPILLWAY paper deep dive, model routing / advisor pattern eval
