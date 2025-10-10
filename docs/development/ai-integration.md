# AI Integration Guide

---
title: Multi-Provider AI Integration & Context-Aware Learning
description: Comprehensive guide to AI provider setup, context optimization, and intelligent learning features
version: 2.0.0
last_updated: 2025-10-08
---

## Overview

This guide covers the implementation of Learning Catalyst's AI integration system, which provides multi-provider support, context-aware responses, and intelligent learning features. The system is designed to work with various AI providers while maintaining consistent behavior and optimizing responses based on user context and learning history.

## Architecture Overview

### Multi-Provider Abstraction Layer

```
AI Integration Layer
├── AI Abstraction Interface
│   ├── Provider Management
│   ├── Context Optimization
│   ├── Response Processing
│   └── Fallback Handling
├── Provider Implementations
│   ├── OpenAI Provider
│   ├── Anthropic Provider
│   ├── ChatGLM Provider
│   ├── DeepSeek Provider
│   ├── SiliconFlow Provider
│   └── Local Model Provider
└── Intelligence Features
    ├── Context-Aware Prompting
    ├── Response Personalization
    ├── Learning History Integration
    └── Adaptive Difficulty Adjustment
```

## Provider Implementation

### OpenAI Provider Implementation

```python
# src/ai/providers/openai_provider.py

import asyncio
import json
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import openai
from openai import AsyncOpenAI
import tiktoken

from src.ai.abstraction import AIProvider, AIResponse, ProviderConfig
from src.utils.preferences_manager import PreferencesManager

@dataclass
class OpenAIConfig(ProviderConfig):
    api_key: str
    model: str = "gpt-4"
    base_url: Optional[str] = None
    organization: Optional[str] = None
    max_tokens: int = 4000
    temperature: float = 0.7
    top_p: float = 1.0
    frequency_penalty: float = 0.0
    presence_penalty: float = 0.0

class OpenAIProvider(AIProvider):
    """OpenAI AI provider with advanced features"""

    def __init__(self, config: OpenAIConfig, preferences_manager: PreferencesManager):
        self.config = config
        self.preferences_manager = preferences_manager
        self.client = AsyncOpenAI(
            api_key=config.api_key,
            base_url=config.base_url,
            organization=config.organization
        )
        self.tokenizer = tiktoken.encoding_for_model(config.model)

    async def generate_response(
        self,
        prompt: str,
        context: Optional[Dict[str, Any]] = None,
        stream: bool = False
    ) -> AIResponse:
        """Generate AI response with context optimization"""
        try:
            # Optimize prompt based on context
            optimized_prompt = await self._optimize_prompt(prompt, context)

            # Create messages array
            messages = await self._build_messages(optimized_prompt, context)

            # Make API call
            response = await self.client.chat.completions.create(
                model=self.config.model,
                messages=messages,
                max_tokens=self.config.max_tokens,
                temperature=self.config.temperature,
                top_p=self.config.top_p,
                frequency_penalty=self.config.frequency_penalty,
                presence_penalty=self.config.presence_penalty,
                stream=stream
            )

            if stream:
                return await self._handle_streaming_response(response)
            else:
                return self._process_response(response)

        except openai.RateLimitError as e:
            return AIResponse(
                content="Rate limit exceeded. Please try again in a moment.",
                provider="openai",
                model=self.config.model,
                usage=None,
                error="rate_limit_exceeded"
            )
        except openai.AuthenticationError as e:
            return AIResponse(
                content="Authentication failed. Please check your API key.",
                provider="openai",
                model=self.config.model,
                usage=None,
                error="authentication_failed"
            )
        except Exception as e:
            return AIResponse(
                content=f"An error occurred: {str(e)}",
                provider="openai",
                model=self.config.model,
                usage=None,
                error=str(e)
            )

    async def _optimize_prompt(self, prompt: str, context: Optional[Dict[str, Any]] = None) -> str:
        """Optimize prompt based on user context and learning history"""
        if not context:
            return prompt

        # Extract relevant context information
        user_level = context.get('skill_level', 'intermediate')
        learning_style = context.get('learning_style', 'visual')
        recent_topics = context.get('recent_topics', [])
        mastered_concepts = context.get('mastered_concepts', [])
        weak_areas = context.get('weak_areas', [])
        learning_goals = context.get('learning_goals', [])

        # Build context prefix
        context_prefix = f"""
You are an expert AI learning assistant for Learning Catalyst. Adapt your response to the following context:

USER PROFILE:
- Skill Level: {user_level}
- Learning Style: {learning_style}
- Recent Topics: {', '.join(recent_topics[-5:]) if recent_topics else 'None'}
- Mastered Concepts: {', '.join(mastered_concepts)}
- Areas for Improvement: {', '.join(weak_areas) if weak_areas else 'None'}
- Learning Goals: {', '.join(learning_goals) if learning_goals else 'None'}

RESPONSE GUIDELINES:
1. Match content complexity to {user_level} level
2. Use {learning_style} learning approach when appropriate
3. Reference mastered concepts for better understanding
4. Address weak areas with extra attention
5. Align with learning goals
6. Be encouraging and supportive
7. Provide practical examples and applications
8. Include next steps or related concepts

LEARNING CONTEXT:
"""

        # Add specific learning context if available
        if context.get('current_topic'):
            context_prefix += f"- Current Topic: {context['current_topic']}\n"

        if context.get('session_context'):
            context_prefix += f"- Session Context: {context['session_context']}\n"

        context_prefix += "\nNow respond to the user's request:\n\n"

        return context_prefix + prompt

    async def _build_messages(self, prompt: str, context: Optional[Dict[str, Any]] = None) -> List[Dict[str, str]]:
        """Build message array for OpenAI chat completion"""
        messages = []

        # System message with role and guidelines
        system_message = {
            "role": "system",
            "content": """You are Learning Catalyst, an advanced AI learning assistant. Your goal is to help users learn effectively through personalized, interactive, and engaging educational experiences.

KEY PRINCIPLES:
- Adapt complexity to user's skill level
- Provide clear, structured explanations
- Use examples and analogies for better understanding
- Encourage active learning through questions
- Track progress and suggest next steps
- Be patient, supportive, and motivating

RESPONSE STYLE:
- Use markdown for formatting
- Include code examples when relevant
- Break complex topics into digestible parts
- Use emojis and visual elements for engagement
- Provide actionable next steps"""
        }

        messages.append(system_message)

        # Add conversation history if available
        if context and 'conversation_history' in context:
            for msg in context['conversation_history'][-10:]:  # Last 10 messages
                messages.append({
                    "role": msg['role'],
                    "content": msg['content']
                })

        # Add current user message
        messages.append({
            "role": "user",
            "content": prompt
        })

        return messages

    def _process_response(self, response) -> AIResponse:
        """Process OpenAI response into standardized format"""
        choice = response.choices[0]
        content = choice.message.content or ""

        return AIResponse(
            content=content,
            provider="openai",
            model=self.config.model,
            usage=response.usage._asdict() if response.usage else None,
            finish_reason=choice.finish_reason,
            created=response.created,
            response_id=response.id
        )

    async def estimate_tokens(self, text: str) -> int:
        """Estimate token count for text"""
        try:
            return len(self.tokenizer.encode(text))
        except Exception:
            # Fallback estimation (rough approximation)
            return len(text.split()) * 1.3

    async def get_model_info(self) -> Dict[str, Any]:
        """Get information about the current model"""
        return {
            "provider": "openai",
            "model": self.config.model,
            "max_tokens": self.config.max_tokens,
            "supports_streaming": True,
            "supports_functions": True,
            "context_window": self._get_context_window(),
            "cost_per_1k_tokens": self._get_pricing()
        }

    def _get_context_window(self) -> int:
        """Get context window size for current model"""
        model_windows = {
            "gpt-4": 8192,
            "gpt-4-32k": 32768,
            "gpt-4-turbo": 128000,
            "gpt-3.5-turbo": 16384,
            "gpt-3.5-turbo-16k": 16384
        }
        return model_windows.get(self.config.model, 4096)

    def _get_pricing(self) -> Dict[str, float]:
        """Get pricing information for current model"""
        # Prices per 1K tokens (as of 2024)
        pricing = {
            "gpt-4": {"input": 0.03, "output": 0.06},
            "gpt-4-32k": {"input": 0.06, "output": 0.12},
            "gpt-4-turbo": {"input": 0.01, "output": 0.03},
            "gpt-3.5-turbo": {"input": 0.0015, "output": 0.002},
            "gpt-3.5-turbo-16k": {"input": 0.003, "output": 0.004}
        }
        return pricing.get(self.config.model, {"input": 0.001, "output": 0.002})
```

