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

