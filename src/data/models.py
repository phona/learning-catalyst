"""
Data models for Learning Catalyst.

Entity definitions based on the API reference documentation.
"""

from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
import uuid


class SessionStatus(Enum):
    """Session status enumeration."""
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class InteractionType(Enum):
    """Interaction type enumeration."""
    USER_INPUT = "user_input"
    AI_RESPONSE = "ai_response"
    SYSTEM_MESSAGE = "system_message"
    COMMAND_EXECUTION = "command_execution"
    ERROR_OCCURRED = "error_occurred"


class ProficiencyLevel(Enum):
    """Proficiency level enumeration."""
    NOVICE = "novice"
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"
    MASTER = "master"


class ConfigSectionType(Enum):
    """Configuration section type enumeration."""
    AI_SETTINGS = "ai_settings"
    LEARNING_PREFERENCES = "learning_preferences"
    PERSONALIZATION_SETTINGS = "personalization_settings"
    PRIVACY_SETTINGS = "privacy_settings"
    PERFORMANCE_SETTINGS = "performance_settings"


@dataclass
class SESSION:
    """Session entity for tracking learning sessions."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    workspace_id: str = ""
    title: str = ""
    status: SessionStatus = SessionStatus.ACTIVE
    started_at: datetime = field(default_factory=datetime.utcnow)
    ended_at: Optional[datetime] = None
    total_duration_minutes: int = 0
    interaction_count: int = 0
    concepts_discussed: List[str] = field(default_factory=list)
    learning_objectives: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'id': self.id,
            'workspace_id': self.workspace_id,
            'title': self.title,
            'status': self.status.value,
            'started_at': self.started_at.isoformat(),
            'ended_at': self.ended_at.isoformat() if self.ended_at else None,
            'total_duration_minutes': self.total_duration_minutes,
            'interaction_count': self.interaction_count,
            'concepts_discussed': self.concepts_discussed,
            'learning_objectives': self.learning_objectives,
            'metadata': self.metadata
        }


@dataclass
class INTERACTION:
    """Interaction entity for tracking user-AI interactions."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str = ""
    sequence_number: int = 0
    interaction_type: InteractionType = InteractionType.USER_INPUT
    content: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.utcnow)
    processing_time_ms: int = 0
    token_usage: Optional[Dict[str, int]] = None
    ai_provider: Optional[str] = None
    ai_model: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'id': self.id,
            'session_id': self.session_id,
            'sequence_number': self.sequence_number,
            'interaction_type': self.interaction_type.value,
            'content': self.content,
            'metadata': self.metadata,
            'timestamp': self.timestamp.isoformat(),
            'processing_time_ms': self.processing_time_ms,
            'token_usage': self.token_usage,
            'ai_provider': self.ai_provider,
            'ai_model': self.ai_model
        }


@dataclass
class CONCEPT:
    """Concept entity for knowledge tracking."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    title: str = ""
    description: str = ""
    domain: str = ""
    difficulty_level: int = 1
    prerequisites: List[str] = field(default_factory=list)
    estimated_time_minutes: int = 60
    tags: List[str] = field(default_factory=list)
    content_references: List[Dict[str, Any]] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'domain': self.domain,
            'difficulty_level': self.difficulty_level,
            'prerequisites': self.prerequisites,
            'estimated_time_minutes': self.estimated_time_minutes,
            'tags': self.tags,
            'content_references': self.content_references,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }


@dataclass
class CONCEPT_RELATIONSHIP:
    """Concept relationship entity."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    source_concept_id: str = ""
    target_concept_id: str = ""
    relationship_type: str = "related_to"
    strength: float = 1.0
    created_at: datetime = field(default_factory=datetime.utcnow)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'id': self.id,
            'source_concept_id': self.source_concept_id,
            'target_concept_id': self.target_concept_id,
            'relationship_type': self.relationship_type,
            'strength': self.strength,
            'created_at': self.created_at.isoformat()
        }


@dataclass
class WORKSPACE_PROFICIENCY:
    """Workspace proficiency entity for tracking user progress."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    workspace_id: str = ""
    concept_id: str = ""
    proficiency_level: ProficiencyLevel = ProficiencyLevel.NOVICE
    practice_count: int = 0
    success_count: int = 0
    last_practiced: Optional[datetime] = None
    improvement_rate: float = 0.0
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

    def get_success_rate(self) -> float:
        """Calculate success rate as percentage."""
        if self.practice_count == 0:
            return 0.0
        return (self.success_count / self.practice_count) * 100.0

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'id': self.id,
            'workspace_id': self.workspace_id,
            'concept_id': self.concept_id,
            'proficiency_level': self.proficiency_level.value,
            'practice_count': self.practice_count,
            'success_count': self.success_count,
            'success_rate': self.get_success_rate(),
            'last_practiced': self.last_practiced.isoformat() if self.last_practiced else None,
            'improvement_rate': self.improvement_rate,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }


@dataclass
class ASSESSMENT:
    """Assessment entity for evaluating knowledge."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    workspace_id: str = ""
    concept_id: str = ""
    title: str = ""
    description: str = ""
    assessment_type: str = "quiz"
    difficulty_level: int = 1
    question_count: int = 0
    time_limit_minutes: int = 0
    passing_score: float = 70.0
    created_at: datetime = field(default_factory=datetime.utcnow)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'id': self.id,
            'workspace_id': self.workspace_id,
            'concept_id': self.concept_id,
            'title': self.title,
            'description': self.description,
            'assessment_type': self.assessment_type,
            'difficulty_level': self.difficulty_level,
            'question_count': self.question_count,
            'time_limit_minutes': self.time_limit_minutes,
            'passing_score': self.passing_score,
            'created_at': self.created_at.isoformat()
        }