### Anthropic Claude Provider

```python
# src/ai/providers/anthropic_provider.py

import asyncio
import json
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import anthropic
from anthropic import AsyncAnthropic

from src.ai.abstraction import AIProvider, AIResponse, ProviderConfig

@dataclass
class AnthropicConfig(ProviderConfig):
    api_key: str
    model: str = "claude-3-sonnet-20240229"
    max_tokens: int = 4000
    temperature: float = 0.7
    top_p: float = 1.0
    top_k: int = 250

class AnthropicProvider(AIProvider):
    """Anthropic Claude AI provider with advanced reasoning capabilities"""

    def __init__(self, config: AnthropicConfig):
        self.config = config
        self.client = AsyncAnthropic(api_key=config.api_key)

    async def generate_response(
        self,
        prompt: str,
        context: Optional[Dict[str, Any]] = None,
        stream: bool = False
    ) -> AIResponse:
        """Generate response using Claude with context optimization"""
        try:
            # Optimize prompt for Claude
            optimized_prompt = await self._optimize_prompt_for_claude(prompt, context)

            # Create system message
            system_message = await self._create_claude_system_message(context)

            # Make API call
            response = await self.client.messages.create(
                model=self.config.model,
                max_tokens=self.config.max_tokens,
                temperature=self.config.temperature,
                system=system_message,
                messages=[{
                    "role": "user",
                    "content": optimized_prompt
                }],
                stream=stream
            )

            if stream:
                return await self._handle_claude_streaming(response)
            else:
                return self._process_claude_response(response)

        except anthropic.RateLimitError:
            return AIResponse(
                content="Rate limit exceeded. Please try again in a moment.",
                provider="anthropic",
                model=self.config.model,
                usage=None,
                error="rate_limit_exceeded"
            )
        except anthropic.AuthenticationError:
            return AIResponse(
                content="Authentication failed. Please check your API key.",
                provider="anthropic",
                model=self.config.model,
                usage=None,
                error="authentication_failed"
            )
        except Exception as e:
            return AIResponse(
                content=f"An error occurred: {str(e)}",
                provider="anthropic",
                model=self.config.model,
                usage=None,
                error=str(e)
            )

    async def _optimize_prompt_for_claude(self, prompt: str, context: Optional[Dict[str, Any]] = None) -> str:
        """Optimize prompt specifically for Claude's capabilities"""
        if not context:
            return prompt

        # Claude-specific optimization
        claude_context = f"""
LEARNING CONTEXT:
User Skill Level: {context.get('skill_level', 'intermediate')}
Learning Style: {context.get('learning_style', 'visual')}
Recent Progress: {', '.join(context.get('recent_topics', [])[-3:])}
Mastered Concepts: {', '.join(context.get('mastered_concepts', []))}
Areas Needing Focus: {', '.join(context.get('weak_areas', []))}

CLAUDE-SPECIFIC INSTRUCTIONS:
- Use your strong reasoning and analytical capabilities
- Provide structured, well-organized explanations
- Include step-by-step breakdowns for complex concepts
- Use analogies and real-world examples
- Ask clarifying questions to ensure understanding
- Suggest practical applications and exercises

USER REQUEST:
{prompt}
"""
        return claude_context

    async def _create_claude_system_message(self, context: Optional[Dict[str, Any]] = None) -> str:
        """Create Claude-specific system message"""
        base_system = """You are Claude, an AI assistant integrated into Learning Catalyst. You excel at reasoning, analysis, and providing clear, structured educational content.

Your strengths:
- Complex reasoning and logical analysis
- Structured, well-organized explanations
- Step-by-step problem solving
- Identifying patterns and connections
- Adapting explanations to different learning styles

Approach:
1. Analyze the user's question and context
2. Provide structured, comprehensive answers
3. Use clear headings and bullet points
4. Include relevant examples and applications
5. Ask follow-up questions to check understanding
6. Suggest next steps for continued learning"""

        if context:
            base_system += f"\n\nCurrent Focus: {context.get('current_topic', 'General learning')}"

        return base_system

    def _process_claude_response(self, response) -> AIResponse:
        """Process Claude response into standardized format"""
        content = response.content[0].text if response.content else ""

        return AIResponse(
            content=content,
            provider="anthropic",
            model=self.config.model,
            usage=response.usage._asdict() if response.usage else None,
            stop_reason=response.stop_reason,
            response_id=response.id
        )
```

