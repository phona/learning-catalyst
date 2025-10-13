"""
Integration tests for AI Integration.

Following Test-Driven Development methodology, these tests define the expected behavior
of AI integration based on real-world usage patterns from docs/examples/.
Tests cover AI interactions, tool execution, context management, and response processing.
"""

import pytest
import asyncio
from typing import Dict, Any, List
from unittest.mock import Mock, AsyncMock, patch
from tests.test_helpers import (
    measure_async_performance,
    assert_async_performance_under,
    create_mock_provider
)


class TestAIIntegration:
    """Integration tests for AI functionality."""

    @pytest.mark.integration
    @pytest.mark.ai
    async def test_ai_conversation_flow_workflow(self):
        """Test complete AI conversation flow with context management."""
        from src.ai.service import AIService
        from src.core.context_manager import ContextManager

        ai_service = AIService()
        context_manager = ContextManager()

        # Step 1: Initialize conversation context
        context_result = await context_manager.create_conversation_context(
            user_id="conversation_user",
            topic="Python Programming",
            session_id="session_123"
        )
        assert context_result['success'] is True
        context_id = context_result['context_id']

        # Step 2: Start conversation with greeting
        greeting_response = await ai_service.generate_response(
            "Hello! I want to learn Python programming. Where should I start?",
            context_id=context_id,
            conversation_mode="learning"
        )
        assert greeting_response['success'] is True
        assert 'python' in greeting_response['response'].lower()
        assert 'start' in greeting_response['response'].lower()

        # Step 3: Follow-up question about variables
        variables_response = await ai_service.generate_response(
            "Can you explain Python variables and give me some examples?",
            context_id=context_id,
            conversation_mode="learning"
        )
        assert variables_response['success'] is True
        assert 'variables' in variables_response['response'].lower()
        assert 'example' in variables_response['response'].lower()

        # Step 4: Request code example
        code_response = await ai_service.generate_response(
            "Show me how to create and use variables in a simple program",
            context_id=context_id,
            conversation_mode="coding",
            include_code=True
        )
        assert code_response['success'] is True
        assert 'code' in code_response['response'].lower()
        assert '```python' in code_response['response']

        # Step 5: Ask for clarification
        clarification_response = await ai_service.generate_response(
            "What's the difference between integers and strings?",
            context_id=context_id,
            conversation_mode="learning"
        )
        assert clarification_response['success'] is True
        assert 'integer' in clarification_response['response'].lower()
        assert 'string' in clarification_response['response'].lower()

        # Step 6: Get conversation summary
        summary_result = await ai_service.get_conversation_summary(context_id)
        assert summary_result['success'] is True
        summary = summary_result['data']

        assert 'topics_discussed' in summary
        assert 'concepts_covered' in summary
        assert 'user_progress_indicators' in summary
        assert len(summary['topics_discussed']) >= 3

    @pytest.mark.integration
    @pytest.mark.ai
    async def test_ai_tool_execution_workflow(self):
        """Test AI tool calling and execution workflow."""
        from src.ai.service import AIService
        from src.ai.tool_manager import ToolManager

        ai_service = AIService()
        tool_manager = ToolManager()

        # Step 1: Register available tools
        tools = [
            {
                "name": "code_executor",
                "description": "Execute Python code and return results",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "code": {"type": "string"},
                        "language": {"type": "string", "enum": ["python"]}
                    },
                    "required": ["code"]
                }
            },
            {
                "name": "web_search",
                "description": "Search the web for information",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string"},
                        "max_results": {"type": "integer", "default": 5}
                    },
                    "required": ["query"]
                }
            },
            {
                "name": "file_operations",
                "description": "Perform file operations",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "operation": {"type": "string", "enum": ["read", "write", "list"]},
                        "path": {"type": "string"},
                        "content": {"type": "string"}
                    },
                    "required": ["operation", "path"]
                }
            }
        ]

        for tool in tools:
            await tool_manager.register_tool(tool)

        # Step 2: Make request that triggers tool usage
        tool_request = "Calculate the factorial of 5 using Python code"
        tool_response = await ai_service.generate_response_with_tools(
            prompt=tool_request,
            available_tools=tools,
            context_id="tool_context"
        )
        assert tool_response['success'] is True
        assert 'tool_calls' in tool_response
        assert len(tool_response['tool_calls']) > 0

        # Step 3: Execute tools and get results
        tool_results = []
        for tool_call in tool_response['tool_calls']:
            if tool_call['tool_name'] == 'code_executor':
                execution_result = await tool_manager.execute_tool(
                    tool_name='code_executor',
                    parameters={'code': 'def factorial(n): return n * factorial(n-1) if n > 1 else 1; print(factorial(5))', 'language': 'python'}
                )
                tool_results.append(execution_result)

        assert len(tool_results) > 0
        assert tool_results[0]['success'] is True

        # Step 4: Generate final response with tool results
        final_response = await ai_service.generate_response_from_tool_results(
            original_prompt=tool_request,
            tool_results=tool_results
        )
        assert final_response['success'] is True
        assert '120' in final_response['response']  # 5! = 120

    @pytest.mark.integration
    @pytest.mark.ai
    async def test_ai_context_awareness_workflow(self):
        """Test AI context awareness and memory management."""
        from src.ai.service import AIService
        from src.core.context_manager import ContextManager

        ai_service = AIService()
        context_manager = ContextManager()

        # Step 1: Create rich context with user information
        user_context = {
            "user_id": "context_user",
            "skill_level": "intermediate",
            "learning_goals": ["web development", "data analysis"],
            "preferred_learning_style": "visual",
            "previous_concepts": ["HTML", "CSS", "JavaScript basics"],
            "current_topic": "Python programming",
            "session_progress": {
                "concepts_covered": 3,
                "time_spent_minutes": 45,
                "questions_asked": 8
            }
        }

        context_result = await context_manager.create_rich_context(
            context_data=user_context
        )
        context_id = context_result['context_id']

        # Step 2: Make context-aware request
        context_response = await ai_service.generate_context_aware_response(
            prompt="What should I learn next in Python?",
            context_id=context_id
        )
        assert context_response['success'] is True

        # Response should consider user's background
        response_text = context_response['response'].lower()
        assert any(goal in response_text for goal in ['web', 'data', 'analysis'])
        assert 'javascript' in response_text  # Should reference previous knowledge

        # Step 3: Add more context dynamically
        await context_manager.add_context_item(
            context_id=context_id,
            item={
                "type": "user_question",
                "content": "How can I use Python for web development?",
                "timestamp": "2025-01-20T15:30:00Z"
            }
        )

        # Step 4: Make follow-up request with updated context
        followup_response = await ai_service.generate_context_aware_response(
            prompt="Give me a specific example of Python for web development",
            context_id=context_id
        )
        assert followup_response['success'] is True

        # Should reference the web development question
        assert 'web development' in followup_response['response'].lower()
        assert 'example' in followup_response['response'].lower()

        # Step 5: Test context compression when it gets large
        for i in range(20):
            await context_manager.add_context_item(
                context_id=context_id,
                item={
                    "type": "learning_interaction",
                    "content": f"Learning interaction {i}",
                    "timestamp": f"2025-01-20T15:{30+i}:00Z"
                }
            )

        # Trigger compression
        compression_result = await context_manager.compress_context(context_id)
        assert compression_result['success'] is True
        assert compression_result['data']['compressed'] is True

    @pytest.mark.integration
    @pytest.mark.ai
    async def test_ai_personalization_workflow(self):
        """Test AI personalization based on user learning patterns."""
        from src.ai.service import AIService
        from src.core.personalization_engine import PersonalizationEngine

        ai_service = AIService()
        personalization_engine = PersonalizationEngine()

        # Step 1: Build user learning profile
        user_profile = {
            "user_id": "personalized_user",
            "learning_patterns": {
                "preferred_response_length": "medium",
                "likes_examples": True,
                "prefers_step_by_step": True,
                "questions_before_answers": 2
            },
            "knowledge_level": {
                "python": "intermediate",
                "javascript": "beginner",
                "sql": "advanced"
            },
            "learning_style": {
                "visual_preference": 0.8,
                "text_preference": 0.6,
                "interactive_preference": 0.9
            }
        }

        await personalization_engine.create_profile(user_profile)

        # Step 2: Generate personalized response
        personalized_response = await ai_service.generate_personalized_response(
            prompt="Explain list comprehensions in Python",
            user_profile=user_profile,
            context_id="personalized_context"
        )
        assert personalized_response['success'] is True

        response_text = personalized_response['response']
        # Should include examples (user likes examples)
        assert 'example' in response_text.lower() or '```' in response_text
        # Should be step-by-step (user prefers this)
        assert any(indicator in response_text.lower() for indicator in ['step', 'first', 'then', 'finally'])

        # Step 3: Track user interaction to refine personalization
        interaction_data = {
            "prompt": "Explain list comprehensions in Python",
            "response": personalized_response['response'],
            "user_feedback": {
                "helpful": True,
                "too_long": False,
                "more_examples_needed": True,
                "response_time_satisfaction": 4.5
            },
            "follow_up_questions": 2
        }

        await personalization_engine.record_interaction(
            user_id="personalized_user",
            interaction_data=interaction_data
        )

        # Step 4: Generate refined personalized response
        refined_response = await ai_service.generate_personalized_response(
            prompt="Now explain dictionary comprehensions",
            user_profile=await personalization_engine.get_updated_profile("personalized_user"),
            context_id="personalized_context"
        )
        assert refined_response['success'] is True

        # Should be refined based on previous feedback
        refined_text = refined_response['response']
        assert 'example' in refined_text.lower()  # Should include more examples

        # Step 5: Get personalization insights
        insights = await personalization_engine.get_personalization_insights(
            user_id="personalized_user"
        )
        assert insights['success'] is True
        assert 'learning_preferences' in insights['data']
        assert 'response_effectiveness' in insights['data']

    @pytest.mark.integration
    @pytest.mark.ai
    async def test_ai_multi_provider_workflow(self):
        """Test AI response coordination across multiple providers."""
        from src.ai.service import AIService
        from src.ai.provider_coordinator import ProviderCoordinator

        ai_service = AIService()
        coordinator = ProviderCoordinator()

        # Step 1: Configure multiple providers
        providers = [
            {"name": "openai", "model": "gpt-4o-mini", "strengths": ["coding", "analysis"]},
            {"name": "anthropic", "model": "claude-3-sonnet", "strengths": ["reasoning", "explanation"]},
            {"name": "deepseek", "model": "deepseek-chat", "strengths": ["mathematics", "logic"]}
        ]

        for provider in providers:
            await coordinator.add_provider(provider)

        # Step 2: Make request requiring different provider strengths
        complex_request = "Create a Python function that calculates Fibonacci numbers and explain the mathematical concept behind it"

        # Step 3: Get coordinated response from best providers
        coordinated_response = await coordinator.get_coordinated_response(
            prompt=complex_request,
            required_capabilities=["coding", "mathematics", "explanation"],
            coordination_strategy="best_provider_per_task"
        )
        assert coordinated_response['success'] is True

        response_data = coordinated_response['data']
        assert 'code_example' in response_data
        assert 'mathematical_explanation' in response_data
        assert 'provider_contributions' in response_data

        # Should use different providers for different aspects
        contributions = response_data['provider_contributions']
        assert len(contributions) >= 2  # Should use multiple providers
        assert any(contribution['aspect'] == 'coding' for contribution in contributions)
        assert any(contribution['aspect'] == 'mathematics' for contribution in contributions)

        # Step 4: Test provider fallback coordination
        with patch.object(coordinator, '_get_provider_health') as mock_health:
            # Simulate one provider being unhealthy
            mock_health.return_value = {
                "openai": {"healthy": True, "response_time": 500},
                "anthropic": {"healthy": False, "response_time": 5000},  # Unhealthy
                "deepseek": {"healthy": True, "response_time": 800}
            }

            fallback_response = await coordinator.get_coordinated_response(
                prompt="Explain recursion in Python",
                required_capabilities=["explanation"],
                coordination_strategy="primary_with_fallback"
            )
            assert fallback_response['success'] is True
            # Should not use unhealthy provider
            used_providers = [contrib['provider'] for contrib in fallback_response['data']['provider_contributions']]
            assert 'anthropic' not in used_providers

    @pytest.mark.integration
    @pytest.mark.ai
    async def test_ai_error_handling_workflow(self):
        """Test AI error handling and recovery mechanisms."""
        from src.ai.service import AIService
        from src.ai.error_handler import AIErrorHandler

        ai_service = AIService()
        error_handler = AIErrorHandler()

        # Step 1: Test handling of API rate limiting
        with patch.object(ai_service, '_make_api_call') as mock_api:
            mock_api.side_effect = Exception("Rate limit exceeded")

            rate_limit_response = await ai_service.generate_response_with_retry(
                prompt="Test question",
                max_retries=3,
                retry_strategy="exponential_backoff"
            )
            # Should handle rate limit gracefully
            assert rate_limit_response['success'] is False
            assert 'rate_limit' in rate_limit_response['error']['code'].lower()

        # Step 2: Test handling of content filtering
        with patch.object(ai_service, '_make_api_call') as mock_api:
            mock_api.return_value = {
                "choices": [{"message": {"content": "I cannot answer that question."}}]
            }

            filtered_response = await ai_service.generate_response(
                prompt="Inappropriate question"
            )
            assert filtered_response['success'] is True
            assert 'cannot answer' in filtered_response['response'].lower()

        # Step 3: Test handling of token limit exceeded
        with patch.object(ai_service, '_make_api_call') as mock_api:
            mock_api.side_effect = Exception("Maximum token limit exceeded")

            token_limit_response = await ai_service.generate_response_with_chunking(
                prompt="Very long prompt that exceeds token limits..." * 100,
                max_chunk_size=1000
            )
            # Should attempt to chunk the request
            assert token_limit_response['success'] or 'chunking' in str(token_limit_response.get('error', {}))

        # Step 4: Test graceful degradation
        with patch.object(ai_service, '_make_api_call') as mock_api:
            mock_api.side_effect = [
                Exception("Primary provider unavailable"),
                Exception("Secondary provider unavailable"),
                {"choices": [{"message": {"content": "Fallback response"}}]}  # Third provider works
            ]

            fallback_response = await ai_service.generate_response_with_fallback(
                prompt="Test question",
                providers=["openai", "anthropic", "deepseek"]
            )
            assert fallback_response['success'] is True
            assert 'fallback' in fallback_response['metadata']

        # Step 5: Test error recovery suggestions
        error_recovery = await error_handler.generate_recovery_suggestions(
            error_type="api_unavailable",
            context={"user_id": "test_user", "session_id": "test_session"}
        )
        assert error_recovery['success'] is True
        assert 'suggestions' in error_recovery['data']
        assert len(error_recovery['data']['suggestions']) > 0

    @pytest.mark.integration
    @pytest.mark.ai
    async def test_ai_performance_optimization_workflow(self):
        """Test AI performance optimization and caching."""
        from src.ai.service import AIService
        from src.ai.performance_optimizer import PerformanceOptimizer

        ai_service = AIService()
        optimizer = PerformanceOptimizer()

        # Step 1: Enable response caching
        await ai_service.enable_caching(cache_size_mb=10, ttl_seconds=3600)

        # Step 2: Make first request (cache miss)
        first_response = await ai_service.generate_response(
            prompt="What is machine learning?",
            cache_key="ml_definition"
        )
        assert first_response['success'] is True
        assert 'cache_hit' in first_response['metadata']
        assert first_response['metadata']['cache_hit'] is False

        # Step 3: Make same request again (cache hit)
        second_response = await ai_service.generate_response(
            prompt="What is machine learning?",
            cache_key="ml_definition"
        )
        assert second_response['success'] is True
        assert second_response['metadata']['cache_hit'] is True
        assert second_response['response_time_ms'] < first_response['response_time_ms']

        # Step 4: Test response optimization
        optimization_result = await optimizer.optimize_response_generation(
            prompt="Explain quantum computing",
            optimization_goals=["speed", "clarity", "conciseness"],
            context_id="optimization_context"
        )
        assert optimization_result['success'] is True
        assert 'optimized_response' in optimization_result['data']
        assert 'optimization_metrics' in optimization_result['data']

        # Step 5: Test batch processing optimization
        batch_prompts = [
            "What is Python?",
            "What is JavaScript?",
            "What is SQL?",
            "What is HTML?",
            "What is CSS?"
        ]

        async with measure_async_performance() as perf:
            batch_responses = await ai_service.generate_batch_responses(
                prompts=batch_prompts,
                batch_size=3,
                parallel_processing=True
            )

        assert len(batch_responses) == len(batch_prompts)
        assert all(response['success'] for response in batch_responses)
        # Batch processing should be faster than individual requests
        assert perf.execution_time < 10.0

        # Step 6: Get performance analytics
        performance_analytics = await optimizer.get_performance_analytics(
            time_period="last_hour"
        )
        assert performance_analytics['success'] is True
        analytics = performance_analytics['data']

        assert 'average_response_time' in analytics
        assert 'cache_hit_rate' in analytics
        assert 'success_rate' in analytics
        assert 'optimization_savings' in analytics

    @pytest.mark.integration
    @pytest.mark.ai
    async def test_ai_safety_and_moderation_workflow(self):
        """Test AI safety features and content moderation."""
        from src.ai.service import AIService
        from src.ai.safety_manager import SafetyManager

        ai_service = AIService()
        safety_manager = SafetyManager()

        # Step 1: Test input safety checking
        safe_input = "How do I create a function in Python?"
        unsafe_input = "How do I hack into a computer system?"

        safe_check = await safety_manager.check_input_safety(safe_input)
        assert safe_check['safe'] is True

        unsafe_check = await safety_manager.check_input_safety(unsafe_input)
        assert unsafe_check['safe'] is False
        assert 'harmful_content' in unsafe_check['violation_type']

        # Step 2: Test response moderation
        unmoderated_response = "Here's how you can hack systems: [detailed instructions]"
        moderated_response = await safety_manager.moderate_response(unmoderated_response)
        assert moderated_response['safe'] is False
        assert 'filtered' in moderated_response['status']
        assert len(moderated_response['filtered_content']) < len(unmoderated_response)

        # Step 3: Test safe response generation
        safe_response = await ai_service.generate_safe_response(
            prompt="How can I improve my programming skills?",
            safety_level="strict",
            context_id="safety_context"
        )
        assert safe_response['success'] is True
        assert safe_response['metadata']['safety_check_passed'] is True

        # Step 4: Test educational content filtering
        educational_response = await ai_service.generate_educational_response(
            prompt="Tell me about cybersecurity best practices",
            educational_context="programming_course",
            safety_filter=True
        )
        assert educational_response['success'] is True
        # Should provide educational content without harmful details
        response_text = educational_response['response'].lower()
        assert 'best practice' in response_text or 'security' in response_text
        assert 'hack' not in response_text or 'educational' in response_text

        # Step 5: Test safety violation logging and reporting
        safety_log = await safety_manager.get_safety_log(
            time_period="last_24_hours",
            user_id="test_user"
        )
        assert safety_log['success'] is True
        assert 'violations' in safety_log['data']
        assert 'safety_metrics' in safety_log['data']

    @pytest.mark.integration
    @pytest.mark.ai
    async def test_ai_multilingual_support_workflow(self):
        """Test AI multilingual capabilities and translation."""
        from src.ai.service import AIService
        from src.ai.translation_manager import TranslationManager

        ai_service = AIService()
        translation_manager = TranslationManager()

        # Step 1: Test language detection
        text_samples = [
            "Hello, how are you?",  # English
            "Bonjour, comment allez-vous?",  # French
            "Hola, ¿cómo estás?",  # Spanish
            "你好，你好吗？"  # Chinese
        ]

        for text in text_samples:
            detection = await translation_manager.detect_language(text)
            assert detection['success'] is True
            assert 'detected_language' in detection['data']
            assert 'confidence' in detection['data']

        # Step 2: Test translation capabilities
        english_to_spanish = await translation_manager.translate_text(
            text="What is machine learning?",
            source_language="en",
            target_language="es"
        )
        assert english_to_spanish['success'] is True
        assert 'translated_text' in english_to_spanish['data']
        assert 'aprendizaje automático' in english_to_spanish['data']['translated_text'].lower()

        # Step 3: Test multilingual response generation
        multilingual_response = await ai_service.generate_multilingual_response(
            prompt="Explain variables in programming",
            target_language="es",
            source_language="auto-detect"
        )
        assert multilingual_response['success'] is True
        assert multilingual_response['metadata']['response_language'] == "es"
        assert 'variables' in multilingual_response['response'].lower() or 'variables' in multilingual_response['response']

        # Step 4: Test code-switching handling (mixed languages)
        mixed_language_prompt = "Hola, can you explain what is Python programming?"
        mixed_response = await ai_service.handle_code_switching(
            prompt=mixed_language_prompt,
            preferred_language="en",
            detect_primary_language=True
        )
        assert mixed_response['success'] is True
        assert mixed_response['metadata']['detected_languages']  # Should detect both English and Spanish
        assert 'python' in mixed_response['response'].lower()

        # Step 5: Test cultural adaptation
        cultural_adaptation = await ai_service.generate_culturally_adapted_response(
            prompt="Explain programming concepts using local examples",
            target_culture="jp",  # Japanese
            topic="programming_basics"
        )
        assert cultural_adaptation['success'] is True
        assert cultural_adaptation['metadata']['cultural_adaptation_applied'] is True

    @pytest.mark.integration
    @pytest.mark.ai
    async def test_ai_streaming_response_workflow(self):
        """Test AI streaming response capabilities."""
        from src.ai.service import AIService
        from src.ai.stream_manager import StreamManager

        ai_service = AIService()
        stream_manager = StreamManager()

        # Step 1: Generate streaming response
        stream_id = await ai_service.start_streaming_response(
            prompt="Write a detailed explanation of object-oriented programming concepts",
            stream_options={
                "chunk_size": 100,
                "delay_between_chunks": 0.1,
                "include_thinking": True
            }
        )
        assert stream_id is not None

        # Step 2: Collect streaming chunks
        chunks = []
        async for chunk in stream_manager.get_stream_chunks(stream_id):
            chunks.append(chunk)
            if chunk.get('is_final', False):
                break

        assert len(chunks) > 0
        assert any(chunk.get('is_thinking', False) for chunk in chunks)  # Should include thinking process
        assert any(chunk.get('is_final', False) for chunk in chunks)  # Should have final chunk

        # Step 3: Reconstruct full response
        full_response = stream_manager.reconstruct_response(chunks)
        assert 'object-oriented' in full_response.lower()
        assert 'programming' in full_response.lower()

        # Step 4: Test streaming with interruption
        interrupt_stream_id = await ai_service.start_streaming_response(
            prompt="Explain quantum computing in detail",
            stream_options={"chunk_size": 50, "allow_interruption": True}
        )

        # Collect some chunks then interrupt
        collected_chunks = []
        chunk_count = 0
        async for chunk in stream_manager.get_stream_chunks(interrupt_stream_id):
            collected_chunks.append(chunk)
            chunk_count += 1
            if chunk_count >= 3:  # Interrupt after 3 chunks
                interrupt_result = await stream_manager.interrupt_stream(interrupt_stream_id)
                assert interrupt_result['success'] is True
                break

        # Step 5: Test streaming with follow-up questions
        followup_stream_id = await ai_service.start_streaming_response_with_followup(
            prompt="Explain recursion",
            allow_followup=True,
            followup_triggers["question", "clarification", "example"]
        )

        followup_chunks = []
        async for chunk in stream_manager.get_stream_chunks(followup_stream_id):
            followup_chunks.append(chunk)
            if chunk.get('followup_prompted', False):
                # Simulate user asking follow-up
                followup_response = await ai_service.stream_followup_response(
                    stream_id=followup_stream_id,
                    followup_question="Can you give me a simple example?"
                )
                assert followup_response['success'] is True
                break

        assert len(followup_chunks) > 0
        assert any(chunk.get('followup_prompted', False) for chunk in followup_chunks)

        # Step 6: Get streaming analytics
        streaming_analytics = await stream_manager.get_stream_analytics(stream_id)
        assert streaming_analytics['success'] is True
        analytics = streaming_analytics['data']

        assert 'total_chunks' in analytics
        assert 'total_time' in analytics
        assert 'average_chunk_time' in analytics
        assert 'user_interruptions' in analytics