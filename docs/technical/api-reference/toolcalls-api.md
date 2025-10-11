# AI Toolcalls API Reference

---
title: Learning Catalyst AI Toolcalls API Reference
description: Complete API specification for AI function calling tools, interfaces, and integration patterns
version: 1.0.0
last_updated: 2025-10-10
difficulty: "Advanced"
estimated_time: "60 minutes"
---

## Overview

This document provides comprehensive API reference for Learning Catalyst's AI tool calling system. It defines the complete interface specification for AI function calling tools, including schemas, parameters, response formats, error handling, and integration patterns. The API enables AI providers to intelligently invoke application functions to deliver sophisticated learning assistance while maintaining clean architectural boundaries.

The system is powered by **Microsoft AutoGen**, a multi-agent orchestration framework that enables collaborative learning experiences through specialized learning agents. AutoGen provides the underlying infrastructure for agent creation, conversation management, and workflow orchestration, allowing Learning Catalyst to deliver personalized, adaptive learning experiences through coordinated multi-agent interactions.

## API Architecture

### Tool Calling Interface Architecture

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    AI Tool Calling API                            │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                AutoGen Agent Orchestration Layer             │   │
│  │                                                              │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  │   │
│  │  │ Learning Agent  │  │ Conversation    │  │ Workflow      │  │   │
│  │  │ Management      │  │ Orchestration   │  │ Coordination  │  │   │
│  │  └─────────────────┘  └─────────────────┘  └──────────────┘  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              │ Tool Schema Layer                   │
│                              ▼                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                Tool Schema Definition Layer                  │   │
│  │                                                              │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  │   │
│  │  │ Tool Interface │  │ Parameter       │  │ Response      │  │   │
│  │  │ Definitions    │  │ Validation      │  │ Schemas       │  │   │
│  │  └─────────────────┘  └─────────────────┘  └──────────────┘  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              │ Execution Layer                     │
│                              ▼                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                Tool Execution Layer                           │   │
│  │                                                              │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  │   │
│  │  │ Function Call   │  │ Error Handling  │  │ Result        │  │   │
│  │  │ Processing      │  │ & Recovery      │  │ Processing    │   │   │
│  │  └─────────────────┘  └─────────────────┘  └──────────────┘  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              │ Provider Integration                │
│                              ▼                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                Provider Integration Layer                     │   │
│  │                                                              │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  │   │
│  │  │ Protocol        │  │ Response        │  │ Error         │  │   │
│  │  │ Translation     │  │ Normalization   │  │ Normalization │  │   │
│  │  └─────────────────┘  └─────────────────┘  └──────────────┘  │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

#### **AutoGen Agent Orchestration Layer**
The AutoGen layer provides multi-agent capabilities that enable sophisticated learning workflows:
- **Learning Agent Management**: Creation and coordination of specialized learning agents (tutor, assessor, recommender)
- **Conversation Orchestration**: Managing multi-agent conversations for comprehensive learning support
- **Workflow Coordination**: Orchestrating complex learning workflows across multiple agents
- **Context Sharing**: Maintaining shared learning context across agent interactions

## Tool Summary Index

### Quick Reference Table

| Category | Tool Name | Primary Purpose | Key Parameters | AutoGen Enhanced | Common Use Cases |
|----------|-----------|----------------|----------------|-----------------|------------------|
| **Core Learning** | `explain_concept` | Generate adaptive explanations | `concept`, `detail_level`, `learning_style` | ✅ Yes | Concept learning, contextual explanations |
| **Core Learning** | `generate_quiz` | Create adaptive assessment questions | `topic`, `question_count`, `difficulty` | ✅ Yes | Knowledge testing, skill assessment |
| **Core Learning** | `suggest_learning` | Generate personalized recommendations | `suggestion_type`, `user_level`, `learning_goals` | ❌ No | Learning path planning, next steps |
| **Core Learning** | `get_knowledge_map` | Retrieve user's knowledge graph | `user_id`, `view_mode`, `focus_topic` | ❌ No | Progress visualization, knowledge gaps |
| **Multi-Agent** | `create_learning_agent` | Create specialized learning agents | `agent_type`, `agent_config`, `user_context` | ✅ Yes | Agent setup, specialized tutoring |
| **Multi-Agent** | `orchestrate_learning_session` | Manage multi-agent learning sessions | `session_config`, `agent_participants`, `workflow_pattern` | ✅ Yes | Collaborative learning, complex workflows |
| **Multi-Agent** | `manage_agent_collaboration` | Coordinate agent interactions | `action`, `session_id`, `agent_coordination` | ✅ Yes | Agent coordination, conflict resolution |
| **Data Management** | `get_configuration` | Retrieve user settings and preferences | `config_type`, `specific_key`, `user_id` | ❌ No | Context gathering, personalization |
| **Data Management** | `update_configuration` | Update user configuration | `key`, `value`, `validate`, `persist` | ❌ No | Settings management, preferences |
| **Data Management** | `manage_ai_provider` | Configure and test AI providers | `action`, `provider_name`, `api_key` | ❌ No | Provider setup, connectivity testing |
| **Analytics** | `get_learning_statistics` | Retrieve comprehensive learning analytics | `user_id`, `time_period`, `metric_types` | ❌ No | Progress tracking, performance analysis |
| **Session Management** | `manage_session` | Manage learning session state and context | `action`, `session_data`, `context_updates` | ❌ No | Session persistence, context management |

### Tool Categories Overview

#### 🎯 **Core Learning Tools**
Essential tools for fundamental learning operations:
- **Explain Concept**: Adaptive, context-aware explanations with multi-agent support
- **Generate Quiz**: Personalized assessments with agent-assisted design
- **Suggest Learning**: Intelligent recommendations for learning paths
- **Get Knowledge Map**: Visualize learning progress and concept relationships

#### 🤖 **Multi-Agent Learning Tools**
AutoGen-powered collaborative learning capabilities:
- **Create Learning Agent**: Specialized agents for different learning roles
- **Orchestrate Learning Session**: Complex multi-agent workflow management
- **Manage Agent Collaboration**: Real-time agent coordination and handoffs

#### ⚙️ **Data Access & Management Tools**
Configuration and data management operations:
- **Get Configuration**: Retrieve user settings and preferences
- **Update Configuration**: Manage user configuration with validation
- **Manage AI Provider**: Configure and test AI provider connections

#### 📊 **Analytics & Progress Tracking Tools**
Comprehensive learning analytics and monitoring:
- **Get Learning Statistics**: Detailed progress, usage, and performance metrics

#### 🔄 **Session & Context Management Tools**
Session persistence and context optimization:
- **Manage Session**: Create, update, save, and restore learning sessions

### AutoGen Integration Indicators

| Tool | AutoGen Features | Collaboration Patterns | Agent Types |
|------|------------------|----------------------|-------------|
| `explain_concept` | ✅ Multi-agent explanations | Sequential, Parallel, Consensus | Tutor, Expert, Visualizer |
| `generate_quiz` | ✅ Agent-assisted design | Sequential Review, Peer Review | Assessor, Expert, Analyst |
| `create_learning_agent` | ✅ Agent lifecycle management | N/A | Tutor, Assessor, Recommender |
| `orchestrate_learning_session` | ✅ Workflow orchestration | Collaborative, Hierarchical | All agent types |
| `manage_agent_collaboration` | ✅ Real-time coordination | Handoff, Consensus Building | All active agents |

## Core Learning Tools API

### Explain Concept Tool