## Context-Aware AI Integration

### Intelligent Learning Context Management

```python
# src/core/context_aware_ai.py

import asyncio
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
import json

@dataclass
class LearningContext:
    user_id: str
    skill_level: str
    learning_style: str
    current_topic: Optional[str]
    session_id: str
    conversation_history: List[Dict[str, str]]
    mastered_concepts: List[str]
    weak_areas: List[str]
    recent_topics: List[str]
    learning_goals: List[str]
    preferences: Dict[str, Any]
    session_start_time: datetime
    last_interaction: datetime
    performance_metrics: Dict[str, float]

class ContextAwareAIManager:
    """Manages AI interactions with intelligent context awareness"""

    def __init__(self, ai_service, knowledge_graph, user_profile_manager):
        self.ai_service = ai_service
        self.knowledge_graph = knowledge_graph
        self.user_profile_manager = user_profile_manager
        self.active_sessions = {}

    async def initialize_session(self, user_id: str) -> str:
        """Initialize a new learning session with context"""
        session_id = f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{user_id}"

        # Load user profile
        user_profile = await self.user_profile_manager.get_profile(user_id)

        # Create learning context
        context = LearningContext(
            user_id=user_id,
            skill_level=user_profile.get('skill_level', 'intermediate'),
            learning_style=user_profile.get('learning_style', 'visual'),
            current_topic=None,
            session_id=session_id,
            conversation_history=[],
            mastered_concepts=user_profile.get('mastered_concepts', []),
            weak_areas=user_profile.get('weak_areas', []),
            recent_topics=user_profile.get('recent_topics', []),
            learning_goals=user_profile.get('learning_goals', []),
            preferences=user_profile.get('preferences', {}),
            session_start_time=datetime.now(),
            last_interaction=datetime.now(),
            performance_metrics=user_profile.get('performance_metrics', {})
        )

        self.active_sessions[session_id] = context
        return session_id

    async def generate_contextual_response(
        self,
        session_id: str,
        user_input: str,
        additional_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Generate AI response with full context awareness"""
        if session_id not in self.active_sessions:
            raise ValueError(f"Session {session_id} not found")

        context = self.active_sessions[session_id]

        # Update conversation history
        context.conversation_history.append({
            "role": "user",
            "content": user_input,
            "timestamp": datetime.now().isoformat()
        })

        # Analyze user input for intent and context
        intent_analysis = await self._analyze_user_intent(user_input, context)

        # Update context based on analysis
        await self._update_context_from_input(context, intent_analysis, user_input)

        # Build enhanced context for AI
        enhanced_context = await self._build_enhanced_context(context, additional_context)

        # Generate response with context optimization
        ai_response = await self.ai_service.generate_response(
            prompt=user_input,
            context=enhanced_context
        )

        # Process and enhance AI response
        enhanced_response = await self._enhance_ai_response(ai_response, context, intent_analysis)

        # Update context with response
        context.conversation_history.append({
            "role": "assistant",
            "content": enhanced_response.content,
            "timestamp": datetime.now().isoformat(),
            "provider": enhanced_response.provider,
            "model": enhanced_response.model
        })

        context.last_interaction = datetime.now()

        # Extract learning insights from response
        await self._extract_learning_insights(enhanced_response, context)

        return {
            "response": enhanced_response,
            "context": {
                "detected_intent": intent_analysis.get('intent'),
                "updated_topics": context.recent_topics[-3:],
                "suggested_actions": intent_analysis.get('suggested_actions', [])
            }
        }

    async def _analyze_user_intent(self, user_input: str, context: LearningContext) -> Dict[str, Any]:
        """Analyze user input to understand intent and learning needs"""
        try:
            # Use AI to analyze intent
            analysis_prompt = f"""
            Analyze the user's input for learning intent and context:

            USER INPUT: "{user_input}"

            CURRENT CONTEXT:
            - Skill Level: {context.skill_level}
            - Recent Topics: {', '.join(context.recent_topics[-5:])}
            - Current Session Time: {(datetime.now() - context.session_start_time).total_seconds() / 60:.1f} minutes
            - Conversation Length: {len(context.conversation_history)} messages

            Analyze and return JSON:
            {{
                "intent": "learn|practice|review|ask_help|navigate|other",
                "topic": "main topic being discussed",
                "complexity": "beginner|intermediate|advanced",
                "urgency": "low|medium|high",
                "emotional_state": "confident|confused|frustrated|curious|motivated",
                "suggested_actions": ["action1", "action2"],
                "related_concepts": ["concept1", "concept2"],
                "prerequisite_check": ["concept_needed_1", "concept_needed_2"]
            }}
            """

            response = await self.ai_service.generate_response(analysis_prompt)

            try:
                analysis = json.loads(response.content)
            except json.JSONDecodeError:
                # Fallback analysis
                analysis = {
                    "intent": "learn",
                    "topic": "general",
                    "complexity": context.skill_level,
                    "urgency": "medium",
                    "emotional_state": "curious",
                    "suggested_actions": ["continue_learning"],
                    "related_concepts": [],
                    "prerequisite_check": []
                }

            return analysis

        except Exception as e:
            # Return safe default analysis
            return {
                "intent": "learn",
                "topic": "general",
                "complexity": context.skill_level,
                "urgency": "medium",
                "emotional_state": "curious",
                "suggested_actions": ["continue_learning"],
                "related_concepts": [],
                "prerequisite_check": []
            }

    async def _update_context_from_input(
        self,
        context: LearningContext,
        intent_analysis: Dict[str, Any],
        user_input: str
    ) -> None:
        """Update learning context based on user input analysis"""
        # Update current topic if detected
        if intent_analysis.get('topic') and intent_analysis['topic'] != 'general':
            context.current_topic = intent_analysis['topic']

            # Add to recent topics if not already present
            if intent_analysis['topic'] not in context.recent_topics:
                context.recent_topics.append(intent_analysis['topic'])
                # Keep only last 10 topics
                if len(context.recent_topics) > 10:
                    context.recent_topics = context.recent_topics[-10:]

        # Update skill level based on complexity
        detected_complexity = intent_analysis.get('complexity', context.skill_level)
        if detected_complexity != context.skill_level:
            # Gradually adjust skill level based on patterns
            await self._adjust_skill_level(context, detected_complexity)

        # Track emotional state for personalization
        emotional_state = intent_analysis.get('emotional_state', 'curious')
        context.preferences['last_emotional_state'] = emotional_state

        # Update performance metrics based on urgency and patterns
        if 'performance_metrics' not in context.preferences:
            context.preferences['performance_metrics'] = {}

        context.preferences['performance_metrics']['last_urgency'] = intent_analysis.get('urgency', 'medium')

    async def _build_enhanced_context(
        self,
        context: LearningContext,
        additional_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Build comprehensive context for AI response generation"""
        base_context = {
            "user_id": context.user_id,
            "skill_level": context.skill_level,
            "learning_style": context.learning_style,
            "current_topic": context.current_topic,
            "conversation_history": context.conversation_history[-10:],  # Last 10 messages
            "mastered_concepts": context.mastered_concepts,
            "weak_areas": context.weak_areas,
            "recent_topics": context.recent_topics[-5:],  # Last 5 topics
            "learning_goals": context.learning_goals,
            "session_duration_minutes": (datetime.now() - context.session_start_time).total_seconds() / 60,
            "message_count": len(context.conversation_history),
            "preferences": context.preferences
        }

        # Add session context
        session_context = await self._analyze_session_patterns(context)
        base_context["session_context"] = session_context

        # Add knowledge graph context
        if context.current_topic:
            kg_context = await self._get_knowledge_graph_context(context.current_topic, context)
            base_context["knowledge_graph_context"] = kg_context

        # Merge additional context if provided
        if additional_context:
            base_context.update(additional_context)

        return base_context

    async def _analyze_session_patterns(self, context: LearningContext) -> Dict[str, Any]:
        """Analyze patterns in the current session"""
        if len(context.conversation_history) < 2:
            return {"pattern": "starting_session"}

        # Analyze conversation patterns
        user_messages = [msg for msg in context.conversation_history if msg['role'] == 'user']
        assistant_messages = [msg for msg in context.conversation_history if msg['role'] == 'assistant']

        # Calculate engagement metrics
        avg_user_message_length = sum(len(msg['content']) for msg in user_messages) / len(user_messages)
        session_pace = len(context.conversation_history) / ((datetime.now() - context.session_start_time).total_seconds() / 60)  # messages per minute

        # Detect learning patterns
        topic_changes = 0
        last_topic = None
        for msg in user_messages[-5:]:  # Check last 5 messages
            detected_topic = await self._extract_topic_from_message(msg['content'])
            if detected_topic and detected_topic != last_topic:
                topic_changes += 1
                last_topic = detected_topic

        return {
            "pattern": "active_learning" if session_pace > 2 else "deliberate_learning",
            "engagement_level": "high" if avg_user_message_length > 100 else "medium",
            "session_pace": session_pace,
            "topic_stability": "focused" if topic_changes < 2 else "exploratory",
            "time_of_day": datetime.now().hour,
            "session_duration_category": "short" if (datetime.now() - context.session_start_time).total_seconds() < 600 else "long"
        }

    async def _get_knowledge_graph_context(
        self,
        topic: str,
        context: LearningContext
    ) -> Dict[str, Any]:
        """Get knowledge graph context for current topic"""
        try:
            # Get related concepts from knowledge graph
            related_concepts = await self.knowledge_graph.get_related_concepts(
                topic,
                max_depth=2,
                user_mastered=context.mastered_concepts
            )

            # Get prerequisite analysis
            prerequisites = await self.knowledge_graph.get_prerequisites(topic)
            unmet_prereqs = [p for p in prerequisites if p not in context.mastered_concepts]

            # Get next steps
            next_concepts = await self.knowledge_graph.get_next_concepts(
                topic,
                context.mastered_concepts
            )

            return {
                "related_concepts": related_concepts,
                "unmet_prerequisites": unmet_prereqs,
                "next_concepts": next_concepts,
                "concept_difficulty": await self.knowledge_graph.get_concept_difficulty(topic),
                "estimated_learning_time": await self.knowledge_graph.estimate_learning_time(topic, context.skill_level)
            }

        except Exception as e:
            return {"error": f"Knowledge graph context unavailable: {str(e)}"}

    async def _enhance_ai_response(
        self,
        ai_response: AIResponse,
        context: LearningContext,
        intent_analysis: Dict[str, Any]
    ) -> AIResponse:
        """Enhance AI response with additional context and personalization"""
        enhanced_content = ai_response.content

        # Add personalized header based on emotional state
        emotional_state = intent_analysis.get('emotional_state', 'curious')
        if emotional_state == 'confused':
            enhanced_content = "🤔 Let me help clarify this for you.\n\n" + enhanced_content
        elif emotional_state == 'frustrated':
            enhanced_content = "💪 I understand this can be challenging. Let's break it down step by step.\n\n" + enhanced_content
        elif emotional_state == 'motivated':
            enhanced_content = "🚀 Great to see your enthusiasm! Let's dive into this.\n\n" + enhanced_content

        # Add learning progress indicators
        if context.current_topic and context.current_topic in context.mastered_concepts:
            enhanced_content += "\n\n✅ *You've already mastered this topic. Would you like to explore advanced concepts or related areas?*"

        # Add suggested next steps based on context
        suggested_actions = intent_analysis.get('suggested_actions', [])
        if suggested_actions:
            next_steps_text = "\n\n**Next Steps:**\n"
            for i, action in enumerate(suggested_actions[:3], 1):
                next_steps_text += f"{i}. {action}\n"
            enhanced_content += next_steps_text

        # Add related concepts if available
        related_concepts = intent_analysis.get('related_concepts', [])
        if related_concepts:
            enhanced_content += f"\n\n**Related Concepts:** {', '.join(related_concepts[:3])}"

        # Update response object
        return AIResponse(
            content=enhanced_content,
            provider=ai_response.provider,
            model=ai_response.model,
            usage=ai_response.usage,
            finish_reason=ai_response.finish_reason,
            created=ai_response.created,
            response_id=ai_response.response_id,
            error=ai_response.error
        )

    async def _extract_learning_insights(
        self,
        ai_response: AIResponse,
        context: LearningContext
    ) -> None:
        """Extract learning insights from AI response"""
        try:
            # Use AI to extract key concepts and insights
            insight_prompt = f"""
            Extract learning insights from this AI response:

            RESPONSE: "{ai_response.content[:500]}..."  # First 500 chars

            Return JSON:
            {{
                "key_concepts": ["concept1", "concept2"],
                "learning_objectives": ["objective1", "objective2"],
                "difficulty_assessment": "beginner|intermediate|advanced",
                "prerequisite_concepts": ["prereq1", "prereq2"],
                "suggested_practice": ["practice1", "practice2"]
            }}
            """

            insight_response = await self.ai_service.generate_response(insight_prompt)

            try:
                insights = json.loads(insight_response.content)

                # Update context with extracted insights
                if insights.get('key_concepts'):
                    for concept in insights['key_concepts']:
                        if concept not in context.recent_topics:
                            context.recent_topics.append(concept)

                # Update preferences with learning insights
                context.preferences['last_difficulty_assessment'] = insights.get('difficulty_assessment', context.skill_level)

            except json.JSONDecodeError:
                pass  # Continue without insights if parsing fails

        except Exception as e:
            # Continue without insights if analysis fails
            pass
```

