# AI Toolcalls API Reference

---
title: Learning Catalyst AI Toolcalls API Reference
description: Python abstract classes and interfaces for AI function calling tools and orchestration
version: 1.0.0
last_updated: 2025-10-12
difficulty: "Advanced"
estimated_time: "45 minutes"
---

## Overview

This document provides comprehensive API reference for Learning Catalyst's AI tool calling system, defining Python abstract classes and interfaces for AI function calling tools, orchestration patterns, and agent coordination. The interfaces enable AI providers to intelligently invoke application functions to deliver sophisticated learning assistance while maintaining clean architectural boundaries.

**For detailed AI system architecture patterns and multi-agent coordination mechanisms, see the [AI Integration Architecture](../system-architecture/ai-integration.md) document.**

## Tool Call Architecture

### Core Tool Interface Design

The AI tool calling system is built around abstract base classes that define contracts for AI tools, tool execution, and result processing. All tools must implement these interfaces to ensure consistent behavior and seamless integration with AI providers.

**Design Principles:**
- **Abstract Base Classes**: All tool interfaces inherit from `abc.ABC` with clear method contracts
- **Type Safety**: Comprehensive type hints using Python's `typing` module
- **Async-First Design**: All operations are asynchronous to maintain CLI responsiveness
- **Result Validation**: Structured result validation and error handling
- **Agent Orchestration**: Support for multi-agent tool coordination and execution

## Core Tool Interfaces

### Base Tool Interface

The foundation of the tool system is the `AITool` abstract class that defines the contract for all AI tools:

```python
from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any, Union, Callable
from dataclasses import dataclass
from enum import Enum
import asyncio

class ToolCategory(Enum):
    """Tool categories for organization and discovery"""
    LEARNING = "learning"
    ASSESSMENT = "assessment"
    MULTI_AGENT = "multi_agent"
    DATA_MANAGEMENT = "data_management"
    ANALYTICS = "analytics"
    SESSION_MANAGEMENT = "session_management"

class ToolExecutionStatus(Enum):
    """Tool execution status"""
    PENDING = "pending"
    EXECUTING = "executing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

@dataclass
class ToolParameters:
    """Parameters for tool execution"""
    name: str
    value: Any
    type: str
    required: bool = True
    description: str = ""

@dataclass
class ToolResult:
    """Result from tool execution"""
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    execution_time: float = 0.0
    tokens_used: int = 0
    metadata: Dict[str, Any] = None

class AITool(ABC):
    """Abstract base class for all AI tools"""

    def __init__(self):
        self._status = ToolExecutionStatus.PENDING
        self._execution_context: Optional[Dict[str, Any]] = None

    @property
    @abstractmethod
    def name(self) -> str:
        """Return the tool name"""
        pass

    @property
    @abstractmethod
    def category(self) -> ToolCategory:
        """Return the tool category"""
        pass

    @property
    @abstractmethod
    def description(self) -> str:
        """Return the tool description"""
        pass

    @abstractmethod
    def get_parameters(self) -> List[ToolParameters]:
        """
        Get the parameters that this tool accepts.

        Returns:
            List of ToolParameter objects
        """
        pass

    @abstractmethod
    async def execute(self, parameters: Dict[str, Any], context: Dict[str, Any]) -> ToolResult:
        """
        Execute the tool with given parameters and context.

        Args:
            parameters: Tool parameters as name-value pairs
            context: Execution context (user info, session data, etc.)

        Returns:
            ToolResult with execution outcome

        Raises:
            ToolExecutionError: If tool execution fails
            ValidationError: If parameters are invalid
        """
        pass

    @abstractmethod
    async def validate_parameters(self, parameters: Dict[str, Any]) -> bool:
        """
        Validate tool parameters.

        Args:
            parameters: Parameters to validate

        Returns:
            bool: True if parameters are valid
        """
        pass

    async def get_status(self) -> ToolExecutionStatus:
        """Get current tool execution status"""
        return self._status

    def set_execution_context(self, context: Dict[str, Any]) -> None:
        """Set execution context for the tool"""
        self._execution_context = context
```

### Tool Registry Interface

