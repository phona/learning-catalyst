"""
TDD tests for TokenUsage data model.

Following Test-Driven Development methodology, these tests define the expected behavior
of the TokenUsage entity before implementation. Tests cover token tracking, cost calculation,
and usage analytics based on the API documentation.
"""

import pytest
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, Any, List
from tests.test_helpers import (
    assert_valid_uuid,
    generate_mock_token_usage,
    assert_raises_specific_error
)


class TestTokenUsageModel:
    """Test cases for TokenUsage data model following TDD principles."""

    @pytest.mark.unit
    def test_token_usage_creation_with_valid_data(self, mock_token_usage_data):
        """Test that token usage can be created with valid data (TDD: Red phase)."""
        # This test will initially fail until TokenUsage model is implemented
        from src.data.models.token_usage import TokenUsage

        token_usage = TokenUsage(**mock_token_usage_data)

        # Validate token usage structure
        assert token_usage.id == mock_token_usage_data["id"]
        assert token_usage.provider == mock_token_usage_data["provider"]
        assert token_usage.model == mock_token_usage_data["model"]
        assert token_usage.total_tokens == mock_token_usage_data["total_tokens"]

    @pytest.mark.unit
    def test_token_usage_validation_required_fields(self):
        """Test that token usage validation enforces required fields."""
        from src.data.models.token_usage import TokenUsage

        # Test missing required fields
        with pytest.raises(ValueError, match="Missing required field: id"):
            TokenUsage(
                provider="openai",
                model="gpt-4o-mini",
                input_tokens=100,
                output_tokens=50,
                total_tokens=150
            )

        with pytest.raises(ValueError, match="Missing required field: provider"):
            TokenUsage(
                id="test",
                model="gpt-4o-mini",
                input_tokens=100,
                output_tokens=50,
                total_tokens=150
            )

        with pytest.raises(ValueError, match="Missing required field: model"):
            TokenUsage(
                id="test",
                provider="openai",
                input_tokens=100,
                output_tokens=50,
                total_tokens=150
            )

    @pytest.mark.unit
    def test_token_usage_token_validation(self):
        """Test that token counts are properly validated."""
        from src.data.models.token_usage import TokenUsage

        # Test negative token counts
        with pytest.raises(ValueError, match="Token counts must be non-negative"):
            TokenUsage(
                id="test",
                provider="openai",
                model="gpt-4o-mini",
                input_tokens=-10,
                output_tokens=50,
                total_tokens=40
            )

        with pytest.raises(ValueError, match="Token counts must be non-negative"):
            TokenUsage(
                id="test",
                provider="openai",
                model="gpt-4o-mini",
                input_tokens=100,
                output_tokens=-5,
                total_tokens=95
            )

        # Test token count consistency
        with pytest.raises(ValueError, match="Total tokens must equal input + output tokens"):
            TokenUsage(
                id="test",
                provider="openai",
                model="gpt-4o-mini",
                input_tokens=100,
                output_tokens=50,
                total_tokens=200  # Should be 150
            )

    @pytest.mark.unit
    def test_token_usage_auto_calculation(self):
        """Test that total tokens are automatically calculated when not provided."""
        from src.data.models.token_usage import TokenUsage

        token_usage = TokenUsage(
            id="test",
            provider="openai",
            model="gpt-4o-mini",
            input_tokens=100,
            output_tokens=50,
            # total_tokens not provided - should be calculated
            timestamp=datetime.now().isoformat(),
            context_type="test",
            session_id="test_session"
        )

        assert token_usage.total_tokens == 150

    @pytest.mark.unit
    def test_token_usage_cost_calculation(self):
        """Test that token usage cost is calculated correctly."""
        from src.data.models.token_usage import TokenUsage

        # Test known pricing
        token_usage = TokenUsage(
            id="test",
            provider="openai",
            model="gpt-4o-mini",
            input_tokens=1000,  # 1K input tokens
            output_tokens=500,   # 0.5K output tokens
            timestamp=datetime.now().isoformat(),
            context_type="test",
            session_id="test_session"
        )

        # GPT-4o-mini pricing: $0.15/1M input, $0.6/1M output
        # Expected cost: (1000/1000000)*0.15 + (500/1000000)*0.6 = 0.00015 + 0.0003 = 0.00045
        expected_cost = Decimal("0.00045")
        assert token_usage.cost_estimate == expected_cost

    @pytest.mark.unit
    def test_token_usage_custom_pricing(self):
        """Test that custom pricing can be applied."""
        from src.data.models.token_usage import TokenUsage

        token_usage = TokenUsage(
            id="test",
            provider="custom",
            model="custom-model",
            input_tokens=1000,
            output_tokens=500,
            timestamp=datetime.now().isoformat(),
            context_type="test",
            session_id="test_session",
            pricing={
                "input_cost_per_1m": Decimal("0.1"),
                "output_cost_per_1m": Decimal("0.2")
            }
        )

        # Custom pricing: $0.1/1M input, $0.2/1M output
        expected_cost = Decimal("0.0001") + Decimal("0.0001")  # 0.0002
        assert token_usage.cost_estimate == expected_cost

    @pytest.mark.unit
    def test_token_usage_context_types(self):
        """Test that context types are validated."""
        from src.data.models.token_usage import TokenUsage

        valid_contexts = ["explanation", "learning", "chat", "assessment", "tool_call"]

        for context in valid_contexts:
            token_usage = TokenUsage(
                id=f"test_{context}",
                provider="openai",
                model="gpt-4o-mini",
                input_tokens=100,
                output_tokens=50,
                timestamp=datetime.now().isoformat(),
                context_type=context,
                session_id="test_session"
            )
            assert token_usage.context_type == context

        # Test invalid context type
        with pytest.raises(ValueError, match="Invalid context type"):
            TokenUsage(
                id="test",
                provider="openai",
                model="gpt-4o-mini",
                input_tokens=100,
                output_tokens=50,
                timestamp=datetime.now().isoformat(),
                context_type="invalid_context",
                session_id="test_session"
            )

    @pytest.mark.unit
    def test_token_usage_aggregation(self):
        """Test that token usage can be aggregated by various criteria."""
        from src.data.models.token_usage import TokenUsage

        # Create multiple token usage records
        usages = [
            TokenUsage(
                id="1",
                provider="openai",
                model="gpt-4o-mini",
                input_tokens=100,
                output_tokens=50,
                timestamp=datetime.now().isoformat(),
                context_type="explanation",
                session_id="session_1"
            ),
            TokenUsage(
                id="2",
                provider="openai",
                model="gpt-4o-mini",
                input_tokens=200,
                output_tokens=100,
                timestamp=datetime.now().isoformat(),
                context_type="learning",
                session_id="session_1"
            ),
            TokenUsage(
                id="3",
                provider="deepseek",
                model="deepseek-chat",
                input_tokens=150,
                output_tokens=75,
                timestamp=datetime.now().isoformat(),
                context_type="explanation",
                session_id="session_2"
            ),
        ]

        # Test aggregation by provider
        provider_stats = TokenUsage.aggregate_by_provider(usages)
        assert provider_stats["openai"]["total_tokens"] == 450  # (100+50) + (200+100)
        assert provider_stats["openai"]["total_cost"] == Decimal("0.000225")  # 450 tokens at $0.5/1M
        assert provider_stats["deepseek"]["total_tokens"] == 225  # (150+75)

        # Test aggregation by context type
        context_stats = TokenUsage.aggregate_by_context(usages)
        assert context_stats["explanation"]["total_tokens"] == 375  # (100+50) + (150+75)
        assert context_stats["learning"]["total_tokens"] == 300   # (200+100)

        # Test aggregation by session
        session_stats = TokenUsage.aggregate_by_session(usages)
        assert session_stats["session_1"]["total_tokens"] == 450
        assert session_stats["session_2"]["total_tokens"] == 225

    @pytest.mark.unit
    def test_token_usage_time_period_filtering(self):
        """Test that token usage can be filtered by time periods."""
        from src.data.models.token_usage import TokenUsage

        now = datetime.now()
        yesterday = now - timedelta(days=1)
        last_week = now - timedelta(days=7)

        # Create token usage records across different times
        usages = [
            TokenUsage(
                id="old",
                provider="openai",
                model="gpt-4o-mini",
                input_tokens=100,
                output_tokens=50,
                timestamp=last_week.isoformat(),
                context_type="explanation",
                session_id="session_1"
            ),
            TokenUsage(
                id="recent",
                provider="openai",
                model="gpt-4o-mini",
                input_tokens=200,
                output_tokens=100,
                timestamp=yesterday.isoformat(),
                context_type="learning",
                session_id="session_1"
            ),
            TokenUsage(
                id="current",
                provider="openai",
                model="gpt-4o-mini",
                input_tokens=150,
                output_tokens=75,
                timestamp=now.isoformat(),
                context_type="explanation",
                session_id="session_2"
            ),
        ]

        # Test filtering by different time periods
        daily_usage = TokenUsage.filter_by_period(usages, "day")
        assert len(daily_usage) == 2  # recent + current

        weekly_usage = TokenUsage.filter_by_period(usages, "week")
        assert len(weekly_usage) == 3  # all records

        # Test custom date range
        custom_start = (now - timedelta(hours=12)).isoformat()
        custom_usage = TokenUsage.filter_by_period(usages, "custom", custom_start, now.isoformat())
        assert len(custom_usage) == 1  # only current

    @pytest.mark.unit
    def test_token_usage_budget_tracking(self):
        """Test that token usage can track against budgets."""
        from src.data.models.token_usage import TokenUsage

        # Set daily budget
        daily_budget = Decimal("1.00")  # $1.00 per day

        # Add token usage within budget
        usage1 = TokenUsage(
            id="1",
            provider="openai",
            model="gpt-4o-mini",
            input_tokens=1000,
            output_tokens=500,
            timestamp=datetime.now().isoformat(),
            context_type="explanation",
            session_id="session_1"
        )

        budget_status = TokenUsage.check_budget_status([usage1], daily_budget, "day")
        assert budget_status["within_budget"] is True
        assert budget_status["remaining_budget"] > 0

        # Add more usage that exceeds budget
        usage2 = TokenUsage(
            id="2",
            provider="openai",
            model="gpt-4o-mini",
            input_tokens=2000000,  # 2M input tokens = $0.30
            output_tokens=1000000,  # 1M output tokens = $0.60
            timestamp=datetime.now().isoformat(),
            context_type="learning",
            session_id="session_1"
        )

        budget_status = TokenUsage.check_budget_status([usage1, usage2], daily_budget, "day")
        assert budget_status["within_budget"] is False
        assert budget_status["remaining_budget"] < 0

    @pytest.mark.unit
    def test_token_usage_efficiency_metrics(self):
        """Test that token usage efficiency can be calculated."""
        from src.data.models.token_usage import TokenUsage

        # Create usage data for different contexts
        usages = [
            TokenUsage(
                id="1",
                provider="openai",
                model="gpt-4o-mini",
                input_tokens=100,
                output_tokens=200,  # High output/input ratio = verbose
                timestamp=datetime.now().isoformat(),
                context_type="explanation",
                session_id="session_1"
            ),
            TokenUsage(
                id="2",
                provider="openai",
                model="gpt-4o-mini",
                input_tokens=100,
                output_tokens=50,   # Low output/input ratio = concise
                timestamp=datetime.now().isoformat(),
                context_type="chat",
                session_id="session_1"
            ),
        ]

        efficiency = TokenUsage.calculate_efficiency_metrics(usages)

        # Overall efficiency (output/input ratio)
        assert efficiency["overall_efficiency"] == Decimal("125")  # 250 total output / 200 total input

        # Context-specific efficiency
        assert efficiency["by_context"]["explanation"]["efficiency"] == Decimal("200")  # 200/100
        assert efficiency["by_context"]["chat"]["efficiency"] == Decimal("50")        # 50/100

    @pytest.mark.unit
    def test_token_usage_export_formats(self):
        """Test that token usage can be exported in different formats."""
        from src.data.models.token_usage import TokenUsage
        import json
        import csv
        from io import StringIO

        token_usage = TokenUsage(
            id="test",
            provider="openai",
            model="gpt-4o-mini",
            input_tokens=100,
            output_tokens=50,
            timestamp=datetime.now().isoformat(),
            context_type="explanation",
            session_id="test_session"
        )

        # Test JSON export
        json_export = token_usage.to_json()
        parsed_data = json.loads(json_export)
        assert parsed_data["id"] == "test"
        assert parsed_data["total_tokens"] == 150

        # Test CSV export
        csv_export = token_usage.to_csv()
        csv_reader = csv.reader(StringIO(csv_export))
        rows = list(csv_reader)
        assert len(rows) == 2  # Header + data
        assert rows[0][0] == "id"  # Header
        assert rows[1][0] == "test"  # Data

    @pytest.mark.unit
    def test_token_usage_model_pricing_updates(self):
        """Test that model pricing can be updated dynamically."""
        from src.data.models.token_usage import TokenUsage

        # Create token usage with default pricing
        token_usage = TokenUsage(
            id="test",
            provider="openai",
            model="gpt-4o-mini",
            input_tokens=1000,
            output_tokens=500,
            timestamp=datetime.now().isoformat(),
            context_type="explanation",
            session_id="test_session"
        )

        original_cost = token_usage.cost_estimate

        # Update pricing
        new_pricing = {
            "input_cost_per_1m": Decimal("0.2"),  # Double the price
            "output_cost_per_1m": Decimal("1.2")  # Double the price
        }
        token_usage.update_pricing(new_pricing)

        # Cost should be updated
        assert token_usage.cost_estimate == original_cost * 2

    @pytest.mark.unit
    def test_token_usage_concurrent_session_tracking(self):
        """Test that token usage can track concurrent sessions."""
        from src.data.models.token_usage import TokenUsage

        # Create token usage for multiple concurrent sessions
        usages = [
            TokenUsage(
                id="1",
                provider="openai",
                model="gpt-4o-mini",
                input_tokens=100,
                output_tokens=50,
                timestamp=datetime.now().isoformat(),
                context_type="explanation",
                session_id="session_1"
            ),
            TokenUsage(
                id="2",
                provider="openai",
                model="gpt-4o-mini",
                input_tokens=200,
                output_tokens=100,
                timestamp=datetime.now().isoformat(),
                context_type="learning",
                session_id="session_2"
            ),
            TokenUsage(
                id="3",
                provider="openai",
                model="gpt-4o-mini",
                input_tokens=150,
                output_tokens=75,
                timestamp=datetime.now().isoformat(),
                context_type="chat",
                session_id="session_1"
            ),
        ]

        # Analyze concurrent usage
        concurrent_analysis = TokenUsage.analyze_concurrent_usage(usages)

        assert concurrent_analysis["total_concurrent_sessions"] == 2
        assert concurrent_analysis["tokens_per_session"]["session_1"] == 375  # (100+50) + (150+75)
        assert concurrent_analysis["tokens_per_session"]["session_2"] == 300  # (200+100)

    @pytest.mark.unit
    def test_token_usage_anomaly_detection(self):
        """Test that token usage can detect anomalies."""
        from src.data.models.token_usage import TokenUsage

        # Create normal usage pattern
        normal_usages = [
            TokenUsage(
                id=f"normal_{i}",
                provider="openai",
                model="gpt-4o-mini",
                input_tokens=100 + (i * 10),
                output_tokens=50 + (i * 5),
                timestamp=(datetime.now() - timedelta(hours=i)).isoformat(),
                context_type="explanation",
                session_id="session_1"
            )
            for i in range(10)
        ]

        # Add anomalous usage (sudden spike)
        anomalous_usage = TokenUsage(
            id="anomaly",
            provider="openai",
            model="gpt-4o-mini",
            input_tokens=10000,  # Much higher than normal
            output_tokens=5000,
            timestamp=datetime.now().isoformat(),
            context_type="explanation",
            session_id="session_1"
        )

        all_usages = normal_usages + [anomalous_usage]

        # Detect anomalies
        anomalies = TokenUsage.detect_anomalies(all_usages)
        assert len(anomalies) == 1
        assert anomalies[0]["id"] == "anomaly"
        assert "token_spike" in anomalies[0]["anomaly_type"]

    @pytest.mark.unit
    def test_token_usage_compression_optimization(self):
        """Test that token usage data can be compressed for storage."""
        from src.data.models.token_usage import TokenUsage

        # Create many token usage records
        usages = [
            TokenUsage(
                id=f"usage_{i}",
                provider="openai",
                model="gpt-4o-mini",
                input_tokens=100,
                output_tokens=50,
                timestamp=datetime.now().isoformat(),
                context_type="explanation",
                session_id="session_1"
            )
            for i in range(100)
        ]

        # Compress data
        compressed_data = TokenUsage.compress_usage_data(usages)
        assert len(compressed_data) < len(usages)  # Should be smaller

        # Decompress and verify integrity
        decompressed_usages = TokenUsage.decompress_usage_data(compressed_data)
        assert len(decompressed_usages) == len(usages)

        for original, decompressed in zip(usages, decompressed_usages):
            assert original.id == decompressed.id
            assert original.total_tokens == decompressed.total_tokens