## Adaptive Learning Features

### Personalized Difficulty Adjustment

```python
# src/core/adaptive_learning.py

import asyncio
import statistics
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from datetime import datetime, timedelta

@dataclass
class LearningMetric:
    concept_id: str
    response_time: float
    accuracy: float
    attempts: int
    timestamp: datetime
    question_type: str
    difficulty_level: str

class AdaptiveDifficultyManager:
    """Manages adaptive difficulty adjustment based on user performance"""

    def __init__(self, user_profile_manager, knowledge_graph):
        self.user_profile_manager = user_profile_manager
        self.knowledge_graph = knowledge_graph
        self.performance_history = {}

    async def adjust_difficulty(
        self,
        user_id: str,
        concept_id: str,
        performance_data: LearningMetric
    ) -> Dict[str, Any]:
        """Adjust difficulty based on user performance"""
        # Get user's performance history
        user_history = await self._get_user_performance_history(user_id, concept_id)
        user_history.append(performance_data)

        # Analyze performance patterns
        performance_analysis = self._analyze_performance(user_history)

        # Calculate appropriate difficulty level
        recommended_difficulty = await self._calculate_optimal_difficulty(
            user_id,
            concept_id,
            performance_analysis
        )

        # Generate personalized recommendations
        recommendations = await self._generate_difficulty_recommendations(
            user_id,
            concept_id,
            performance_analysis,
            recommended_difficulty
        )

        return {
            "recommended_difficulty": recommended_difficulty,
            "performance_analysis": performance_analysis,
            "recommendations": recommendations,
            "adjustment_reason": self._get_adjustment_reason(performance_analysis)
        }

    def _analyze_performance(self, history: List[LearningMetric]) -> Dict[str, Any]:
        """Analyze performance patterns from history"""
        if not history:
            return {"trend": "no_data", "stability": "unknown"}

        recent_performance = history[-10:]  # Last 10 attempts
        older_performance = history[-20:-10] if len(history) > 10 else []

        # Calculate key metrics
        recent_accuracy = statistics.mean([p.accuracy for p in recent_performance])
        recent_response_time = statistics.mean([p.response_time for p in recent_performance])
        recent_attempts = len(recent_performance)

        # Calculate trends
        accuracy_trend = self._calculate_trend([p.accuracy for p in recent_performance])
        response_time_trend = self._calculate_trend([p.response_time for p in recent_performance])

        # Assess stability
        accuracy_stability = statistics.stdev([p.accuracy for p in recent_performance]) if len(recent_performance) > 1 else 0
        response_time_stability = statistics.stdev([p.response_time for p in recent_performance]) if len(recent_performance) > 1 else 0

        return {
            "recent_accuracy": recent_accuracy,
            "recent_response_time": recent_response_time,
            "recent_attempts": recent_attempts,
            "accuracy_trend": accuracy_trend,
            "response_time_trend": response_time_trend,
            "accuracy_stability": accuracy_stability,
            "response_time_stability": response_time_stability,
            "overall_performance": self._assess_overall_performance(recent_accuracy, recent_response_time, accuracy_trend)
        }

    def _calculate_trend(self, values: List[float]) -> str:
        """Calculate trend direction from values"""
        if len(values) < 3:
            return "insufficient_data"

        # Simple linear trend calculation
        recent_avg = statistics.mean(values[-3:])
        older_avg = statistics.mean(values[-6:-3]) if len(values) >= 6 else statistics.mean(values[:-3])

        if recent_avg > older_avg * 1.1:
            return "improving"
        elif recent_avg < older_avg * 0.9:
            return "declining"
        else:
            return "stable"

    def _assess_overall_performance(
        self,
        accuracy: float,
        response_time: float,
        accuracy_trend: str
    ) -> str:
        """Assess overall performance level"""
        if accuracy >= 0.8 and response_time < 30 and accuracy_trend == "improving":
            return "excellent"
        elif accuracy >= 0.7 and response_time < 45 and accuracy_trend in ["improving", "stable"]:
            return "good"
        elif accuracy >= 0.5 and response_time < 60:
            return "developing"
        else:
            return "needs_improvement"

    async def _calculate_optimal_difficulty(
        self,
        user_id: str,
        concept_id: str,
        performance_analysis: Dict[str, Any]
    ) -> str:
        """Calculate optimal difficulty level based on performance"""
        overall_performance = performance_analysis.get("overall_performance", "developing")
        accuracy_trend = performance_analysis.get("accuracy_trend", "stable")
        recent_accuracy = performance_analysis.get("recent_accuracy", 0.5)

        # Get user's current skill level
        user_profile = await self.user_profile_manager.get_profile(user_id)
        base_skill_level = user_profile.get('skill_level', 'intermediate')

        # Difficulty adjustment logic
        if overall_performance == "excellent" and accuracy_trend == "improving":
            return self._increase_difficulty(base_skill_level)
        elif overall_performance in ["good", "developing"] and accuracy_trend in ["improving", "stable"]:
            return base_skill_level
        elif overall_performance == "needs_improvement" or accuracy_trend == "declining":
            return self._decrease_difficulty(base_skill_level)
        else:
            return base_skill_level

    def _increase_difficulty(self, current_level: str) -> str:
        """Increase difficulty level"""
        difficulty_hierarchy = ["beginner", "intermediate", "advanced", "expert"]
        current_index = difficulty_hierarchy.index(current_level)
        if current_index < len(difficulty_hierarchy) - 1:
            return difficulty_hierarchy[current_index + 1]
        return current_level

    def _decrease_difficulty(self, current_level: str) -> str:
        """Decrease difficulty level"""
        difficulty_hierarchy = ["beginner", "intermediate", "advanced", "expert"]
        current_index = difficulty_hierarchy.index(current_level)
        if current_index > 0:
            return difficulty_hierarchy[current_index - 1]
        return current_level

    async def _generate_difficulty_recommendations(
        self,
        user_id: str,
        concept_id: str,
        performance_analysis: Dict[str, Any],
        recommended_difficulty: str
    ) -> List[str]:
        """Generate personalized recommendations based on difficulty adjustment"""
        recommendations = []

        overall_performance = performance_analysis.get("overall_performance", "developing")
        accuracy_trend = performance_analysis.get("accuracy_trend", "stable")
        recent_accuracy = performance_analysis.get("recent_accuracy", 0.5)

        if overall_performance == "excellent":
            recommendations.extend([
                "🎯 Challenge yourself with more complex problems",
                "📚 Explore advanced applications of this concept",
                "👥 Try teaching this concept to others"
            ])
        elif overall_performance == "good":
            recommendations.extend([
                "✅ Continue practicing at this level",
                "🔗 Look for real-world applications",
                "📝 Try explaining concepts in your own words"
            ])
        elif overall_performance == "developing":
            recommendations.extend([
                "📖 Review fundamental concepts",
                "💪 Practice with more examples",
                "🤝 Consider studying with a peer"
            ])
        else:  # needs_improvement
            recommendations.extend([
                "🔙 Return to basic concepts",
                "📚 Use additional learning resources",
                "👨‍🏫 Ask for help or clarification"
            ])

        # Add specific recommendations based on trends
        if accuracy_trend == "declining":
            recommendations.append("⚠️ Take a short break and refresh your mind")
        elif accuracy_trend == "improving":
            recommendations.append("🚀 Keep up the great progress!")

        return recommendations[:5]  # Return top 5 recommendations

    def _get_adjustment_reason(self, performance_analysis: Dict[str, Any]) -> str:
        """Get reason for difficulty adjustment"""
        overall_performance = performance_analysis.get("overall_performance", "developing")
        accuracy_trend = performance_analysis.get("accuracy_trend", "stable")
        recent_accuracy = performance_analysis.get("recent_accuracy", 0.5)

        if overall_performance == "excellent":
            return "Strong performance indicates readiness for greater challenges"
        elif overall_performance == "good":
            return "Solid performance maintains appropriate difficulty level"
        elif overall_performance == "developing":
            return "Developing performance suggests current difficulty is appropriate"
        else:
            return "Performance indicates need for foundational reinforcement"
```

