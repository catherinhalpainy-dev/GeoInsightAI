# GeoInsightAI Architecture


## Overview

GeoInsightAI is an AI-powered WebGIS analysis platform.

The system combines:

- React frontend
- MapLibre GL map engine
- GeoJSON spatial data
- Turf.js spatial analysis
- LangGraph Agent workflow


## System Architecture


User

↓

React Workspace

↓

GIS Interaction Layer

↓

MapLibre Engine

↓

GeoJSON Data


AI Analysis Flow:

User Request

↓

Agent Planner

↓

Structured GIS Plan

↓

Zod Validation

↓

LangGraph Workflow

↓

GIS Action Execution


## Frontend Architecture


WorkspacePage

responsible for:

- application state
- panel management
- GIS interaction


MapView

responsible for:

- map rendering
- layer management
- spatial interaction


## Backend Architecture


Agent workflow:

Planner

↓

Review

↓

Approve / Reject

↓

Execute