#### Tool Definition
```json
{
  "name": "explain_concept",
  "description": "Generate adaptive explanations for learning concepts with context awareness",
  "parameters": {
    "type": "object",
    "properties": {
      "concept": {
        "type": "string",
        "description": "The concept or topic to explain",
        "minLength": 1,
        "maxLength": 200
      },
      "detail_level": {
        "type": "string",
        "enum": ["simple", "intermediate", "detailed"],
        "description": "Level of detail for the explanation",
        "default": "intermediate"
      },
      "context_topic": {
        "type": "string",
        "description": "Related topic or context for the explanation",
        "maxLength": 200
      },
      "learning_style": {
        "type": "string",
        "enum": ["visual", "auditory", "kinesthetic", "reading"],
        "description": "Preferred learning style"
      },
      "include_examples": {
        "type": "boolean",
        "description": "Whether to include practical examples",
        "default": false
      },
      "user_level": {
        "type": "string",
        "enum": ["beginner", "intermediate", "advanced"],
        "description": "User's knowledge level"
      },
      "agent_collaboration": {
        "type": "object",
        "description": "Agent collaboration configuration for enhanced explanations",
        "properties": {
          "enable_multi_agent": {
            "type": "boolean",
            "description": "Enable multi-agent collaboration for explanation",
            "default": false
          },
          "primary_agent_type": {
            "type": "string",
            "enum": ["tutor", "expert", "visualizer"],
            "description": "Primary agent responsible for the explanation"
          },
          "supporting_agents": {
            "type": "array",
            "items": {
              "type": "string",
              "enum": ["tutor", "assessor", "recommender", "visualizer"]
            },
            "description": "Supporting agents that contribute to the explanation"
          },
          "collaboration_style": {
            "type": "string",
            "enum": ["sequential", "parallel", "peer_review", "consensus"],
            "description": "How agents should collaborate on the explanation",
            "default": "sequential"
          }
        }
      }
    },
    "required": ["concept"]
  }
}
```

#### Response Schema
```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "description": "Whether the explanation was generated successfully"
    },
    "explanation": {
      "type": "object",
      "properties": {
        "concept": {
          "type": "string",
          "description": "The concept that was explained"
        },
        "content": {
          "type": "string",
          "description": "The generated explanation content"
        },
        "detail_level": {
          "type": "string",
          "description": "The detail level used for the explanation"
        },
        "examples": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "title": {"type": "string"},
              "description": {"type": "string"},
              "code_example": {"type": "string"}
            }
          },
          "description": "Practical examples included in the explanation"
        },
        "related_concepts": {
          "type": "array",
          "items": {"type": "string"},
          "description": "Related concepts for further learning"
        },
        "difficulty_assessment": {
          "type": "object",
          "properties": {
            "estimated_time": {"type": "integer"},
            "prerequisite_knowledge": {"type": "array", "items": {"type": "string"}},
            "complexity_score": {"type": "number", "minimum": 1, "maximum": 10}
          }
        }
      }
    },
    "metadata": {
      "type": "object",
      "properties": {
        "tokens_used": {"type": "integer"},
        "processing_time": {"type": "number"},
        "user_context_applied": {"type": "boolean"},
        "agent_collaboration_enabled": {"type": "boolean"}
      }
    },
    "agent_collaboration": {
      "type": "object",
      "description": "Multi-agent collaboration details (when enabled)",
      "properties": {
        "primary_agent": {
          "type": "object",
          "properties": {
            "agent_id": {"type": "string"},
            "agent_type": {"type": "string"},
            "contribution": {"type": "string"},
            "confidence": {"type": "number"}
          }
        },
        "supporting_agents": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "agent_id": {"type": "string"},
              "agent_type": {"type": "string"},
              "contribution": {"type": "string"},
              "enhancements": {"type": "array", "items": {"type": "string"}}
            }
          }
        },
        "collaboration_summary": {
          "type": "string",
          "description": "Summary of how agents collaborated on this explanation"
        },
        "consensus_level": {
          "type": "number",
          "minimum": 0.0,
          "maximum": 1.0,
          "description": "Level of agreement between collaborating agents"
        }
      }
    }
  }
}
```

#### Usage Examples
```python
# Basic concept explanation
tool_call = {
  "name": "explain_concept",
  "parameters": {
    "concept": "machine learning",
    "detail_level": "intermediate",
    "include_examples": true
  }
}

# Context-aware explanation
tool_call = {
  "name": "explain_concept",
  "parameters": {
    "concept": "supervised learning",
    "context_topic": "machine learning",
    "user_level": "beginner",
    "learning_style": "visual",
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
    "include_examples": true,
    "agent_collaboration": {
      "enable_multi_agent": true,
      "primary_agent_type": "tutor",
      "supporting_agents": ["visualizer", "assessor"],
      "collaboration_style": "parallel"
    }
  }
}
```

### Generate Quiz Tool

#### Tool Definition
```json
{
  "name": "generate_quiz",
  "description": "Create adaptive assessment questions based on user knowledge level and topic",
  "parameters": {
    "type": "object",
    "properties": {
      "topic": {
        "type": "string",
        "description": "The topic for the quiz questions",
        "minLength": 1,
        "maxLength": 200
      },
      "question_count": {
        "type": "integer",
        "description": "Number of questions to generate",
        "minimum": 1,
        "maximum": 20,
        "default": 5
      },
      "difficulty": {
        "type": "string",
        "enum": ["beginner", "intermediate", "advanced", "adaptive"],
        "description": "Difficulty level for questions",
        "default": "adaptive"
      },
      "question_types": {
        "type": "array",
        "items": {
          "type": "string",
          "enum": ["multiple_choice", "short_answer", "true_false", "coding", "essay"]
        },
        "description": "Types of questions to include",
        "default": ["multiple_choice", "short_answer"]
      },
      "user_context": {
        "type": "object",
        "description": "User context for adaptive question generation",
        "properties": {
          "mastered_concepts": {
            "type": "array",
            "items": {"type": "string"}
          },
          "recent_topics": {
            "type": "array",
            "items": {"type": "string"}
          },
          "skill_level": {
            "type": "string",
            "enum": ["beginner", "intermediate", "advanced"]
          }
        }
      },
      "focus_areas": {
        "type": "array",
        "items": {"type": "string"},
        "description": "Specific areas within the topic to focus on"
      },
      "agent_assisted_design": {
        "type": "object",
        "description": "Agent-assisted quiz design configuration",
        "properties": {
          "enable_agent_design": {
            "type": "boolean",
            "description": "Enable agent-assisted quiz design",
            "default": false
          },
          "design_team": {
            "type": "array",
            "items": {
              "type": "string",
              "enum": ["assessor", "tutor", "subject_expert", "difficulty_analyst"]
            },
            "description": "Types of agents involved in quiz design"
          },
          "collaboration_approach": {
            "type": "string",
            "enum": ["sequential_review", "parallel_generation", "consensus_based", "peer_review"],
            "description": "How agents collaborate on quiz design",
            "default": "sequential_review"
          },
          "quality_threshold": {
            "type": "number",
            "minimum": 0.0,
            "maximum": 1.0,
            "description": "Minimum quality threshold for collaborative approval",
            "default": 0.8
          }
        }
      }
    },
    "required": ["topic"]
  }
}
```