## Testing AI Integration

```python
# tests/unit/ai/test_openai_provider.py

import pytest
import asyncio
from unittest.mock import AsyncMock, Mock, patch
from src.ai.providers.openai_provider import OpenAIProvider, OpenAIConfig

class TestOpenAIProvider:
    @pytest.fixture
    def mock_config(self):
        return OpenAIConfig(
            api_key="test-key",
            model="gpt-4",
            max_tokens=1000,
            temperature=0.7
        )

    @pytest.fixture
    def mock_preferences_manager(self):
        return Mock()

    @pytest.fixture
    def openai_provider(self, mock_config, mock_preferences_manager):
        with patch('src.ai.providers.openai_provider.AsyncOpenAI'):
            return OpenAIProvider(mock_config, mock_preferences_manager)

    @pytest.mark.asyncio
    async def test_generate_response_success(self, openai_provider):
        """Test successful response generation"""
        # Mock OpenAI response
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = "Test response"
        mock_response.choices[0].finish_reason = "stop"
        mock_response.usage = Mock()
        mock_response.usage._asdict.return_value = {"prompt_tokens": 10, "completion_tokens": 20}
        mock_response.created = 1234567890
        mock_response.id = "test-response-id"

        openai_provider.client.chat.completions.create = AsyncMock(return_value=mock_response)

        # Test response generation
        response = await openai_provider.generate_response("Test prompt")

        assert response.content == "Test response"
        assert response.provider == "openai"
        assert response.model == "gpt-4"
        assert response.usage == {"prompt_tokens": 10, "completion_tokens": 20}

    @pytest.mark.asyncio
    async def test_context_optimization(self, openai_provider):
        """Test prompt optimization with context"""
        context = {
            "skill_level": "beginner",
            "learning_style": "visual",
            "recent_topics": ["python basics", "variables"],
            "mastered_concepts": ["variables"],
            "weak_areas": ["loops"]
        }

        optimized_prompt = await openai_provider._optimize_prompt("What are functions?", context)

        assert "skill_level: beginner" in optimized_prompt
        assert "learning_style: visual" in optimized_prompt
        assert "Recent Topics: python basics, variables" in optimized_prompt
        assert "Mastered Concepts: variables" in optimized_prompt
        assert "Areas for Improvement: loops" in optimized_prompt

    @pytest.mark.asyncio
    async def test_rate_limit_handling(self, openai_provider):
        """Test rate limit error handling"""
        import openai
        openai_provider.client.chat.completions.create = AsyncMock(
            side_effect=openai.RateLimitError("Rate limit exceeded", response=Mock(), body={})
        )

        response = await openai_provider.generate_response("Test prompt")

        assert "Rate limit exceeded" in response.content
        assert response.error == "rate_limit_exceeded"

    @pytest.mark.asyncio
    async def test_authentication_error_handling(self, openai_provider):
        """Test authentication error handling"""
        import openai
        openai_provider.client.chat.completions.create = AsyncMock(
            side_effect=openai.AuthenticationError("Invalid API key", response=Mock(), body={})
        )

        response = await openai_provider.generate_response("Test prompt")

        assert "Authentication failed" in response.content
        assert response.error == "authentication_failed"

    def test_token_estimation(self, openai_provider):
        """Test token estimation"""
        text = "This is a test sentence for token estimation."
        tokens = asyncio.run(openai_provider.estimate_tokens(text))

        assert isinstance(tokens, int)
        assert tokens > 0

    def test_model_info(self, openai_provider):
        """Test model information retrieval"""
        model_info = asyncio.run(openai_provider.get_model_info())

        assert model_info["provider"] == "openai"
        assert model_info["model"] == "gpt-4"
        assert model_info["max_tokens"] == 1000
        assert model_info["supports_streaming"] == True
        assert "context_window" in model_info
        assert "cost_per_1k_tokens" in model_info

# tests/unit/core/test_context_aware_ai.py

import pytest
from unittest.mock import AsyncMock, Mock
from datetime import datetime, timedelta
from src.core.context_aware_ai import ContextAwareAIManager, LearningContext

class TestContextAwareAIManager:
    @pytest.fixture
    def mock_ai_service(self):
        service = AsyncMock()
        service.generate_response.return_value = Mock(content="Test response", provider="test", model="test-model")
        return service

    @pytest.fixture
    def mock_knowledge_graph(self):
        kg = AsyncMock()
        kg.get_related_concepts.return_value = ["related_concept1", "related_concept2"]
        kg.get_prerequisites.return_value = ["prereq1", "prereq2"]
        kg.get_next_concepts.return_value = ["next_concept1"]
        return kg

    @pytest.fixture
    def mock_user_profile_manager(self):
        manager = AsyncMock()
        manager.get_profile.return_value = {
            "skill_level": "intermediate",
            "learning_style": "visual",
            "mastered_concepts": ["python_basics"],
            "weak_areas": ["algorithms"],
            "recent_topics": ["variables", "functions"],
            "learning_goals": ["master_python"],
            "preferences": {"theme": "dark"}
        }
        return manager

    @pytest.fixture
    def context_manager(self, mock_ai_service, mock_knowledge_graph, mock_user_profile_manager):
        return ContextAwareAIManager(mock_ai_service, mock_knowledge_graph, mock_user_profile_manager)

    @pytest.mark.asyncio
    async def test_initialize_session(self, context_manager):
        """Test session initialization"""
        session_id = await context_manager.initialize_session("user123")

        assert session_id.startswith("session_")
        assert session_id in context_manager.active_sessions

        context = context_manager.active_sessions[session_id]
        assert context.user_id == "user123"
        assert context.skill_level == "intermediate"
        assert context.learning_style == "visual"

    @pytest.mark.asyncio
    async def test_contextual_response_generation(self, context_manager):
        """Test contextual response generation"""
        # Initialize session
        session_id = await context_manager.initialize_session("user123")

        # Mock intent analysis
        context_manager._analyze_user_intent = AsyncMock(return_value={
            "intent": "learn",
            "topic": "python_functions",
            "complexity": "intermediate",
            "urgency": "medium",
            "emotional_state": "curious",
            "suggested_actions": ["practice_exercises", "review_examples"],
            "related_concepts": ["parameters", "return_values"],
            "prerequisite_check": []
        })

        # Generate contextual response
        result = await context_manager.generate_contextual_response(
            session_id,
            "Explain Python functions to me"
        )

        assert "response" in result
        assert "context" in result
        assert result["context"]["detected_intent"] == "learn"
        assert "python_functions" in result["context"]["updated_topics"]

        # Verify context was updated
        context = context_manager.active_sessions[session_id]
        assert context.current_topic == "python_functions"
        assert "python_functions" in context.recent_topics

    @pytest.mark.asyncio
    async def test_session_pattern_analysis(self, context_manager):
        """Test session pattern analysis"""
        # Create a context with conversation history
        context = LearningContext(
            user_id="user123",
            skill_level="intermediate",
            learning_style="visual",
            current_topic="python",
            session_id="test_session",
            conversation_history=[
                {"role": "user", "content": "What are variables?"},
                {"role": "assistant", "content": "Variables store data..."},
                {"role": "user", "content": "How do I use lists?"},
                {"role": "assistant", "content": "Lists are collections..."},
                {"role": "user", "content": "What about dictionaries?"}
            ],
            mastered_concepts=[],
            weak_areas=[],
            recent_topics=["variables", "lists"],
            learning_goals=[],
            preferences={},
            session_start_time=datetime.now() - timedelta(minutes=15),
            last_interaction=datetime.now(),
            performance_metrics={}
        )

        patterns = await context_manager._analyze_session_patterns(context)

        assert "pattern" in patterns
        assert "engagement_level" in patterns
        assert "session_pace" in patterns
        assert patterns["session_duration_category"] == "long"

    @pytest.mark.asyncio
    async def test_knowledge_graph_context(self, context_manager):
        """Test knowledge graph context integration"""
        context = LearningContext(
            user_id="user123",
            skill_level="intermediate",
            learning_style="visual",
            current_topic="python_functions",
            session_id="test_session",
            conversation_history=[],
            mastered_concepts=["variables", "data_types"],
            weak_areas=["algorithms"],
            recent_topics=["variables"],
            learning_goals=[],
            preferences={},
            session_start_time=datetime.now(),
            last_interaction=datetime.now(),
            performance_metrics={}
        )

        kg_context = await context_manager._get_knowledge_graph_context("python_functions", context)

        assert "related_concepts" in kg_context
        assert "unmet_prerequisites" in kg_context
        assert "next_concepts" in kg_context
        assert "concept_difficulty" in kg_context
```

## Best Practices for AI Integration

### 1. Context Management
- Maintain comprehensive user context including skill level, learning style, and history
- Update context dynamically based on interactions and performance
- Use context to personalize responses and recommendations

### 2. Provider Abstraction
- Implement consistent interfaces across all AI providers
- Handle provider-specific errors gracefully
- Support provider switching without losing context

### 3. Performance Optimization
- Implement caching for frequently accessed content
- Use streaming responses for long content
- Optimize token usage and manage rate limits

### 4. Error Handling
- Provide meaningful fallback responses when AI services fail
- Implement retry logic for transient errors
- Log errors for debugging while maintaining user experience

### 5. Testing Strategy
- Mock AI services for unit testing
- Test context management and personalization logic
- Verify error handling and fallback behavior
- Test performance under various load conditions

This comprehensive AI integration system enables Learning Catalyst to provide intelligent, personalized learning experiences that adapt to each user's needs, preferences, and learning patterns.