```python
class ToolRegistry(ABC):
    """Abstract interface for tool registration and management"""

    @abstractmethod
    async def register_tool(self, tool: AITool) -> bool:
        """
        Register a new tool.

        Args:
            tool: Tool instance to register

        Returns:
            bool: True if registration successful
        """
        pass

    @abstractmethod
    async def unregister_tool(self, tool_name: str) -> bool:
        """
        Unregister a tool.

        Args:
            tool_name: Name of tool to unregister

        Returns:
            bool: True if unregistration successful
        """
        pass

    @abstractmethod
    async def get_tool(self, tool_name: str) -> Optional[AITool]:
        """
        Get registered tool by name.

        Args:
            tool_name: Name of tool

        Returns:
            AITool instance or None if not found
        """
        pass

    @abstractmethod
    async def list_tools(self, category: Optional[ToolCategory] = None) -> List[str]:
        """
        List all registered tools, optionally filtered by category.

        Args:
            category: Optional category filter

        Returns:
            List of tool names
        """
        pass

    @abstractmethod
    async def discover_tools_for_intent(self, intent: str, context: Dict[str, Any]) -> List[AITool]:
        """
        Discover appropriate tools for a given intent.

        Args:
            intent: User intent description
            context: Execution context

        Returns:
            List of suitable tools
        """
        pass
```

### Tool Orchestration Interface

```python
@dataclass
class ToolExecutionPlan:
    """Plan for executing multiple tools"""
    tools: List[AITool]
    execution_order: List[str]  # Tool names in execution order
    dependencies: Dict[str, List[str]]  # Tool dependencies
    parallel_groups: List[List[str]]  # Groups that can execute in parallel

class ToolOrchestrator(ABC):
    """Abstract interface for tool orchestration and execution"""

    @abstractmethod
    async def create_execution_plan(
        self,
        tools: List[AITool],
        parameters: Dict[str, Dict[str, Any]],
        context: Dict[str, Any]
    ) -> ToolExecutionPlan:
        """
        Create execution plan for multiple tools.

        Args:
            tools: List of tools to execute
            parameters: Parameters for each tool
            context: Execution context

        Returns:
            ToolExecutionPlan with execution strategy
        """
        pass

    @abstractmethod
    async def execute_plan(
        self,
        plan: ToolExecutionPlan,
        parameters: Dict[str, Dict[str, Any]],
        context: Dict[str, Any]
    ) -> Dict[str, ToolResult]:
        """
        Execute a tool execution plan.

        Args:
            plan: Execution plan
            parameters: Parameters for each tool
            context: Execution context

        Returns:
            Dictionary mapping tool names to results
        """
        pass

    @abstractmethod
    async def execute_parallel(
        self,
        tools: List[AITool],
        parameters: Dict[str, Dict[str, Any]],
        context: Dict[str, Any]
    ) -> Dict[str, ToolResult]:
        """
        Execute multiple tools in parallel.

        Args:
            tools: List of tools to execute
            parameters: Parameters for each tool
            context: Execution context

        Returns:
            Dictionary mapping tool names to results
        """
        pass

    @abstractmethod
    async def execute_sequential(
        self,
        tools: List[AITool],
        parameters: Dict[str, Dict[str, Any]],
        context: Dict[str, Any]
    ) -> Dict[str, ToolResult]:
        """
        Execute multiple tools sequentially.

        Args:
            tools: List of tools to execute in order
            parameters: Parameters for each tool
            context: Execution context

        Returns:
            Dictionary mapping tool names to results
        """
        pass
```
    "data": {"description": "Tool-specific response data"},
    "metadata": {
      "type": "object",
      "properties": {
        "tokens_used": {"type": "integer"},
        "processing_time": {"type": "number"},
        "user_context_applied": {"type": "boolean"}
      }
    }
  }
}
```

### Core Learning Tools

#### Explain Concept Tool

**Purpose**: Generate adaptive explanations for learning concepts with context awareness and multi-agent support.

**Key Parameters**:
- `concept` (required): The concept or topic to explain
- `detail_level`: "simple" | "intermediate" | "detailed" (default: "intermediate")
- `learning_style`: "visual" | "auditory" | "kinesthetic" | "reading"
- `include_examples`: Include practical examples (default: false)
- `user_level`: "beginner" | "intermediate" | "advanced"
- `agent_collaboration`: Multi-agent collaboration configuration

**Usage Examples**:
```python
# Basic explanation
tool_call = {
  "name": "explain_concept",
  "parameters": {
    "concept": "machine learning",
    "detail_level": "intermediate",
    "include_examples": true
  }
}