#### Response Schema
```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "description": "Whether the quiz was generated successfully"
    },
    "quiz": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "description": "Unique identifier for the quiz"
        },
        "topic": {
          "type": "string",
          "description": "Quiz topic"
        },
        "difficulty": {
          "type": "string",
          "description": "Quiz difficulty level"
        },
        "questions": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": {"type": "string"},
              "type": {
                "type": "string",
                "enum": ["multiple_choice", "short_answer", "true_false", "coding", "essay"]
              },
              "question": {"type": "string"},
              "options": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Available options for multiple choice questions"
              },
              "correct_answer": {"type": "string"},
              "explanation": {"type": "string"},
              "difficulty_score": {"type": "number", "minimum": 1, "maximum": 10},
              "estimated_time": {"type": "integer"},
              "hints": {
                "type": "array",
                "items": {"type": "string"}
              }
            },
            "required": ["id", "type", "question", "correct_answer"]
          }
        },
        "metadata": {
          "type": "object",
          "properties": {
            "total_estimated_time": {"type": "integer"},
            "average_difficulty": {"type": "number"},
            "question_type_distribution": {"type": "object"}
          }
        }
      }
    },
    "adaptive_recommendations": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "concept": {"type": "string"},
          "recommendation": {"type": "string"},
          "confidence": {"type": "number"}
        }
      }
    }
  }
}
```

#### Usage Examples
```python
# Basic quiz generation
tool_call = {
  "name": "generate_quiz",
  "parameters": {
    "topic": "Python Decorators",
    "question_count": 5,
    "difficulty": "intermediate",
    "question_types": ["multiple_choice", "short_answer"]
  }
}

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
    },
    "focus_areas": ["useState", "useEffect", "custom hooks"]
  }
}

# Agent-assisted collaborative quiz design
tool_call = {
  "name": "generate_quiz",
  "parameters": {
    "topic": "Machine Learning Fundamentals",
    "question_count": 10,
    "difficulty": "adaptive",
    "agent_assisted_design": {
      "enable_agent_design": true,
      "design_team": ["assessor", "subject_expert", "difficulty_analyst"],
      "collaboration_approach": "sequential_review",
      "quality_threshold": 0.85
    },
    "user_context": {
      "skill_level": "intermediate",
      "mastered_concepts": ["Basic Python", "Statistics"]
    }
  }
}
```

### Suggest Learning Tool

#### Tool Definition
```json
{
  "name": "suggest_learning",
  "description": "Generate personalized learning recommendations based on user context and goals",
  "parameters": {
    "type": "object",
    "properties": {
      "suggestion_type": {
        "type": "string",
        "enum": ["topics", "concepts", "resources", "next_steps", "learning_paths"],
        "description": "Type of learning suggestions to generate",
        "default": "next_steps"
      },
      "current_topic": {
        "type": "string",
        "description": "Current topic of study",
        "maxLength": 200
      },
      "user_level": {
        "type": "string",
        "enum": ["beginner", "intermediate", "advanced"],
        "description": "User's current knowledge level"
      },
      "learning_goals": {
        "type": "array",
        "items": {"type": "string"},
        "description": "User's learning goals and objectives"
      },
      "interests": {
        "type": "array",
        "items": {"type": "string"},
        "description": "User's areas of interest"
      },
      "mastered_concepts": {
        "type": "array",
        "items": {"type": "string"},
        "description": "Concepts the user has already mastered"
      },
      "time_constraints": {
        "type": "object",
        "properties": {
          "daily_minutes": {"type": "integer", "minimum": 1},
          "weekly_hours": {"type": "integer", "minimum": 1},
          "completion_deadline": {"type": "string", "format": "date"}
        }
      }
    }
  }
}
```

#### Response Schema
```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "description": "Whether suggestions were generated successfully"
    },
    "suggestions": {
      "type": "object",
      "properties": {
        "type": {
          "type": "string",
          "description": "Type of suggestions provided"
        },
        "recommendations": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "title": {"type": "string"},
              "description": {"type": "string"},
              "difficulty": {"type": "string"},
              "estimated_time": {"type": "integer"},
              "prerequisites": {
                "type": "array",
                "items": {"type": "string"}
              },
              "related_topics": {
                "type": "array",
                "items": {"type": "string"}
              },
              "confidence_score": {"type": "number", "minimum": 0, "maximum": 1},
              "rationale": {"type": "string"},
              "next_actions": {
                "type": "array",
                "items": {"type": "string"}
              }
            }
          }
        },
        "learning_path": {
          "type": "object",
          "properties": {
            "title": {"type": "string"},
            "description": {"type": "string"},
            "steps": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "step_number": {"type": "integer"},
                  "topic": {"type": "string"},
                  "description": {"type": "string"},
                  "estimated_time": {"type": "integer"},
                  "resources": {
                    "type": "array",
                    "items": {
                      "type": "object",
                      "properties": {
                        "type": {"type": "string"},
                        "title": {"type": "string"},
                        "url": {"type": "string"}
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

#### Usage Examples
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

# Get comprehensive learning path
tool_call = {
  "name": "suggest_learning",
  "parameters": {
    "suggestion_type": "learning_paths",
    "learning_goals": ["Master React development", "Build full-stack applications"],
    "interests": ["React", "Node.js", "TypeScript"],
    "time_constraints": {
      "daily_minutes": 60,
      "weekly_hours": 7
    }
  }
}
```

### Get Knowledge Map Tool

#### Tool Definition
```json
{
  "name": "get_knowledge_map",
  "description": "Retrieve user's knowledge map with progress indicators and concept relationships",
  "parameters": {
    "type": "object",
    "properties": {
      "user_id": {
        "type": "string",
        "description": "Unique identifier for the user",
        "minLength": 1
      },
      "focus_topic": {
        "type": "string",
        "description": "Specific topic to focus on in the knowledge map",
        "maxLength": 200
      },
      "view_mode": {
        "type": "string",
        "enum": ["progress", "weak_areas", "mastered", "all", "recent"],
        "description": "View mode for the knowledge map",
        "default": "progress"
      },
      "depth": {
        "type": "integer",
        "description": "Depth of concept relationships to include",
        "minimum": 1,
        "maximum": 5,
        "default": 3
      },
      "include_progress": {
        "type": "boolean",
        "description": "Whether to include progress indicators",
        "default": true
      },
      "filter_by": {
        "type": "object",
        "properties": {
          "difficulty": {
            "type": "array",
            "items": {"type": "string", "enum": ["beginner", "intermediate", "advanced"]}
          },
          "category": {
            "type": "array",
            "items": {"type": "string"}
          },
          "proficiency_min": {"type": "number", "minimum": 0, "maximum": 1},
          "proficiency_max": {"type": "number", "minimum": 0, "maximum": 1}
        }
      }
    },
    "required": ["user_id"]
  }
}
```

#### Response Schema
```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "description": "Whether the knowledge map was retrieved successfully"
    },
    "knowledge_map": {
      "type": "object",
      "properties": {
        "user_id": {"type": "string"},
        "view_mode": {"type": "string"},
        "focus_topic": {"type": "string"},
        "nodes": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": {"type": "string"},
              "title": {"type": "string"},
              "category": {"type": "string"},
              "difficulty": {"type": "string"},
              "proficiency": {"type": "number", "minimum": 0, "maximum": 1},
              "confidence": {"type": "number", "minimum": 0, "maximum": 1},
              "last_practiced": {"type": "string", "format": "date-time"},
              "practice_count": {"type": "integer"},
              "estimated_time": {"type": "integer"},
              "prerequisites": {
                "type": "array",
                "items": {"type": "string"}
              },
              "description": {"type": "string"}
            }
          }
        },
        "edges": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "source": {"type": "string"},
              "target": {"type": "string"},
              "relationship_type": {
                "type": "string",
                "enum": ["prerequisite", "related", "advanced", "applies_to"]
              },
              "strength": {"type": "number", "minimum": 0, "maximum": 1}
            }
          }
        },
        "statistics": {
          "type": "object",
          "properties": {
            "total_concepts": {"type": "integer"},
            "mastered_concepts": {"type": "integer"},
            "in_progress_concepts": {"type": "integer"},
            "not_started_concepts": {"type": "integer"},
            "average_proficiency": {"type": "number"}
          }
        }
      }
    }
  }
}
```

