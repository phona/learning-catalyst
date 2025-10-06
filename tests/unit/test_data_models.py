"""
Unit tests for data models
"""
import pytest
from src.data.models.concept import Concept
from src.data.models.user_profile import UserProfile
from src.data.models.challenge import Challenge
from src.data.models.token_usage import TokenUsage
from src.data.models.extended_models import (
    KnowledgeMap, UserProgress, Evaluation, Context,
    UserAnswer, ChallengeResult, ApplicationState, Checkpoint,
    Message, AIResponse, Credentials, EmbeddingResponse,
    RerankResponse, ProviderCapabilities, ModelInfo,
    TokenUsageSummary, TimePeriod, ProgressReport,
    TrendData, AnalyticsExport, InteractionHistory,
    AnalysisResult, CompetencyProfile, Recommendations
)


class TestConcept:
    def test_concept_creation(self):
        concept = Concept(
            id="test_id",
            title="Test Title",
            content="Test Content",
            prerequisites=["prereq1", "prereq2"],
            difficulty_level=5
        )

        assert concept.id == "test_id"
        assert concept.title == "Test Title"
        assert concept.content == "Test Content"
        assert concept.prerequisites == ["prereq1", "prereq2"]
        assert concept.difficulty_level == 5


class TestUserProfile:
    def test_user_profile_creation(self):
        user_profile = UserProfile(
            id="user_001",
            created_at="2023-01-01T00:00:00",
            preferences={"ui": {"theme": "dark"}},
            competency_profile={"math": 0.8, "science": 0.6},
            ai_config={"default_provider": "openai", "default_model": "gpt-4"},
            current_checkpoint_id="chk_123"
        )

        assert user_profile.id == "user_001"
        assert user_profile.created_at == "2023-01-01T00:00:00"
        assert user_profile.preferences == {"ui": {"theme": "dark"}}
        assert user_profile.competency_profile == {"math": 0.8, "science": 0.6}
        assert user_profile.ai_config == {"default_provider": "openai", "default_model": "gpt-4"}
        assert user_profile.current_checkpoint_id == "chk_123"


class TestChallenge:
    def test_challenge_creation(self):
        challenge = Challenge(
            id="challenge_001",
            concept_id="concept_001",
            challenge_type="multiple_choice",
            challenge_text="What is 2+2?",
            expected_answer="4",
            options={"A": "3", "B": "4", "C": "5"}
        )

        assert challenge.id == "challenge_001"
        assert challenge.concept_id == "concept_001"
        assert challenge.challenge_type == "multiple_choice"
        assert challenge.challenge_text == "What is 2+2?"
        assert challenge.expected_answer == "4"
        assert challenge.options == {"A": "3", "B": "4", "C": "5"}


class TestTokenUsage:
    def test_token_usage_creation(self):
        token_usage = TokenUsage(
            id="token_001",
            model_name="gpt-4",
            provider="openai",
            input_tokens=100,
            output_tokens=200,
            total_tokens=300,
            timestamp="2023-01-01T00:00:00",
            user_id="user_001",
            context="explanation"
        )

        assert token_usage.id == "token_001"
        assert token_usage.model_name == "gpt-4"
        assert token_usage.provider == "openai"
        assert token_usage.input_tokens == 100
        assert token_usage.output_tokens == 200
        assert token_usage.total_tokens == 300
        assert token_usage.timestamp == "2023-01-01T00:00:00"
        assert token_usage.user_id == "user_001"
        assert token_usage.context == "explanation"


