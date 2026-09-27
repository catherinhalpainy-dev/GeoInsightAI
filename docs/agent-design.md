# GeoInsight Agent Design


## Motivation

Traditional GIS systems require users to manually operate:

- filters
- layers
- visualization
- map navigation


GeoInsight AI introduces an Agent layer
to convert natural language requests into GIS operations.


## Agent Pipeline


User

↓

LLM

↓

Function Calling

↓

AgentPlan

↓

Zod Validation

↓

LangGraph Workflow

↓

SSE lifecycle events

↓

Frontend Execution


## Current Supported Commands


### Data Filtering

apply_filter


### Layer Style

update_layer_style


### Map Navigation

fit_map_bounds


### Page Navigation

navigate_statistics



## Safety Design


The model never directly modifies the application.

All operations must pass:

LLM output

↓

Schema validation

↓

Workflow approval

↓

Execution


## Streaming Architecture

The browser first creates an Agent run with `POST /api/agent/runs`, then subscribes with native `EventSource` at `GET /api/agent/runs/:runId/events`. Approval is submitted to `POST /api/agent/runs/:runId/approval` and resumes the same LangGraph `thread_id`.

`AgentRunManager` owns run state independently of subscribers. Each run has a cryptographically random run id, timestamps, status, a monotonic event counter, a bounded replay buffer, subscriber callbacks, an abort controller, graph result state, and approval state. The SSE response is only a subscriber and is removed on request close.

Lifecycle events are `connected`, `planning_started`, `model_delta`, `plan_ready`, `waiting_approval`, `approval_received`, `graph_resumed`, `graph_completed`, `run_rejected`, and `run_error`. Every event uses the same `{ id, runId, timestamp, type, payload }` envelope and is runtime-validated with Zod on both sides of the transport.

The Planner uses the provider's real streamed completion. Natural-language content becomes `model_delta`; tool-call argument fragments are accumulated internally by tool-call index. Commands are never executed from partial JSON. The complete arguments pass `JSON.parse`, `AgentPlanSchema`, normalization, and deterministic precondition checks before `plan_ready` is emitted.