#### Usage Examples
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

# Get focused view for specific topic
tool_call = {
  "name": "get_knowledge_map",
  "parameters": {
    "user_id": "user_123",
    "focus_topic": "React Development",
    "view_mode": "weak_areas",
    "depth": 2,
    "filter_by": {
      "category": ["Programming", "Web Development"],
      "proficiency_max": 0.7
    }
  }
}
```

## Multi-Agent Learning Tools API

### Create Learning Agent Tool

#### Tool Definition
```json
{
  "name": "create_learning_agent",
  "description": "Create and configure specialized learning agents using AutoGen framework",
  "parameters": {
    "type": "object",
    "properties": {
      "agent_type": {
        "type": "string",
        "enum": ["tutor", "assessor", "recommender", "progress_monitor", "learning_companion"],
        "description": "Type of learning agent to create",
        "required": true
      },
      "agent_config": {
        "type": "object",
        "description": "Configuration for the learning agent",
        "properties": {
          "name": {
            "type": "string",
            "description": "Human-readable name for the agent",
            "maxLength": 100
          },
          "specialization": {
            "type": "string",
            "description": "Area of expertise for the agent",
            "maxLength": 200
          },
          "personality": {
            "type": "string",
            "enum": ["encouraging", "analytical", "creative", "structured", "adaptive"],
            "description": "Communication style and approach",
            "default": "adaptive"
          },
          "capabilities": {
            "type": "array",
            "items": {
              "type": "string",
              "enum": ["explain", "assess", "recommend", "monitor", "motivate", "collaborate"]
            },
            "description": "Specific capabilities the agent should have"
          },
          "interaction_style": {
            "type": "string",
            "enum": ["conversational", "instructional", "socratic", "collaborative"],
            "description": "How the agent interacts with learners",
            "default": "conversational"
          },
          "knowledge_domains": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Domains the agent specializes in"
          }
        },
        "required": ["name", "specialization"]
      },
      "user_context": {
        "type": "object",
        "description": "User context for agent personalization",
        "properties": {
          "user_id": {"type": "string"},
          "learning_level": {
            "type": "string",
            "enum": ["beginner", "intermediate", "advanced"]
          },
          "learning_goals": {
            "type": "array",
            "items": {"type": "string"}
          },
          "preferences": {
            "type": "object",
            "properties": {
              "learning_style": {"type": "string"},
              "pace_preference": {"type": "string"},
              "feedback_style": {"type": "string"}
            }
          }
        }
      }
    },
    "required": ["agent_type", "agent_config"]
  }
}
```

#### Response Schema
```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "description": "Whether the agent was created successfully"
    },
    "agent": {
      "type": "object",
      "properties": {
        "agent_id": {
          "type": "string",
          "description": "Unique identifier for the created agent"
        },
        "name": {"type": "string"},
        "type": {"type": "string"},
        "status": {
          "type": "string",
          "enum": ["active", "configured", "ready", "error"]
        },
        "capabilities": {
          "type": "array",
          "items": {"type": "string"}
        },
        "autogen_config": {
          "type": "object",
          "properties": {
            "conversation_mode": {"type": "string"},
            "tools_available": {
              "type": "array",
              "items": {"type": "string"}
            },
            "llm_config": {"type": "object"}
          }
        }
      }
    },
    "registration_info": {
      "type": "object",
      "properties": {
        "registered_at": {"type": "string", "format": "date-time"},
        "session_context": {"type": "string"},
        "available_workflows": {
          "type": "array",
          "items": {"type": "string"}
        }
      }
    }
  }
}
```

#### Usage Examples
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
      "interaction_style": "socratic",
      "knowledge_domains": ["algebra", "calculus", "statistics"]
    },
    "user_context": {
      "user_id": "user_123",
      "learning_level": "intermediate",
      "learning_goals": ["Master calculus fundamentals"],
      "preferences": {
        "learning_style": "visual",
        "pace_preference": "step-by-step"
      }
    }
  }
}

# Create an assessment agent
tool_call = {
  "name": "create_learning_agent",
  "parameters": {
    "agent_type": "assessor",
    "agent_config": {
      "name": "Learning Assessor",
      "specialization": "Formative and Summative Assessment",
      "personality": "analytical",
      "capabilities": ["assess", "monitor", "recommend"],
      "interaction_style": "instructional"
    }
  }
}
```

### Orchestrate Learning Session Tool

#### Tool Definition
```json
{
  "name": "orchestrate_learning_session",
  "description": "Create and manage multi-agent learning sessions using AutoGen workflow orchestration",
  "parameters": {
    "type": "object",
    "properties": {
      "session_config": {
        "type": "object",
        "description": "Configuration for the learning session",
        "properties": {
          "session_name": {
            "type": "string",
            "description": "Name of the learning session",
            "maxLength": 100
          },
          "learning_objectives": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Specific learning objectives for this session"
          },
          "duration_minutes": {
            "type": "integer",
            "description": "Expected duration of the session in minutes",
            "minimum": 5,
            "maximum": 180
          },
          "session_type": {
            "type": "string",
            "enum": ["explanation", "practice", "assessment", "review", "collaborative"],
            "description": "Type of learning session",
            "default": "explanation"
          }
        },
        "required": ["session_name", "learning_objectives"]
      },
      "agent_participants": {
        "type": "array",
        "description": "List of agents to participate in the session",
        "items": {
          "type": "object",
          "properties": {
            "agent_id": {"type": "string"},
            "role": {
              "type": "string",
              "enum": ["primary", "secondary", "support", "observer"]
            },
            "responsibilities": {
              "type": "array",
              "items": {"type": "string"}
            }
          },
          "required": ["agent_id", "role"]
        },
        "minItems": 1
      },
      "workflow_pattern": {
        "type": "string",
        "enum": ["sequential", "collaborative", "hierarchical", "peer_review"],
        "description": "How agents should interact during the session",
        "default": "collaborative"
      },
      "context_data": {
        "type": "object",
        "description": "Initial context and data for the session",
        "properties": {
          "topic": {"type": "string"},
          "current_knowledge_level": {"type": "string"},
          "previous_sessions": {
            "type": "array",
            "items": {"type": "string"}
          },
          "specific_challenges": {
            "type": "array",
            "items": {"type": "string"}
          }
        }
      }
    },
    "required": ["session_config", "agent_participants"]
  }
}
```

#### Response Schema
```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "description": "Whether the session was orchestrated successfully"
    },
    "session": {
      "type": "object",
      "properties": {
        "session_id": {
          "type": "string",
          "description": "Unique identifier for the learning session"
        },
        "status": {
          "type": "string",
          "enum": ["initialized", "active", "paused", "completed", "error"]
        },
        "autogen_group_chat": {
          "type": "object",
          "properties": {
            "group_chat_id": {"type": "string"},
            "participants": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "agent_id": {"type": "string"},
                  "role": {"type": "string"},
                  "status": {"type": "string"}
                }
              }
            },
            "conversation_mode": {"type": "string"},
            "max_round": {"type": "integer"}
          }
        },
        "workflow_state": {
          "type": "object",
          "properties": {
            "current_phase": {"type": "string"},
            "active_agent": {"type": "string"},
            "progress_percentage": {"type": "number"},
            "next_actions": {
              "type": "array",
              "items": {"type": "string"}
            }
          }
        }
      }
    }
  }
}
```