# Multi-agent collaborative explanation
tool_call = {
  "name": "explain_concept",
  "parameters": {
    "concept": "React Hooks",
    "detail_level": "intermediate",
    "user_level": "intermediate",
    "learning_style": "visual",
    "agent_collaboration": {
      "enable_multi_agent": true,
      "primary_agent_type": "tutor",
      "supporting_agents": ["visualizer", "assessor"],
      "collaboration_style": "parallel"
    }
  }
}
```

#### Generate Quiz Tool

**Purpose**: Create adaptive assessment questions based on user knowledge level and topic with agent-assisted design.

**Key Parameters**:
- `topic` (required): The topic for the quiz questions
- `question_count`: Number of questions (1-20, default: 5)
- `difficulty`: "beginner" | "intermediate" | "advanced" | "adaptive" (default: "adaptive")
- `question_types`: ["multiple_choice", "short_answer", "true_false", "coding", "essay"]
- `user_context`: User context for adaptive question generation
- `agent_assisted_design`: Agent-assisted quiz design configuration

**Usage Examples**:
```python
# Adaptive quiz with user context
tool_call = {
  "name": "generate_quiz",
  "parameters": {
    "topic": "React Hooks",
    "question_count": 8,
    "difficulty": "adaptive",
    "user_context": {
      "mastered_concepts": ["React Components", "State Management"],
      "recent_topics": ["useState", "useEffect"],
      "skill_level": "intermediate"
    }
  }
}
```

#### Suggest Learning Tool

**Purpose**: Generate personalized learning recommendations based on user context and goals.

**Key Parameters**:
- `suggestion_type`: "topics" | "concepts" | "resources" | "next_steps" | "learning_paths" (default: "next_steps")
- `current_topic`: Current topic of study
- `user_level`: "beginner" | "intermediate" | "advanced"
- `learning_goals`: User's learning goals and objectives
- `mastered_concepts`: Concepts the user has already mastered
- `time_constraints`: Time constraints for learning

**Usage Examples**:
```python
# Get next steps suggestions
tool_call = {
  "name": "suggest_learning",
  "parameters": {
    "suggestion_type": "next_steps",
    "current_topic": "React Hooks",
    "user_level": "intermediate",
    "mastered_concepts": ["React Components", "useState", "useEffect"]
  }
}
```

#### Get Knowledge Map Tool

**Purpose**: Retrieve user's knowledge map with progress indicators and concept relationships.

**Key Parameters**:
- `user_id` (required): Unique identifier for the user
- `view_mode`: "progress" | "weak_areas" | "mastered" | "all" | "recent" (default: "progress")
- `focus_topic`: Specific topic to focus on
- `depth`: Depth of concept relationships (1-5, default: 3)
- `include_progress`: Include progress indicators (default: true)
- `filter_by`: Filter by difficulty, category, proficiency

**Usage Examples**:
```python
# Get overall progress map
tool_call = {
  "name": "get_knowledge_map",
  "parameters": {
    "user_id": "user_123",
    "view_mode": "progress",
    "depth": 3,
    "include_progress": true
  }
}
```

### Multi-Agent Learning Tools

#### Create Learning Agent Tool

**Purpose**: Create and configure specialized learning agents using AutoGen framework.

**Key Parameters**:
- `agent_type` (required): "tutor" | "assessor" | "recommender" | "progress_monitor" | "learning_companion"
- `agent_config` (required): Agent configuration including name, specialization, personality, capabilities
- `user_context`: User context for agent personalization

**Usage Examples**:
```python
# Create a tutor agent for mathematics
tool_call = {
  "name": "create_learning_agent",
  "parameters": {
    "agent_type": "tutor",
    "agent_config": {
      "name": "Math Tutor",
      "specialization": "Mathematics and Problem Solving",
      "personality": "encouraging",
      "capabilities": ["explain", "assess", "motivate"],
      "interaction_style": "socratic"
    },
    "user_context": {
      "user_id": "user_123",
      "learning_level": "intermediate"
    }
  }
}
```

#### Orchestrate Learning Session Tool

**Purpose**: Create and manage multi-agent learning sessions using AutoGen workflow orchestration.

**Key Parameters**:
- `session_config` (required): Session configuration including name, objectives, duration, type
- `agent_participants` (required): List of agents with roles and responsibilities
- `workflow_pattern`: "sequential" | "collaborative" | "hierarchical" | "peer_review" (default: "collaborative")
- `context_data`: Initial context and data for the session

**Usage Examples**:
```python
# Orchestrate a collaborative learning session
tool_call = {
  "name": "orchestrate_learning_session",
  "parameters": {
    "session_config": {
      "session_name": "React Hooks Deep Dive",
      "learning_objectives": [
        "Understand useState and useEffect hooks",
        "Create custom hooks"
      ],
      "duration_minutes": 60,
      "session_type": "explanation"
    },
    "agent_participants": [
      {
        "agent_id": "tutor_001",
        "role": "primary",
        "responsibilities": ["explain_concepts", "provide_examples"]
      },
      {
        "agent_id": "assessor_001",
        "role": "secondary",
        "responsibilities": ["assess_understanding", "create_quizzes"]
      }
    ],
    "workflow_pattern": "collaborative"
  }
}
```

#### Manage Agent Collaboration Tool

**Purpose**: Manage real-time collaboration and coordination between learning agents.

**Key Parameters**:
- `action` (required): "initiate_collaboration" | "coordinate_handoff" | "resolve_conflicts" | "sync_context" | "evaluate_collaboration"
- `session_id` (required): Learning session identifier
- `agent_coordination`: Agent coordination configuration
- `collaboration_context`: Context for the collaboration

**Usage Examples**:
```python
# Coordinate agent handoff in a learning session
tool_call = {
  "name": "manage_agent_collaboration",
  "parameters": {
    "action": "coordinate_handoff",
    "session_id": "session_456",
    "agent_coordination": {
      "primary_agent": "tutor_001",
      "supporting_agents": ["assessor_001"],
      "coordination_strategy": "sequential_handoff"
    }
  }
}
```

### Data Management Tools

#### Get Configuration Tool

**Purpose**: Retrieve user configuration and settings for AI decision making.

**Key Parameters**:
- `config_type`: "ai" | "preferences" | "session" | "all" (default: "all")
- `specific_key`: Specific configuration key (supports dot notation)
- `user_id`: User identifier for user-specific configuration
- `include_defaults`: Include default values (default: true)

**Usage Examples**:
```python
# Get all configuration
tool_call = {
  "name": "get_configuration",
  "parameters": {
    "config_type": "all",
    "include_defaults": true
  }
}
```

#### Update Configuration Tool

**Purpose**: Update user configuration with validation and persistence.

**Key Parameters**:
- `key` (required): Configuration key (supports dot notation)
- `value` (required): New value for the configuration key
- `user_id`: User identifier for user-specific configuration
- `validate`: Validate the configuration value (default: true)
- `persist`: Persist the change to storage (default: true)

**Usage Examples**:
```python
# Update AI provider
tool_call = {
  "name": "update_configuration",
  "parameters": {
    "key": "ai.default_provider",
    "value": "openai",
    "validate": true,
    "persist": true
  }
}
```

#### Manage AI Provider Tool

**Purpose**: Manage AI provider configuration, testing, and operations.

**Key Parameters**:
- `action` (required): "configure" | "test" | "list" | "switch" | "remove" | "get_models"
- `provider_name`: Name of the AI provider
- `api_key`: API key for the provider (sensitive)
- `config_data`: Additional configuration data
- `test_model`: Specific model to test

**Usage Examples**:
```python
# Configure a new provider
tool_call = {
  "name": "manage_ai_provider",
  "parameters": {
    "action": "configure",
    "provider_name": "openai",
    "api_key": "sk-api-key-here",
    "config_data": {
      "default_model": "gpt-4",
      "timeout": 30,
      "max_retries": 3
    }
  }
}
```

### Analytics & Progress Tracking Tools

#### Get Learning Statistics Tool

**Purpose**: Retrieve comprehensive learning analytics and progress data.

**Key Parameters**:
- `user_id` (required): User identifier for statistics retrieval
- `time_period`: "today" | "week" | "month" | "year" | "all" | "custom" (default: "week")
- `custom_date_range`: Custom date range for statistics
- `topic_filter`: Filter statistics by specific topics
- `metric_types`: ["progress", "usage", "performance", "engagement", "costs"]
- `include_comparison`: Include comparison with previous period (default: false)

**Usage Examples**:
```python
# Get weekly statistics
tool_call = {
  "name": "get_learning_statistics",
  "parameters": {
    "user_id": "user_123",
    "time_period": "week",
    "metric_types": ["progress", "usage", "performance"],
    "include_comparison": true
  }
}
```

### Session Management Tools

#### Manage Session Tool

**Purpose**: Manage learning session state and context.

**Key Parameters**:
- `action` (required): "create" | "update" | "clear" | "save" | "restore" | "get"
- `session_data`: Session data for create/update actions
- `context_updates`: Specific context updates for update action
- `session_id`: Session identifier for get/restore actions
- `checkpoint_name`: Name for save/checkpoint actions

**Usage Examples**:
```python
# Create new session
tool_call = {
  "name": "manage_session",
  "parameters": {
    "action": "create",
    "session_data": {
      "user_id": "user_123",
      "current_topic": "React Hooks",
      "learning_goals": ["Master React development"],
      "preferences": {
        "learning_style": "visual",
        "difficulty_preference": "intermediate"
      }
    }
  }
}
```

## AI Execution Patterns

### AI Agent Intent-Based Tool Selection

**Explanation Request Patterns**:
- **Direct Explanation**: User asks "explain X" → AI Agent selects `get_concept` tool → AI generates explanation
- **Contextual Explanation**: User shows confusion → AI Agent uses `get_concept` + `get_knowledge_map` tools → AI provides enhanced explanation
- **Multi-Agent Explanation**: Complex concept → AI orchestrates multiple agents with `explain_concept` + `get_knowledge_map` → Collaborative explanation

**Assessment Request Patterns**:
- **Direct Assessment**: User asks "test me" → AI Agent selects `update_quiz` tool → Generates assessment
- **Progress Assessment**: User requests progress check → AI Agent uses `get_learning_statistics` + `update_quiz` tools → Adaptive assessment
- **Comprehensive Evaluation**: AI Agent uses `assess_knowledge` + `get_learning_statistics` + `update_quiz` tools → Multi-dimensional evaluation

**Recommendation Request Patterns**:
- **Next Steps**: User asks "what next" → AI Agent uses `get_knowledge_map` + `get_learning_statistics` tools → AI generates suggestions
- **Learning Path**: User wants curriculum guidance → AI Agent uses `get_knowledge_map` + `get_configuration` tools → Personalized path
- **Content Optimization**: User completes topic → AI Agent uses `get_configuration` + `get_learning_statistics` tools → Updates progress and suggests next content

### Execution Patterns

#### Parallel Execution

**Independent Tool Execution**:
```python
# AI executes independent tools concurrently for efficiency
parallel_tool_calls = [
  {
    "name": "get_learning_statistics",
    "parameters": {"user_id": "user_123", "time_period": "week"}
  },
  {
    "name": "get_knowledge_map",
    "parameters": {"user_id": "user_123", "view_mode": "progress"}
  }
]
# Results synthesized by AI for comprehensive response
```

#### Sequential Execution

**Context-Dependent Tool Chaining**:
```python
# AI executes tools in sequence where each depends on previous results
sequential_workflow = [
  {
    "name": "get_configuration",
    "parameters": {"config_type": "preferences", "user_id": "user_123"}
  },
  {
    "name": "explain_concept",
    "parameters": {
      "concept": "React Hooks",
      "detail_level": "previous_result.preferences.difficulty_preference",
      "learning_style": "previous_result.preferences.learning_style"
    }
  }
]
```

### Response Integration Patterns

**Learning Workflow Integration**:
1. **Context Gathering**: `get_configuration` + `get_learning_statistics` → User profile analysis
2. **Content Delivery**: `explain_concept` + `get_knowledge_map` → Personalized explanation
3. **Assessment Integration**: `generate_quiz` + `assess_knowledge` → Adaptive evaluation
4. **Progress Update**: `update_configuration` + `manage_session` → Learning progress tracking

**Multi-Agent Collaboration Integration**:
- **Consensus Building**: Multiple agent inputs synthesized through AI-driven consensus
- **Expertise Combination**: Domain-specific agent contributions integrated into comprehensive response
- **Quality Assurance**: Multiple agent reviews synthesized for quality-validated output

### Error Handling and Recovery

**Collaborative Error Resolution**:
- **Cross-Agent Validation**: Multiple agents verify results to identify potential errors
- **Fallback Strategies**: When primary tool fails, AI selects alternative approaches
- **Graceful Degradation**: Reduced functionality rather than complete failure
- **User Communication**: Clear error messages with suggested resolutions

**Adaptive Error Recovery**:
```python
# AI demonstrates adaptive error handling
error_recovery_workflow = {
  "primary_approach": {
    "tools": ["get_concept", "generate_quiz"],
    "sequence": "parallel"
  },
  "fallback_strategy": {
    "condition": "tool_failure",
    "alternative_tools": ["get_knowledge_map", "explain_concept"],
    "sequence": "sequential"
  },
  "error_communication": {
    "message": "I'm having trouble accessing some resources. Let me try a different approach.",
    "alternative_action": "provide_basic_explanation"
  }
}
```

### Performance Optimization

**Intelligent Tool Caching**:
- **User Preference Caching**: Frequently accessed configuration data cached for rapid access
- **Concept Relationship Caching**: Knowledge graph mappings cached for complex topic analysis
- **Learning Progress Caching**: Recent statistics cached for performance optimization

**Predictive Tool Pre-loading**:
- **Learning Path Prediction**: Pre-load likely-needed concepts based on learning trajectory
- **Assessment Preparation**: Pre-generate potential quiz questions based on progress
- **Resource Allocation**: Dynamically allocate computational resources based on predicted usage

## Error Handling API

### Error Response Format

All tool calls return structured error responses when failures occur:

```json
{
  "success": false,
  "error": {
    "code": {
      "type": "string",
      "enum": [
        "VALIDATION_ERROR",
        "PERMISSION_ERROR",
        "RESOURCE_NOT_FOUND",
        "PROVIDER_ERROR",
        "NETWORK_ERROR",
        "TIMEOUT_ERROR",
        "INTERNAL_ERROR",
        "RATE_LIMIT_ERROR",
        "QUOTA_EXCEEDED_ERROR"
      ]
    },
    "message": {
      "type": "string",
      "description": "Human-readable error message"
    },
    "details": {
      "type": "object",
      "description": "Additional error details and context"
    },
    "suggestions": {
      "type": "array",
      "items": {"type": "string"},
      "description": "Suggested resolutions for the error"
    }
  }
}
```

## Quick Reference Examples

### Common AI Workflows

#### Learning Workflow
```python
def learning_workflow(user_input: str, user_id: str):
    # 1. Understand user context
    context = call_tool("get_configuration", {
        "config_type": "preferences",
        "user_id": user_id
    })

    # 2. Provide personalized explanation
    explanation = call_tool("explain_concept", {
        "concept": extract_concept(user_input),
        "detail_level": context["preferences"]["difficulty_preference"],
        "learning_style": context["preferences"]["learning_style"],
        "include_examples": True
    })

    # 3. Update session context
    call_tool("manage_session", {
        "action": "update",
        "context_updates": {
            "current_activity": "learning",
            "topic_progress": {extract_concept(user_input): {"status": "in_progress"}}
        }
    })

    return explanation
