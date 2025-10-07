"""
Enhanced token usage analytics
"""

from datetime import datetime, timedelta
from typing import Any, Dict, List

from src.data.database_manager import DatabaseManager
from src.utils.db_utils import execute_query


class TokenUsageAnalytics:
    def __init__(self, db_manager: DatabaseManager):
        self.db_manager = db_manager

    def get_detailed_usage_summary(self, user_id: str, period_days: int = 30) -> Dict[str, Any]:
        """Get detailed token usage summary for the specified period"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=period_days)

        start_str = start_date.isoformat()
        end_str = end_date.isoformat()

        # Get detailed token usage from the database
        detailed_usage = self._get_detailed_usage_from_db(user_id, start_str, end_str)

        # Calculate summary statistics
        summary = self._calculate_summary_statistics(detailed_usage)

        return {"period": {"start": start_str, "end": end_str}, "summary": summary, "detailed_usage": detailed_usage}

    def _get_detailed_usage_from_db(self, user_id: str, start_date: str, end_date: str) -> List[Dict[str, Any]]:
        """Retrieve detailed token usage records from the database"""
        # This would be implemented with actual database queries
        # For now, we'll simulate the data
        query = """
            SELECT model_name, provider, input_tokens, output_tokens, total_tokens, timestamp, context
            FROM token_usage
            WHERE user_id = ? AND timestamp BETWEEN ? AND ?
            ORDER BY timestamp DESC
        """

        results = execute_query(self.db_manager.db_path, query, (user_id, start_date, end_date), fetch_all=True)

        return results or []

    def _calculate_summary_statistics(self, usage_records: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate summary statistics from usage records"""
        if not usage_records:
            return {
                "total_input_tokens": 0,
                "total_output_tokens": 0,
                "total_tokens": 0,
                "unique_models": [],
                "unique_providers": [],
                "records_count": 0,
                "average_tokens_per_request": 0,
                "cost_estimate": 0.0,
            }

        total_input = sum(record["input_tokens"] for record in usage_records)
        total_output = sum(record["output_tokens"] for record in usage_records)
        total_tokens = sum(record["total_tokens"] for record in usage_records)

        unique_models = list(set(record["model_name"] for record in usage_records))
        unique_providers = list(set(record["provider"] for record in usage_records))

        avg_tokens_per_request = total_tokens / len(usage_records) if usage_records else 0

        # Calculate cost estimate (using example rates)
        cost_estimate = self._calculate_cost_estimate(usage_records)

        return {
            "total_input_tokens": total_input,
            "total_output_tokens": total_output,
            "total_tokens": total_tokens,
            "unique_models": unique_models,
            "unique_providers": unique_providers,
            "records_count": len(usage_records),
            "average_tokens_per_request": round(avg_tokens_per_request, 2),
            "cost_estimate": cost_estimate,
        }

    def _calculate_cost_estimate(self, usage_records: List[Dict[str, Any]]) -> float:
        """Calculate cost estimate based on token usage and provider rates"""
        # Example rates (these would come from provider APIs in a real implementation)
        provider_rates = {
            "deepseek": {"input": 0.001, "output": 0.002},  # per 1K tokens
            "siliconflow": {"input": 0.005, "output": 0.015},  # per 1K tokens
            "chatglm": {"input": 0.008, "output": 0.024},  # per 1K tokens
            "openai-compatible": {"input": 0.0, "output": 0.0},  # free for openai-compatible models
        }

        total_cost = 0.0
        for record in usage_records:
            provider = record["provider"]
            if provider in provider_rates:
                rates = provider_rates[provider]
                input_cost = (record["input_tokens"] / 1000) * rates["input"]
                output_cost = (record["output_tokens"] / 1000) * rates["output"]
                total_cost += input_cost + output_cost

        return round(total_cost, 4)

    def get_provider_comparison(self, user_id: str, period_days: int = 30) -> Dict[str, Any]:
        """Compare token usage across different providers"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=period_days)

        start_str = start_date.isoformat()
        end_str = end_date.isoformat()

        query = """
            SELECT provider,
                   SUM(input_tokens) as total_input,
                   SUM(output_tokens) as total_output,
                   SUM(total_tokens) as total,
                   COUNT(*) as request_count
            FROM token_usage
            WHERE user_id = ? AND timestamp BETWEEN ? AND ?
            GROUP BY provider
        """

        results = execute_query(self.db_manager.db_path, query, (user_id, start_str, end_str), fetch_all=True)

        provider_comparison = {}
        for row in results or []:
            provider_comparison[row["provider"]] = {
                "input_tokens": row["total_input"],
                "output_tokens": row["total_output"],
                "total_tokens": row["total"],
                "request_count": row["request_count"],
            }

        return provider_comparison

    def get_model_comparison(self, user_id: str, period_days: int = 30) -> Dict[str, Any]:
        """Compare token usage across different models"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=period_days)

        start_str = start_date.isoformat()
        end_str = end_date.isoformat()

        query = """
            SELECT model_name,
                   SUM(input_tokens) as total_input,
                   SUM(output_tokens) as total_output,
                   SUM(total_tokens) as total,
                   COUNT(*) as request_count
            FROM token_usage
            WHERE user_id = ? AND timestamp BETWEEN ? AND ?
            GROUP BY model_name
            ORDER BY total DESC
        """

        results = execute_query(self.db_manager.db_path, query, (user_id, start_str, end_str), fetch_all=True)

        model_comparison = {}
        for row in results or []:
            model_comparison[row["model_name"]] = {
                "input_tokens": row["total_input"],
                "output_tokens": row["total_output"],
                "total_tokens": row["total"],
                "request_count": row["request_count"],
            }

        return model_comparison

    def get_context_based_analysis(self, user_id: str, period_days: int = 30) -> Dict[str, Any]:
        """Analyze token usage based on context (what the tokens were used for)"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=period_days)

        start_str = start_date.isoformat()
        end_str = end_date.isoformat()

        query = """
            SELECT context,
                   SUM(input_tokens) as total_input,
                   SUM(output_tokens) as total_output,
                   SUM(total_tokens) as total,
                   COUNT(*) as usage_count
            FROM token_usage
            WHERE user_id = ? AND timestamp BETWEEN ? AND ?
            GROUP BY context
        """

        results = execute_query(self.db_manager.db_path, query, (user_id, start_str, end_str), fetch_all=True)

        context_analysis = {}
        for row in results or []:
            context_analysis[row["context"]] = {
                "input_tokens": row["total_input"],
                "output_tokens": row["total_output"],
                "total_tokens": row["total"],
                "usage_count": row["usage_count"],
            }

        return context_analysis

    def generate_cost_optimization_suggestions(self, user_id: str, period_days: int = 30) -> List[str]:
        """Generate cost optimization suggestions based on usage patterns"""
        suggestions = []

        # Get provider comparison to identify expensive providers
        provider_comparison = self.get_provider_comparison(user_id, period_days)
        most_expensive_provider = (
            max(provider_comparison.items(), key=lambda x: x[1]["total_tokens"])
            if provider_comparison
            else (None, {"total_tokens": 0})
        )

        if most_expensive_provider[1]["total_tokens"] > 10000:  # If more than 10K tokens used
            suggestions.append(
                f"You're using a lot of tokens with {most_expensive_provider[0]}. "
                "Consider reviewing if you can reduce the input token size or use more cost-effective models."
            )

        # Get context analysis to identify high-usage contexts
        context_analysis = self.get_context_based_analysis(user_id, period_days)
        if "explanation" in context_analysis and context_analysis["explanation"]["total_tokens"] > 20000:
            suggestions.append(
                "You're using many tokens for explanations. Consider summarizing content "
                "or using more targeted queries to reduce token usage."
            )

        if "challenge" in context_analysis and context_analysis["challenge"]["total_tokens"] > 15000:
            suggestions.append(
                "You're using many tokens for challenges. Consider using simpler challenge "
                "formats or reusable challenge templates."
            )

        return suggestions