#### Usage Examples
```python
# Orchestrate a collaborative learning session
tool_call = {
  "name": "orchestrate_learning_session",
  "parameters": {
    "session_config": {
      "session_name": "React Hooks Deep Dive",
      "learning_objectives": [
        "Understand useState and useEffect hooks",
        "Create custom hooks",
        "Apply hooks in practical examples"
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
    "workflow_pattern": "collaborative",
    "context_data": {
      "topic": "React Hooks",
      "current_knowledge_level": "intermediate",
      "previous_sessions": ["React Components", "State Management"]
    }
  }
}
```

### Manage Agent Collaboration Tool

#### Tool Definition
```json
{
  "name": "manage_agent_collaboration",
  "description": "Manage real-time collaboration and coordination between learning agents",
  "parameters": {
    "type": "object",
    "properties": {
      "action": {
        "type": "string",
        "enum": ["initiate_collaboration", "coordinate_handoff", "resolve_conflicts", "sync_context", "evaluate_collaboration"],
        "description": "Collaboration management action to perform",
        "required": true
      },
      "session_id": {
        "type": "string",
        "description": "Learning session identifier",
        "required": true
      },
      "agent_coordination": {
        "type": "object",
        "description": "Agent coordination configuration",
        "properties": {
          "primary_agent": {"type": "string"},
          "supporting_agents": {
            "type": "array",
            "items": {"type": "string"}
          },
          "coordination_strategy": {
            "type": "string",
            "enum": ["sequential_handoff", "parallel_processing", "consensus_building", "expert_consultation"]
          },
          "decision_threshold": {
            "type": "number",
            "minimum": 0.0,
            "maximum": 1.0,
            "description": "Confidence threshold for collaborative decisions"
          }
        }
      },
      "collaboration_context": {
        "type": "object",
        "description": "Context for the collaboration",
        "properties": {
          "shared_goal": {"type": "string"},
          "current_task": {"type": "string"},
          "agent_insights": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "agent_id": {"type": "string"},
                "insight": {"type": "string"},
                "confidence": {"type": "number"}
              }
            }
          }
        }
      }
    },
    "required": ["action", "session_id"]
  }
}
```

#### Response Schema
```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "description": "Whether the collaboration management action was successful"
    },
    "collaboration_state": {
      "type": "object",
      "properties": {
        "coordination_status": {
          "type": "string",
          "enum": ["coordinating", "in_progress", "completed", "conflict_detected", "resolved"]
        },
        "active_agents": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "agent_id": {"type": "string"},
              "current_role": {"type": "string"},
              "contribution": {"type": "string"},
              "status": {"type": "string"}
            }
          }
        },
        "consensus_level": {
          "type": "number",
          "minimum": 0.0,
          "maximum": 1.0,
          "description": "Level of agreement between agents"
        },
        "next_coordination_step": {"type": "string"},
        "shared_context": {
          "type": "object",
          "properties": {
            "agreed_approach": {"type": "string"},
            "remaining_tasks": {
              "type": "array",
              "items": {"type": "string"}
            },
            "collaboration_history": {
              "type": "array",
              "items": {"type": "object"}
            }
          }
        }
      }
    }
  }
}
```

#### Usage Examples
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
      "coordination_strategy": "sequential_handoff",
      "decision_threshold": 0.8
    },
    "collaboration_context": {
      "shared_goal": "Complete React Hooks explanation",
      "current_task": "Assess user understanding",
      "agent_insights": [
        {
          "agent_id": "tutor_001",
          "insight": "User has grasped basic concepts",
          "confidence": 0.9
        }
      ]
    }
  }
}
```

## Data Access & Management Tools API

### Get Configuration Tool

#### Tool Definition
```json
{
  "name": "get_configuration",
  "description": "Retrieve user configuration and settings for AI decision making",
  "parameters": {
    "type": "object",
    "properties": {
      "config_type": {
        "type": "string",
        "enum": ["ai", "preferences", "session", "all"],
        "description": "Type of configuration to retrieve",
        "default": "all"
      },
      "specific_key": {
        "type": "string",
        "description": "Specific configuration key to retrieve (supports dot notation)",
        "pattern": "^[a-zA-Z][a-zA-Z0-9_.]*$"
      },
      "user_id": {
        "type": "string",
        "description": "User identifier for user-specific configuration"
      },
      "include_defaults": {
        "type": "boolean",
        "description": "Whether to include default values for unset configurations",
        "default": true
      }
    }
  }
}
```

#### Response Schema
```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "description": "Whether configuration was retrieved successfully"
    },
    "configuration": {
      "type": "object",
      "properties": {
        "ai": {
          "type": "object",
          "properties": {
            "default_provider": {"type": "string"},
            "default_model": {"type": "string"},
            "temperature": {"type": "number", "minimum": 0, "maximum": 2},
            "max_tokens": {"type": "integer", "minimum": 1},
            "daily_limit": {"type": "integer", "minimum": 1}
          }
        },
        "preferences": {
          "type": "object",
          "properties": {
            "learning_style": {"type": "string"},
            "difficulty_preference": {"type": "string"},
            "session_timeout": {"type": "integer"},
            "auto_save": {"type": "boolean"}
          }
        },
        "session": {
          "type": "object",
          "properties": {
            "current_topic": {"type": "string"},
            "learning_goals": {"type": "array", "items": {"type": "string"}},
            "recent_concepts": {"type": "array", "items": {"type": "string"}}
          }
        },
        "providers": {
          "type": "object",
          "patternProperties": {
            "^[a-zA-Z][a-zA-Z0-9]*$": {
              "type": "object",
              "properties": {
                "api_configured": {"type": "boolean"},
                "default_model": {"type": "string"},
                "available_models": {"type": "array", "items": {"type": "string"}}
              }
            }
          }
        }
      }
    },
    "metadata": {
      "type": "object",
      "properties": {
        "last_updated": {"type": "string", "format": "date-time"},
        "config_version": {"type": "string"},
        "source": {"type": "string"}
      }
    }
  }
}
```

#### Usage Examples
```python
# Get all configuration
tool_call = {
  "name": "get_configuration",
  "parameters": {
    "config_type": "all",
    "include_defaults": true
  }
}

# Get specific AI configuration
tool_call = {
  "name": "get_configuration",
  "parameters": {
    "config_type": "ai",
    "specific_key": "default_provider"
  }
}
```

### Update Configuration Tool

#### Tool Definition
```json
{
  "name": "update_configuration",
  "description": "Update user configuration with validation and persistence",
  "parameters": {
    "type": "object",
    "properties": {
      "key": {
        "type": "string",
        "description": "Configuration key to update (supports dot notation)",
        "pattern": "^[a-zA-Z][a-zA-Z0-9_.]*$",
        "minLength": 1
      },
      "value": {
        "description": "New value for the configuration key"
      },
      "user_id": {
        "type": "string",
        "description": "User identifier for user-specific configuration"
      },
      "validate": {
        "type": "boolean",
        "description": "Whether to validate the configuration value",
        "default": true
      },
      "persist": {
        "type": "boolean",
        "description": "Whether to persist the change to storage",
        "default": true
      }
    },
    "required": ["key", "value"]
  }
}
```

#### Response Schema
```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "description": "Whether configuration was updated successfully"
    },
    "updated_configuration": {
      "type": "object",
      "description": "The updated configuration value"
    },
    "validation_result": {
      "type": "object",
      "properties": {
        "valid": {"type": "boolean"},
        "errors": {
          "type": "array",
          "items": {"type": "string"}
        },
        "warnings": {
          "type": "array",
          "items": {"type": "string"}
        }
      }
    },
    "metadata": {
      "type": "object",
      "properties": {
        "previous_value": {},
        "updated_at": {"type": "string", "format": "date-time"},
        "updated_by": {"type": "string"}
      }
    }
  }
}
```

#### Usage Examples
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

# Update user preferences
tool_call = {
  "name": "update_configuration",
  "parameters": {
    "key": "preferences.learning_style",
    "value": "visual",
    "validate": true
  }
}
```