class TestExtendedModels:
    def test_knowledge_map_creation(self):
        km = KnowledgeMap(
            concepts=[{"id": "c1", "title": "Concept 1"}],
            relationships=[{"source": "c1", "target": "c2"}]
        )
        assert len(km.concepts) == 1
        assert len(km.relationships) == 1

    def test_user_progress_creation(self):
        up = UserProgress(
            concept_id="c1",
            completed=True,
            score=0.85
        )
        assert up.concept_id == "c1"
        assert up.completed is True
        assert up.score == 0.85

    def test_evaluation_creation(self):
        eval = Evaluation(
            correctness=True,
            feedback="Great job!",
            score=0.9
        )
        assert eval.correctness is True
        assert eval.feedback == "Great job!"
        assert eval.score == 0.9

    def test_context_creation(self):
        ctx = Context(
            user_profile={"id": "user1"},
            current_concept="concept1",
            learning_history=[{"id": "c1", "score": 0.9}],
            preferences={"difficulty": 5}
        )
        assert ctx.user_profile == {"id": "user1"}
        assert ctx.current_concept == "concept1"
        assert len(ctx.learning_history) == 1
        assert ctx.preferences == {"difficulty": 5}

    def test_user_answer_creation(self):
        ua = UserAnswer(
            challenge_id="ch1",
            answer_text="42",
            timestamp="2023-01-01T00:00:00"
        )
        assert ua.challenge_id == "ch1"
        assert ua.answer_text == "42"
        assert ua.timestamp == "2023-01-01T00:00:00"

    def test_challenge_result_creation(self):
        cr = ChallengeResult(
            challenge_id="ch1",
            user_answer="42",
            evaluation=Evaluation(correctness=True, feedback="Good", score=0.9),
            timestamp="2023-01-01T00:00:00"
        )
        assert cr.challenge_id == "ch1"
        assert cr.user_answer == "42"
        assert cr.evaluation.correctness is True
        assert cr.evaluation.feedback == "Good"
        assert cr.evaluation.score == 0.9
        assert cr.timestamp == "2023-01-01T00:00:00"

    def test_application_state_creation(self):
        as_ = ApplicationState(
            current_concept="c1",
            user_progress=[UserProgress(concept_id="c1", completed=True, score=0.9)],
            checkpoint_id="chk1",
            context=Context(
                user_profile={"id": "user1"},
                current_concept="c1",
                learning_history=[],
                preferences={}
            )
        )
        assert as_.current_concept == "c1"
        assert as_.checkpoint_id == "chk1"
        assert len(as_.user_progress) == 1

    def test_checkpoint_creation(self):
        cp = Checkpoint(
            id="chk1",
            user_id="user1",
            state_data={"key": "value"},
            created_at="2023-01-01T00:00:00",
            description="Test checkpoint"
        )
        assert cp.id == "chk1"
        assert cp.user_id == "user1"
        assert cp.state_data == {"key": "value"}
        assert cp.created_at == "2023-01-01T00:00:00"
        assert cp.description == "Test checkpoint"

    def test_message_creation(self):
        msg = Message(role="user", content="Hello")
        assert msg.role == "user"
        assert msg.content == "Hello"

    def test_ai_response_creation(self):
        ar = AIResponse(
            content="Response",
            model="gpt-4",
            usage={"input_tokens": 10, "output_tokens": 20, "total_tokens": 30},
            timestamp="2023-01-01T00:00:00"
        )
        assert ar.content == "Response"
        assert ar.model == "gpt-4"
        assert ar.usage == {"input_tokens": 10, "output_tokens": 20, "total_tokens": 30}
        assert ar.timestamp == "2023-01-01T00:00:00"

    def test_credentials_creation(self):
        creds = Credentials(
            provider="openai",
            api_key="test_key",
            base_url="https://api.openai.com/v1",
            additional_config={"organization": "test_org"}
        )
        assert creds.provider == "openai"
        assert creds.api_key == "test_key"
        assert creds.base_url == "https://api.openai.com/v1"
        assert creds.additional_config == {"organization": "test_org"}

    def test_embedding_response_creation(self):
        er = EmbeddingResponse(
            embeddings=[[0.1, 0.2, 0.3]],
            model="text-embedding-ada-002",
            usage={"input_tokens": 100}
        )
        assert er.embeddings == [[0.1, 0.2, 0.3]]
        assert er.model == "text-embedding-ada-002"
        assert er.usage == {"input_tokens": 100}

    def test_rerank_response_creation(self):
        rr = RerankResponse(
            results=[{"document": "doc1", "relevance_score": 0.9}],
            model="rerank-model"
        )
        assert rr.results == [{"document": "doc1", "relevance_score": 0.9}]
        assert rr.model == "rerank-model"

    def test_provider_capabilities_creation(self):
        pc = ProviderCapabilities(
            supports_streaming=True,
            max_tokens=4096,
            supported_models=["gpt-4", "gpt-3.5-turbo"],
            input_cost_per_token=0.01,
            output_cost_per_token=0.03,
            supports_embeddings=True,
            supports_rerank=False
        )
        assert pc.supports_streaming is True
        assert pc.max_tokens == 4096
        assert pc.supported_models == ["gpt-4", "gpt-3.5-turbo"]
        assert pc.input_cost_per_token == 0.01
        assert pc.output_cost_per_token == 0.03
        assert pc.supports_embeddings is True
        assert pc.supports_rerank is False

    def test_model_info_creation(self):
        pc = ProviderCapabilities(
            supports_streaming=True,
            max_tokens=4096,
            supported_models=["gpt-4"],
            input_cost_per_token=0.01,
            output_cost_per_token=0.03,
            supports_embeddings=True,
            supports_rerank=False
        )
        mi = ModelInfo(name="gpt-4", provider="openai", capabilities=pc)
        assert mi.name == "gpt-4"
        assert mi.provider == "openai"
        assert mi.capabilities == pc

    def test_token_usage_summary_creation(self):
        tus = TokenUsageSummary(
            total_input_tokens=1000,
            total_output_tokens=2000,
            total_tokens=3000,
            period_start="2023-01-01",
            period_end="2023-01-31"
        )
        assert tus.total_input_tokens == 1000
        assert tus.total_output_tokens == 2000
        assert tus.total_tokens == 3000
        assert tus.period_start == "2023-01-01"
        assert tus.period_end == "2023-01-31"

    def test_time_period_creation(self):
        tp = TimePeriod(start_date="2023-01-01", end_date="2023-01-31")
        assert tp.start_date == "2023-01-01"
        assert tp.end_date == "2023-01-31"

    def test_progress_report_creation(self):
        tp = TimePeriod(start_date="2023-01-01", end_date="2023-01-31")
        pr = ProgressReport(
            user_id="user1",
            concepts_mastered=5,
            total_concepts=10,
            overall_score=85.5,
            time_period=tp,
            weak_areas=["math", "science"]
        )
        assert pr.user_id == "user1"
        assert pr.concepts_mastered == 5
        assert pr.total_concepts == 10
        assert pr.overall_score == 85.5
        assert pr.time_period == tp
        assert pr.weak_areas == ["math", "science"]

    def test_trend_data_creation(self):
        tp = TimePeriod(start_date="2023-01-01", end_date="2023-01-31")
        td = TrendData(
            metric="accuracy",
            values=[{"date": "2023-01-01", "value": 0.8}],
            period=tp
        )
        assert td.metric == "accuracy"
        assert td.values == [{"date": "2023-01-01", "value": 0.8}]
        assert td.period == tp

    def test_analytics_export_creation(self):
        ae = AnalyticsExport(
            report_type="progress",
            content="test content",
            format="json",
            timestamp="2023-01-01T00:00:00"
        )
        assert ae.report_type == "progress"
        assert ae.content == "test content"
        assert ae.format == "json"
        assert ae.timestamp == "2023-01-01T00:00:00"

    def test_interaction_history_creation(self):
        ih = InteractionHistory(
            user_id="user1",
            interactions=[{"type": "message", "content": "hello"}],
            timestamp="2023-01-01T00:00:00"
        )
        assert ih.user_id == "user1"
        assert ih.interactions == [{"type": "message", "content": "hello"}]
        assert ih.timestamp == "2023-01-01T00:00:00"

    def test_analysis_result_creation(self):
        ar = AnalysisResult(
            metric="accuracy",
            value=0.85,
            interpretation="Good performance",
            timestamp="2023-01-01T00:00:00"
        )
        assert ar.metric == "accuracy"
        assert ar.value == 0.85
        assert ar.interpretation == "Good performance"
        assert ar.timestamp == "2023-01-01T00:00:00"

    def test_competency_profile_creation(self):
        cp = CompetencyProfile(
            user_id="user1",
            skills={"math": 0.8, "science": 0.7},
            learning_style="visual",
            strengths=["math"],
            weaknesses=["writing"],
            last_updated="2023-01-01T00:00:00"
        )
        assert cp.user_id == "user1"
        assert cp.skills == {"math": 0.8, "science": 0.7}
        assert cp.learning_style == "visual"
        assert cp.strengths == ["math"]
        assert cp.weaknesses == ["writing"]
        assert cp.last_updated == "2023-01-01T00:00:00"

    def test_recommendations_creation(self):
        r = Recommendations(
            user_id="user1",
            next_concepts=["concept2", "concept3"],
            learning_path=["concept1", "concept2"],
            resources=["resource1"],
            timestamp="2023-01-01T00:00:00"
        )
        assert r.user_id == "user1"
        assert r.next_concepts == ["concept2", "concept3"]
        assert r.learning_path == ["concept1", "concept2"]
        assert r.resources == ["resource1"]
        assert r.timestamp == "2023-01-01T00:00:00"


if __name__ == "__main__":
    pytest.main([__file__])