```

#### Assessment Workflow
```python
def assessment_workflow(user_input: str, user_id: str):
    # 1. Get user progress
    stats = call_tool("get_learning_statistics", {
        "user_id": user_id,
        "time_period": "month"
    })

    # 2. Generate adaptive quiz
    quiz = call_tool("generate_quiz", {
        "topic": extract_topic(user_input),
        "difficulty": "adaptive",
        "user_context": {
            "skill_level": determine_skill_level(stats),
            "mastered_concepts": stats["progress_metrics"]["concepts_mastered"]
        }
    })

    return quiz
```

#### Multi-Agent Collaboration Example
```python
def collaborative_learning_session(user_id: str, topic: str):
    # 1. Create specialized agents
    tutor = call_tool("create_learning_agent", {
        "agent_type": "tutor",
        "agent_config": {
            "name": f"{topic} Tutor",
            "specialization": topic,
            "personality": "encouraging"
        }
    })

    # 2. Orchestrate collaborative session
    session = call_tool("orchestrate_learning_session", {
        "session_config": {
            "session_name": f"Collaborative {topic} Learning",
            "learning_objectives": [f"Master {topic} fundamentals"],
            "session_type": "collaborative"
        },
        "agent_participants": [
            {
                "agent_id": tutor["agent"]["agent_id"],
                "role": "primary",
                "responsibilities": ["explain_concepts", "provide_examples"]
            }
        ],
        "workflow_pattern": "collaborative"
    })

    return session
```

---

*Last updated: October 12, 2025 | Version: 1.0.0 | Category: AI Toolcalls API Reference*