### Manage AI Provider Tool

#### Tool Definition
```json
{
  "name": "manage_ai_provider",
  "description": "Manage AI provider configuration, testing, and operations",
  "parameters": {
    "type": "object",
    "properties": {
      "action": {
        "type": "string",
        "enum": ["configure", "test", "list", "switch", "remove", "get_models"],
        "description": "Action to perform on the provider",
        "required": true
      },
      "provider_name": {
        "type": "string",
        "description": "Name of the AI provider",
        "pattern": "^[a-zA-Z][a-zA-Z0-9]*$"
      },
      "api_key": {
        "type": "string",
        "description": "API key for the provider (sensitive, handle securely)",
        "minLength": 10
      },
      "config_data": {
        "type": "object",
        "description": "Additional configuration data for the provider",
        "properties": {
          "base_url": {"type": "string", "format": "uri"},
          "timeout": {"type": "integer", "minimum": 1, "maximum": 300},
          "max_retries": {"type": "integer", "minimum": 0, "maximum": 10},
          "default_model": {"type": "string"}
        }
      },
      "test_model": {
        "type": "string",
        "description": "Specific model to test (for test action)"
      }
    },
    "required": ["action"]
  }
}
```

#### Response Schema
```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "description": "Whether the provider operation was successful"
    },
    "action": {
      "type": "string",
      "description": "The action that was performed"
    },
    "provider_info": {
      "type": "object",
      "properties": {
        "name": {"type": "string"},
        "status": {
          "type": "string",
          "enum": ["configured", "testing", "active", "error", "not_configured"]
        },
        "default_model": {"type": "string"},
        "available_models": {
          "type": "array",
          "items": {"type": "string"}
        },
        "test_results": {
          "type": "object",
          "properties": {
            "tested_at": {"type": "string", "format": "date-time"},
            "response_time": {"type": "number"},
            "model_tested": {"type": "string"},
            "success": {"type": "boolean"},
            "error_message": {"type": "string"}
          }
        },
        "configuration": {
          "type": "object",
          "properties": {
            "api_configured": {"type": "boolean"},
            "base_url": {"type": "string"},
            "timeout": {"type": "integer"},
            "max_retries": {"type": "integer"}
          }
        }
      }
    },
    "providers_list": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": {"type": "string"},
          "status": {"type": "string"},
          "models": {"type": "array", "items": {"type": "string"}}
        }
      }
    }
  }
}
```

#### Usage Examples
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

# Test provider connectivity
tool_call = {
  "name": "manage_ai_provider",
  "parameters": {
    "action": "test",
    "provider_name": "openai",
    "test_model": "gpt-4"
  }
}

# List all providers
tool_call = {
  "name": "manage_ai_provider",
  "parameters": {
    "action": "list"
  }
}
```

## Analytics & Progress Tracking Tools API

### Get Learning Statistics Tool

#### Tool Definition
```json
{
  "name": "get_learning_statistics",
  "description": "Retrieve comprehensive learning analytics and progress data",
  "parameters": {
    "type": "object",
    "properties": {
      "user_id": {
        "type": "string",
        "description": "User identifier for statistics retrieval",
        "minLength": 1
      },
      "time_period": {
        "type": "string",
        "enum": ["today", "week", "month", "year", "all", "custom"],
        "description": "Time period for statistics",
        "default": "week"
      },
      "custom_date_range": {
        "type": "object",
        "description": "Custom date range for statistics",
        "properties": {
          "start_date": {"type": "string", "format": "date"},
          "end_date": {"type": "string", "format": "date"}
        },
        "required": ["start_date", "end_date"]
      },
      "topic_filter": {
        "type": "array",
        "items": {"type": "string"},
        "description": "Filter statistics by specific topics"
      },
      "metric_types": {
        "type": "array",
        "items": {
          "type": "string",
          "enum": ["progress", "usage", "performance", "engagement", "costs"]
        },
        "description": "Types of metrics to include",
        "default": ["progress", "usage"]
      },
      "include_comparison": {
        "type": "boolean",
        "description": "Include comparison with previous period",
        "default": false
      }
    },
    "required": ["user_id"]
  }
}
```

#### Response Schema
```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "description": "Whether statistics were retrieved successfully"
    },
    "statistics": {
      "type": "object",
      "properties": {
        "period": {
          "type": "object",
          "properties": {
            "type": {"type": "string"},
            "start_date": {"type": "string", "format": "date"},
            "end_date": {"type": "string", "format": "date"},
            "days_included": {"type": "integer"}
          }
        },
        "progress_metrics": {
          "type": "object",
          "properties": {
            "concepts_mastered": {"type": "integer"},
            "concepts_in_progress": {"type": "integer"},
            "quizzes_completed": {"type": "integer"},
            "average_score": {"type": "number", "minimum": 0, "maximum": 100},
            "proficiency_improvement": {"type": "number"},
            "learning_streak_days": {"type": "integer"}
          }
        },
        "usage_metrics": {
          "type": "object",
          "properties": {
            "total_sessions": {"type": "integer"},
            "total_time_minutes": {"type": "integer"},
            "average_session_length": {"type": "number"},
            "conversations_started": {"type": "integer"},
            "questions_asked": {"type": "integer"}
          }
        },
        "performance_metrics": {
          "type": "object",
          "properties": {
            "quiz_performance": {
              "type": "object",
              "properties": {
                "total_quizzes": {"type": "integer"},
                "average_score": {"type": "number"},
                "improvement_rate": {"type": "number"},
                "strongest_areas": {"type": "array", "items": {"type": "string"}},
                "weakest_areas": {"type": "array", "items": {"type": "string"}}
              }
            },
            "learning_efficiency": {
              "type": "object",
              "properties": {
                "concepts_per_hour": {"type": "number"},
                "retention_rate": {"type": "number"},
                "time_to_mastery": {"type": "number"}
              }
            }
          }
        },
        "engagement_metrics": {
          "type": "object",
          "properties": {
            "daily_active_minutes": {"type": "array", "items": {"type": "number"}},
            "most_active_hours": {"type": "array", "items": {"type": "integer"}},
            "preferred_topics": {"type": "array", "items": {"type": "string"}},
            "interaction_patterns": {
              "type": "object",
              "properties": {
                "questions_per_session": {"type": "number"},
                "explanation_requests": {"type": "integer"},
                "quiz_attempts": {"type": "integer"}
              }
            }
          }
        },
        "cost_metrics": {
          "type": "object",
          "properties": {
            "total_tokens_used": {"type": "integer"},
            "total_cost": {"type": "number"},
            "cost_per_concept": {"type": "number"},
            "daily_average_cost": {"type": "number"},
            "projected_monthly_cost": {"type": "number"}
          }
        }
      }
    },
    "comparison": {
      "type": "object",
      "properties": {
        "previous_period": {
          "type": "object",
          "properties": {
            "progress_change": {"type": "number"},
            "usage_change": {"type": "number"},
            "performance_change": {"type": "number"}
          }
        },
        "trends": {
          "type": "object",
          "properties": {
            "learning_velocity": {"type": "string"},
            "engagement_trend": {"type": "string"},
            "cost_efficiency_trend": {"type": "string"}
          }
        }
      }
    }
  }
}
```

#### Usage Examples
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

# Get custom date range statistics
tool_call = {
  "name": "get_learning_statistics",
  "parameters": {
    "user_id": "user_123",
    "time_period": "custom",
    "custom_date_range": {
      "start_date": "2025-01-01",
      "end_date": "2025-01-31"
    },
    "topic_filter": ["Python", "Machine Learning"],
    "metric_types": ["progress", "costs"]
  }
}
```