@dataclass
class ASSESSMENT_ATTEMPT:
    """Assessment attempt entity."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    assessment_id: str = ""
    workspace_id: str = ""
    score: float = 0.0
    max_score: float = 100.0
    passed: bool = False
    time_taken_minutes: int = 0
    answers: List[Dict[str, Any]] = field(default_factory=list)
    feedback: str = ""
    attempted_at: datetime = field(default_factory=datetime.utcnow)

    def get_percentage_score(self) -> float:
        """Get score as percentage."""
        if self.max_score == 0:
            return 0.0
        return (self.score / self.max_score) * 100.0

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'id': self.id,
            'assessment_id': self.assessment_id,
            'workspace_id': self.workspace_id,
            'score': self.score,
            'max_score': self.max_score,
            'percentage_score': self.get_percentage_score(),
            'passed': self.passed,
            'time_taken_minutes': self.time_taken_minutes,
            'answers': self.answers,
            'feedback': self.feedback,
            'attempted_at': self.attempted_at.isoformat()
        }


@dataclass
class TOKEN_USAGE:
    """Token usage tracking entity."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    interaction_id: str = ""
    workspace_id: str = ""
    provider: str = ""
    model: str = ""
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    cost_usd: float = 0.0
    timestamp: datetime = field(default_factory=datetime.utcnow)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'id': self.id,
            'interaction_id': self.interaction_id,
            'workspace_id': self.workspace_id,
            'provider': self.provider,
            'model': self.model,
            'prompt_tokens': self.prompt_tokens,
            'completion_tokens': self.completion_tokens,
            'total_tokens': self.total_tokens,
            'cost_usd': self.cost_usd,
            'timestamp': self.timestamp.isoformat()
        }


@dataclass
class WORKSPACE_CONFIG:
    """Workspace configuration entity."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    workspace_id: str = ""
    ai_settings: Dict[str, Any] = field(default_factory=dict)
    learning_preferences: Dict[str, Any] = field(default_factory=dict)
    personalization_settings: Dict[str, Any] = field(default_factory=dict)
    privacy_settings: Dict[str, Any] = field(default_factory=dict)
    performance_settings: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'id': self.id,
            'workspace_id': self.workspace_id,
            'ai_settings': self.ai_settings,
            'learning_preferences': self.learning_preferences,
            'personalization_settings': self.personalization_settings,
            'privacy_settings': self.privacy_settings,
            'performance_settings': self.performance_settings,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }


@dataclass
class CONFIG_FILE:
    """Configuration file entity."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    file_path: str = ""
    file_name: str = ""
    file_hash: str = ""
    content: str = ""
    is_active: bool = True
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'id': self.id,
            'file_path': self.file_path,
            'file_name': self.file_name,
            'file_hash': self.file_hash,
            'content': self.content,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }


@dataclass
class CONFIG_SECTION:
    """Configuration section entity."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    config_file_id: str = ""
    section_type: ConfigSectionType = ConfigSectionType.AI_SETTINGS
    section_name: str = ""
    content: Dict[str, Any] = field(default_factory=dict)
    validation_schema: Optional[Dict[str, Any]] = None
    is_valid: bool = True
    validation_errors: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'id': self.id,
            'config_file_id': self.config_file_id,
            'section_type': self.section_type.value,
            'section_name': self.section_name,
            'content': self.content,
            'validation_schema': self.validation_schema,
            'is_valid': self.is_valid,
            'validation_errors': self.validation_errors,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }


@dataclass
class CONFIG_VALIDATION:
    """Configuration validation entity."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    config_section_id: str = ""
    validation_type: str = "schema"
    validation_result: bool = True
    errors: List[Dict[str, Any]] = field(default_factory=list)
    warnings: List[Dict[str, Any]] = field(default_factory=list)
    validated_at: datetime = field(default_factory=datetime.utcnow)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'id': self.id,
            'config_section_id': self.config_section_id,
            'validation_type': self.validation_type,
            'validation_result': self.validation_result,
            'errors': self.errors,
            'warnings': self.warnings,
            'validated_at': self.validated_at.isoformat()
        }


@dataclass
class FILE_WATCHER:
    """File watcher entity for configuration monitoring."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    file_path: str = ""
    is_active: bool = True
    last_modified: Optional[datetime] = None
    watch_interval_seconds: int = 60
    created_at: datetime = field(default_factory=datetime.utcnow)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'id': self.id,
            'file_path': self.file_path,
            'is_active': self.is_active,
            'last_modified': self.last_modified.isoformat() if self.last_modified else None,
            'watch_interval_seconds': self.watch_interval_seconds,
            'created_at': self.created_at.isoformat()
        }