## Session & Context Management Tools API

### Manage Session Tool

#### Tool Definition
```json
{
  "name": "manage_session",
  "description": "Manage learning session state and context",
  "parameters": {
    "type": "object",
    "properties": {
      "action": {
        "type": "string",
        "enum": ["create", "update", "clear", "save", "restore", "get"],
        "description": "Session management action to perform",
        "required": true
      },
      "session_data": {
        "type": "object",
        "description": "Session data for create/update actions",
        "properties": {
          "user_id": {"type": "string"},
          "current_topic": {"type": "string"},
          "learning_goals": {"type": "array", "items": {"type": "string"}},
          "recent_concepts": {"type": "array", "items": {"type": "string"}},
          "conversation_context": {"type": "array", "items": {"type": "object"}},
          "preferences": {"type": "object"},
          "metadata": {"type": "object"}
        }
      },
      "context_updates": {
        "type": "object",
        "description": "Specific context updates for update action",
        "properties": {
          "current_activity": {"type": "string"},
          "topic_progress": {"type": "object"},
          "interaction_history": {"type": "array", "items": {"type": "object"}},
          "user_state": {"type": "object"}
        }
      },
      "session_id": {
        "type": "string",
        "description": "Session identifier for get/restore actions"
      },
      "checkpoint_name": {
        "type": "string",
        "description": "Name for save/checkpoint actions"
      }
    },
    "required": ["action"]
  }
}
```

#### Response Schema
```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "description": "Whether the session operation was successful"
    },
    "action": {
      "type": "string",
      "description": "The action that was performed"
    },
    "session_info": {
      "type": "object",
      "properties": {
        "session_id": {"type": "string"},
        "user_id": {"type": "string"},
        "status": {
          "type": "string",
          "enum": ["active", "paused", "saved", "ended"]
        },
        "created_at": {"type": "string", "format": "date-time"},
        "last_activity": {"type": "string", "format": "date-time"},
        "current_state": {
          "type": "object",
          "properties": {
            "current_topic": {"type": "string"},
            "learning_goals": {"type": "array", "items": {"type": "string"}},
            "recent_concepts": {"type": "array", "items": {"type": "string"}},
            "current_activity": {"type": "string"},
            "interaction_count": {"type": "integer"},
            "session_duration_minutes": {"type": "integer"}
          }
        }
      }
    },
    "context_data": {
      "type": "object",
      "description": "Current session context data"
    },
    "checkpoints": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": {"type": "string"},
          "created_at": {"type": "string", "format": "date-time"},
          "description": {"type": "string"}
        }
      }
    }
  }
}
```

#### Usage Examples
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

# Update session context
tool_call = {
  "name": "manage_session",
  "parameters": {
    "action": "update",
    "context_updates": {
      "current_activity": "quiz",
      "topic_progress": {
        "React Hooks": {
          "concepts_covered": ["useState", "useEffect"],
          "current_concept": "custom hooks"
        }
      }
    }
  }
}

# Save session checkpoint
tool_call = {
  "name": "manage_session",
  "parameters": {
    "action": "save",
    "checkpoint_name": "react-hooks-progress"
  }
}
```

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
    },
    "retry_after": {
      "type": "integer",
      "description": "Seconds to wait before retry (for rate limiting)"
    }
  }
}
```

### Common Error Codes

#### Validation Errors
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid parameters provided",
    "details": {
      "field": "difficulty",
      "value": "invalid_level",
      "allowed_values": ["beginner", "intermediate", "advanced", "adaptive"]
    },
    "suggestions": [
      "Use one of the allowed difficulty levels",
      "Check parameter documentation for valid values"
    ]
  }
}
```

#### Provider Errors
```json
{
  "success": false,
  "error": {
    "code": "PROVIDER_ERROR",
    "message": "AI provider communication failed",
    "details": {
      "provider": "openai",
      "endpoint": "https://api.openai.com/v1/chat/completions",
      "status_code": 401,
      "response": "Invalid API key"
    },
    "suggestions": [
      "Check API key configuration",
      "Verify provider status",
      "Try alternative provider"
    ]
  }
}
```

## Tool Execution Patterns

### Sequential Tool Execution

```python
# AI analyzes user request and executes tools sequentially
tool_calls = [
  {
    "name": "get_configuration",
    "parameters": {
      "config_type": "preferences",
      "user_id": "user_123"
    }
  },
  {
    "name": "explain_concept",
    "parameters": {
      "concept": "machine learning",
      "detail_level": "intermediate",
      "include_examples": True
    }
  },
  {
    "name": "generate_quiz",
    "parameters": {
      "topic": "machine learning",
      "question_count": 5,
      "difficulty": "intermediate"
    }
  }
]
```

### Parallel Tool Execution

```python
# AI executes independent tools in parallel for efficiency
parallel_tool_calls = [
  {
    "name": "get_learning_statistics",
    "parameters": {
      "user_id": "user_123",
      "time_period": "week"
    }
  },
  {
    "name": "get_knowledge_map",
    "parameters": {
      "user_id": "user_123",
      "view_mode": "progress"
    }
  }
]
```

### Conditional Tool Execution

```python
# AI makes decisions about which tools to call based on context
conditional_execution = {
  "tool_calls": [
    {
      "condition": "user_has_mastered_concepts",
      "tool": {
        "name": "generate_quiz",
        "parameters": {
          "topic": current_topic,
          "difficulty": "advanced"
        }
      }
    },
    {
      "condition": "user_needs_explanation",
      "tool": {
        "name": "explain_concept",
        "parameters": {
          "concept": current_topic,
          "detail_level": "simple"
        }
      }
    }
  ]
}
```

## Integration Examples

### Learning Workflow Orchestration

```python
# Complete learning workflow orchestrated by AI
def learning_workflow(user_input: str, user_id: str):
    workflow = {
        "steps": [
            {
                "step": "analyze_intent",
                "tools": ["get_configuration"]
            },
            {
                "step": "provide_explanation",
                "tools": ["explain_concept"],
                "condition": "needs_explanation"
            },
            {
                "step": "assess_knowledge",
                "tools": ["generate_quiz", "get_knowledge_map"],
                "condition": "ready_for_assessment"
            },
            {
                "step": "suggest_next_steps",
                "tools": ["suggest_learning"],
                "condition": "has_completed_topic"
            }
        ]
    }

    # AI orchestrates the workflow based on user input and context
    return execute_workflow(workflow, user_input, user_id)
```

### Multi-Tool Learning Session

```python
# Example of AI using multiple tools for a rich learning experience
def interactive_learning_session():
    # 1. Understand user context
    context = call_tool("get_configuration", {
        "config_type": "all",
        "user_id": "user_123"
    })

    # 2. Provide personalized explanation
    explanation = call_tool("explain_concept", {
        "concept": "React Hooks",
        "detail_level": context["preferences"]["difficulty_preference"],
        "learning_style": context["preferences"]["learning_style"],
        "include_examples": True
    })

    # 3. Update session context
    call_tool("manage_session", {
        "action": "update",
        "context_updates": {
            "current_activity": "learning",
            "topic_progress": {"React Hooks": {"status": "in_progress"}}
        }
    })

    # 4. Generate assessment
    quiz = call_tool("generate_quiz", {
        "topic": "React Hooks",
        "question_count": 3,
        "difficulty": "adaptive"
    })

    # 5. Provide suggestions for next steps
    suggestions = call_tool("suggest_learning", {
        "suggestion_type": "next_steps",
        "current_topic": "React Hooks",
        "user_level": context["preferences"]["skill_level"]
    })

    return {
        "explanation": explanation,
        "quiz": quiz,
        "suggestions": suggestions
    }
```

## AutoGen-Powered Multi-Agent Learning Examples

### Complete Multi-Agent Learning Workflow

```python
# Example: Complete multi-agent learning session orchestrated by AutoGen
def collaborative_learning_session(user_id: str, topic: str):
    # Step 1: Create specialized learning agents
    tutor_agent = call_tool("create_learning_agent", {
        "agent_type": "tutor",
        "agent_config": {
            "name": "Concept Tutor",
            "specialization": f"{topic} Fundamentals",
            "personality": "encouraging",
            "capabilities": ["explain", "motivate", "collaborate"],
            "interaction_style": "socratic"
        },
        "user_context": {
            "user_id": user_id,
            "learning_level": "intermediate"
        }
    })

    assessor_agent = call_tool("create_learning_agent", {
        "agent_type": "assessor",
        "agent_config": {
            "name": "Learning Assessor",
            "specialization": "Formative Assessment",
            "personality": "analytical",
            "capabilities": ["assess", "monitor", "recommend"]
        }
    })

    recommender_agent = call_tool("create_learning_agent", {
        "agent_type": "recommender",
        "agent_config": {
            "name": "Learning Guide",
            "specialization": "Personalized Learning Paths",
            "personality": "adaptive",
            "capabilities": ["recommend", "motivate"]
        }
    })

    # Step 2: Orchestrate multi-agent learning session
    session = call_tool("orchestrate_learning_session", {
        "session_config": {
            "session_name": f"Comprehensive {topic} Learning",
            "learning_objectives": [
                f"Understand {topic} fundamentals",
                "Apply concepts through practice",
                "Demonstrate mastery through assessment"
            ],
            "duration_minutes": 90,
            "session_type": "collaborative"
        },
        "agent_participants": [
            {
                "agent_id": tutor_agent["agent"]["agent_id"],
                "role": "primary",
                "responsibilities": ["explain_concepts", "provide_examples"]
            },
            {
                "agent_id": assessor_agent["agent"]["agent_id"],
                "role": "secondary",
                "responsibilities": ["assess_understanding", "create_quizzes"]
            },
            {
                "agent_id": recommender_agent["agent"]["agent_id"],
                "role": "support",
                "responsibilities": ["suggest_next_steps", "recommend_resources"]
            }
        ],
        "workflow_pattern": "collaborative",
        "context_data": {
            "topic": topic,
            "current_knowledge_level": "intermediate"
        }
    })

    return session

# Execute the collaborative learning session
session_result = collaborative_learning_session("user_123", "React Hooks")
```

### Agent-Enhanced Concept Explanation

```python
# Example: Multi-agent concept explanation with AutoGen
def multi_agent_concept_explanation(concept: str, user_context: dict):
    # Create specialized agents for explanation
    expert_agent = call_tool("create_learning_agent", {
        "agent_type": "tutor",
        "agent_config": {
            "name": "Subject Expert",
            "specialization": concept,
            "personality": "analytical",
            "capabilities": ["explain", "provide_examples"]
        }
    })

    visualizer_agent = call_tool("create_learning_agent", {
        "agent_type": "tutor",
        "agent_config": {
            "name": "Visual Learning Specialist",
            "specialization": "Visual Explanations",
            "personality": "creative",
            "capabilities": ["explain", "visualize"]
        }
    })

    # Orchestrate collaborative explanation
    explanation = call_tool("explain_concept", {
        "concept": concept,
        "detail_level": "intermediate",
        "user_level": user_context["skill_level"],
        "learning_style": user_context["learning_style"],
        "include_examples": True,
        "agent_collaboration": {
            "enable_multi_agent": True,
            "primary_agent_type": "tutor",
            "supporting_agents": ["visualizer", "assessor"],
            "collaboration_style": "parallel"
        }
    })

    return explanation

# Example usage
concept_explanation = multi_agent_concept_explanation(
    "Machine Learning Neural Networks",
    {
        "skill_level": "intermediate",
        "learning_style": "visual"
    }
)
```

### Collaborative Quiz Design and Assessment

```python
# Example: Agent-assisted quiz creation and evaluation
def collaborative_assessment_workflow(topic: str, user_profile: dict):
    # Create assessment team
    subject_expert = call_tool("create_learning_agent", {
        "agent_type": "assessor",
        "agent_config": {
            "name": "Subject Matter Expert",
            "specialization": topic,
            "capabilities": ["assess", "design_questions"]
        }
    })

    difficulty_analyst = call_tool("create_learning_agent", {
        "agent_type": "assessor",
        "agent_config": {
            "name": "Difficulty Specialist",
            "specialization": "Adaptive Assessment",
            "capabilities": ["assess", "analyze_difficulty"]
        }
    })

    # Create quiz through agent collaboration
    quiz = call_tool("generate_quiz", {
        "topic": topic,
        "question_count": 10,
        "difficulty": "adaptive",
        "agent_assisted_design": {
            "enable_agent_design": True,
            "design_team": ["subject_expert", "difficulty_analyst", "assessor"],
            "collaboration_approach": "sequential_review",
            "quality_threshold": 0.85
        },
        "user_context": {
            "skill_level": user_profile["level"],
            "mastered_concepts": user_profile["completed_topics"]
        }
    })

    return quiz

# Example usage
assessment = collaborative_assessment_workflow(
    "Data Structures and Algorithms",
    {
        "level": "intermediate",
        "completed_topics": ["Arrays", "Linked Lists"]
    }
)
```

## Tool Performance and Optimization

### Tool Execution Metrics

```json
{
  "tool_execution_metrics": {
    "tool_name": "explain_concept",
    "execution_time_ms": 1250,
    "tokens_used": 847,
    "cache_hit": false,
    "success": true,
    "performance_tier": "fast"
  }
}
```

### Optimization Strategies

1. **Caching**: Cache frequently requested explanations and quiz results
2. **Batching**: Batch related tool calls when possible
3. **Parallel Execution**: Execute independent tools concurrently
4. **Resource Management**: Monitor and optimize resource usage
5. **Adaptive Complexity**: Adjust tool complexity based on user context

## Security and Validation

### Input Validation Rules

- All string inputs have length limits and pattern validation
- Numerical inputs have min/max constraints
- Enum values are validated against allowed values
- User IDs and session identifiers are validated for format
- API keys and sensitive data are handled securely

### Permission Enforcement

- Tools verify user permissions before execution
- Resource access is controlled and audited
- Sensitive configuration requires elevated permissions
- All tool executions are logged for security monitoring

---

*Last updated: October 10, 2025*
*Version: 1.0.0*
*Category: AI Toolcalls API Reference*