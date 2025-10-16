"""
CLI state management for Learning Catalyst.

Simple state tracking for CLI sessions.
"""

from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from enum import Enum
from datetime import datetime

from ..core.logging import get_logger


class LearningStyle(Enum):
    """Different learning styles for personalization."""
    VISUAL = "visual"          # Learns through diagrams, charts, visual examples
    AUDITORY = "auditory"      # Learns through explanations, discussions
    KINESTHETIC = "kinesthetic"  # Learns through practice, hands-on examples
    READING = "reading"        # Learns through text, documentation
    MIXED = "mixed"           # Combination of styles


class ResponseFormat(Enum):
    """Preferred response formats."""
    CONCISE = "concise"        # Short, to-the-point answers
    DETAILED = "detailed"      # Comprehensive explanations
    EXAMPLES = "examples"      # Focus on practical examples
    ANALOGIES = "analogies"    # Use analogies and metaphors
    STEP_BY_STEP = "step_by_step"  # Break down into steps


@dataclass
class UserPreferences:
    """User learning preferences and personalization settings."""
    learning_style: LearningStyle = LearningStyle.MIXED
    response_format: ResponseFormat = ResponseFormat.DETAILED
    technical_level: str = "intermediate"  # beginner, intermediate, advanced
    preferred_response_length: str = "medium"  # short, medium, long
    include_code_examples: bool = True
    use_real_world_examples: bool = True
    difficulty_preference: str = "adaptive"  # easy, medium, hard, adaptive
    topics_of_interest: List[str] = field(default_factory=list)
    learning_goals: List[str] = field(default_factory=list)
    feedback_frequency: str = "balanced"  # minimal, balanced, frequent
    session_reminders: bool = True
    progress_tracking: bool = True


@dataclass
class Achievement:
    """Represents an achievement that can be unlocked."""
    id: str
    title: str
    description: str
    icon: str
    category: str
    requirement_type: str  # concepts_count, mastery_level, streak, sessions, etc.
    requirement_value: int
    progress: float = 0.0  # 0.0 to 1.0
    unlocked: bool = False
    unlocked_at: Optional[str] = None
    points: int = 0


@dataclass
class PersonalizationMetrics:
    """Metrics for tracking personalization effectiveness."""
    preferred_question_types: Dict[str, int] = field(default_factory=dict)
    average_response_satisfaction: float = 0.0
    learning_style_confidence: Dict[LearningStyle, float] = field(default_factory=dict)
    topic_engagement: Dict[str, float] = field(default_factory=dict)
    session_length_preference: str = "medium"  # short, medium, long
    time_of_day_preference: List[str] = field(default_factory=list)
    interaction_patterns: Dict[str, Any] = field(default_factory=dict)


@dataclass
class KnowledgeNode:
    """Represents a learning concept or skill."""
    name: str
    category: str
    mastery_level: float = 0.0  # 0.0 to 1.0
    last_reviewed: Optional[str] = None
    review_count: int = 0
    related_concepts: List[str] = field(default_factory=list)
    learning_style_effectiveness: Dict[LearningStyle, float] = field(default_factory=dict)
    personal_notes: str = ""
    difficulty_rating: Optional[str] = None  # easy, medium, hard


@dataclass
class LearningSession:
    """Represents a learning session with progress tracking."""
    session_id: str
    start_time: str
    topics_covered: List[str] = field(default_factory=list)
    questions_asked: int = 0
    concepts_learned: int = 0
    quiz_scores: List[float] = field(default_factory=list)
    total_interactions: int = 0


@dataclass
class CLIState:
    """Current state of the CLI interface with enhanced learning features and personalization."""
    session_active: bool = True
    current_provider: Optional[str] = None
    current_model: Optional[str] = None
    conversation_history: List[Dict[str, str]] = field(default_factory=list)
    user_input: str = ""
    ai_session_id: Optional[str] = None  # For AI integration

    # Interactive Learning Features
    knowledge_nodes: Dict[str, KnowledgeNode] = field(default_factory=dict)
    learning_sessions: List[LearningSession] = field(default_factory=list)
    current_session: Optional[LearningSession] = None
    learning_mode: str = "exploration"  # exploration, quiz, practice
    current_topic: Optional[str] = None
    learning_streak: int = 0  # Days of continuous learning
    total_concepts_learned: int = 0

    # Personalization Features
    user_preferences: UserPreferences = field(default_factory=UserPreferences)
    personalization_metrics: PersonalizationMetrics = field(default_factory=PersonalizationMetrics)
    first_time_user: bool = True
    onboarding_completed: bool = False
    adaptive_responses_enabled: bool = True
    personalization_confidence: float = 0.0  # How confident we are in personalization

    # Achievement and Gamification Features
    achievements: Dict[str, Achievement] = field(default_factory=dict)
    total_points: int = 0
    current_level: int = 1
    level_progress: float = 0.0  # Progress towards next level
    milestones_reached: List[str] = field(default_factory=list)
    last_achievement_notification: Optional[str] = None

    def __post_init__(self) -> None:
        """Initialize logger after dataclass creation."""
        self.logger = get_logger("cli_state")

    def add_to_history(self, role: str, content: str) -> None:
        """Add a message to conversation history."""
        self.conversation_history.append({
            "role": role,
            "content": content
        })

        # Track learning interactions
        if self.current_session:
            self.current_session.total_interactions += 1
            if role == "user":
                self.current_session.questions_asked += 1

        # Keep only last 50 messages
        if len(self.conversation_history) > 50:
            self.conversation_history = self.conversation_history[-50:]

    def get_recent_history(self, count: int = 5) -> List[Dict[str, str]]:
        """Get recent conversation history."""
        return self.conversation_history[-count:]

    def clear_history(self) -> None:
        """Clear conversation history."""
        self.conversation_history = []

    def start_learning_session(self, session_id: str) -> None:
        """Start a new learning session."""
        self.current_session = LearningSession(
            session_id=session_id,
            start_time=datetime.now().isoformat()
        )
        self.learning_sessions.append(self.current_session)

    def track_concept_learned(self, concept_name: str, category: str) -> None:
        """Track a learned concept and update mastery level."""
        if concept_name not in self.knowledge_nodes:
            self.knowledge_nodes[concept_name] = KnowledgeNode(
                name=concept_name,
                category=category
            )
            self.total_concepts_learned += 1

        # Update mastery level
        node = self.knowledge_nodes[concept_name]
        node.mastery_level = min(1.0, node.mastery_level + 0.1)
        node.review_count += 1
        node.last_reviewed = self.current_session.start_time if self.current_session else None

        # Track in current session
        if self.current_session and concept_name not in self.current_session.topics_covered:
            self.current_session.topics_covered.append(concept_name)
            self.current_session.concepts_learned += 1

        # Check for newly unlocked achievements
        newly_unlocked = self.update_achievements()
        if newly_unlocked:
            # Store notification to show later
            self.last_achievement_notification = newly_unlocked[0].title if newly_unlocked else None

    def record_quiz_score(self, score: float) -> None:
        """Record a quiz score."""
        if self.current_session:
            self.current_session.quiz_scores.append(score)

    def get_learning_progress(self) -> Dict[str, Any]:
        """Get comprehensive learning progress information."""
        total_nodes = len(self.knowledge_nodes)
        mastered_nodes = sum(1 for node in self.knowledge_nodes.values() if node.mastery_level >= 0.8)
        avg_mastery = sum(node.mastery_level for node in self.knowledge_nodes.values()) / total_nodes if total_nodes > 0 else 0

        # Calculate category distribution
        categories = {}
        for node in self.knowledge_nodes.values():
            if node.category not in categories:
                categories[node.category] = 0
            categories[node.category] += 1

        # Current session stats
        session_stats = {}
        if self.current_session:
            avg_score = sum(self.current_session.quiz_scores) / len(self.current_session.quiz_scores) if self.current_session.quiz_scores else 0
            session_stats = {
                "questions_asked": self.current_session.questions_asked,
                "concepts_learned": self.current_session.concepts_learned,
                "quiz_count": len(self.current_session.quiz_scores),
                "average_quiz_score": avg_score,
                "total_interactions": self.current_session.total_interactions
            }

        return {
            "total_concepts": total_nodes,
            "mastered_concepts": mastered_nodes,
            "mastery_percentage": (mastered_nodes / total_nodes * 100) if total_nodes > 0 else 0,
            "average_mastery": avg_mastery,
            "categories": categories,
            "learning_streak": self.learning_streak,
            "current_session": session_stats,
            "total_sessions": len(self.learning_sessions)
        }

    def get_session_info(self) -> Dict[str, Any]:
        """Get current session information."""
        return {
            "active": self.session_active,
            "provider": self.current_provider,
            "model": self.current_model,
            "history_length": len(self.conversation_history),
            "ai_session_id": self.ai_session_id[:8] + "..." if self.ai_session_id else None,
            "learning_mode": self.learning_mode,
            "current_topic": self.current_topic,
            "learning_progress": self.get_learning_progress(),
            "personalization": self.get_personalization_info()
        }

    # Personalization Methods
    def update_learning_preferences(self, **kwargs) -> None:
        """Update user learning preferences."""
        for key, value in kwargs.items():
            if hasattr(self.user_preferences, key):
                setattr(self.user_preferences, key, value)
                self.logger.info(f"Updated preference {key} to {value}")

    def get_personalization_info(self) -> Dict[str, Any]:
        """Get current personalization information."""
        return {
            "learning_style": self.user_preferences.learning_style.value,
            "response_format": self.user_preferences.response_format.value,
            "technical_level": self.user_preferences.technical_level,
            "first_time_user": self.first_time_user,
            "personalization_confidence": self.personalization_confidence,
            "adaptive_responses": self.adaptive_responses_enabled,
            "topics_of_interest": self.user_preferences.topics_of_interest,
            "learning_goals": self.user_preferences.learning_goals
        }

    def record_interaction_pattern(self, interaction_type: str, context: Dict[str, Any]) -> None:
        """Record user interaction patterns for better personalization."""
        if interaction_type not in self.personalization_metrics.interaction_patterns:
            self.personalization_metrics.interaction_patterns[interaction_type] = []

        self.personalization_metrics.interaction_patterns[interaction_type].append({
            "timestamp": context.get("timestamp"),
            "topic": context.get("topic"),
            "question_length": len(context.get("question", "")),
            "satisfaction": context.get("satisfaction", 0.0)
        })

    def update_learning_style_confidence(self, style: LearningStyle, effectiveness: float) -> None:
        """Update confidence in learning style effectiveness."""
        current_confidence = self.personalization_metrics.learning_style_confidence.get(style, 0.0)
        # Weighted average (give more weight to recent data)
        new_confidence = (current_confidence * 0.7) + (effectiveness * 0.3)
        self.personalization_metrics.learning_style_confidence[style] = new_confidence

    def get_personalized_system_prompt(self, user_question: str) -> str:
        """Generate a personalized system prompt based on user preferences."""
        base_prompt = "You are Learning Catalyst, an AI learning companion. "

        # Add learning style specific instructions
        style_instructions = {
            LearningStyle.VISUAL: "Use visual descriptions, diagrams (described in text), and visual analogies.",
            LearningStyle.AUDITORY: "Use clear explanations, conversational tone, and verbal descriptions.",
            LearningStyle.KINESTHETIC: "Focus on practical examples, hands-on exercises, and real-world applications.",
            LearningStyle.READING: "Provide well-structured text, clear explanations, and written examples.",
            LearningStyle.MIXED: "Use a balanced approach with various learning methods."
        }

        # Add format specific instructions
        format_instructions = {
            ResponseFormat.CONCISE: "Keep answers brief and to the point.",
            ResponseFormat.DETAILED: "Provide comprehensive explanations with depth.",
            ResponseFormat.EXAMPLES: "Focus on practical, real-world examples.",
            ResponseFormat.ANALOGIES: "Use analogies and metaphors to explain concepts.",
            ResponseFormat.STEP_BY_STEP: "Break down explanations into clear, numbered steps."
        }

        # Add technical level instructions
        level_instructions = {
            "beginner": "Explain concepts simply, avoid jargon, define technical terms.",
            "intermediate": "Assume some background knowledge, explain moderately complex concepts.",
            "advanced": "Use technical language appropriately, dive deep into complex topics."
        }

        personalized_prompt = base_prompt
        personalized_prompt += style_instructions.get(self.user_preferences.learning_style, "")
        personalized_prompt += " " + format_instructions.get(self.user_preferences.response_format, "")
        personalized_prompt += " " + level_instructions.get(self.user_preferences.technical_level, "")

        if self.user_preferences.include_code_examples:
            personalized_prompt += " Include relevant code examples when helpful."

        if self.user_preferences.use_real_world_examples:
            personalized_prompt += " Use real-world examples and applications."

        # Add length preference
        length_instructions = {
            "short": "Keep responses concise (under 200 words).",
            "medium": "Provide balanced responses (200-500 words).",
            "long": "Give thorough, detailed responses (500+ words)."
        }
        personalized_prompt += " " + length_instructions.get(self.user_preferences.preferred_response_length, "")

        # Add adaptive difficulty
        if self.user_preferences.difficulty_preference == "adaptive":
            personalized_prompt += " Adapt the difficulty based on the user's questions and progress."

        return personalized_prompt

    def track_topic_engagement(self, topic: str, engagement_score: float) -> None:
        """Track user engagement with different topics."""
        current_engagement = self.personalization_metrics.topic_engagement.get(topic, 0.5)
        # Weighted average
        new_engagement = (current_engagement * 0.8) + (engagement_score * 0.2)
        self.personalization_metrics.topic_engagement[topic] = new_engagement

    def get_personalized_suggestions(self, user_question: str) -> List[str]:
        """Get personalized learning suggestions based on user preferences and history."""
        suggestions = []

        # Based on learning style
        if self.user_preferences.learning_style == LearningStyle.VISUAL:
            suggestions.append("📊 Ask for visual diagrams or charts to understand concepts better")
        elif self.user_preferences.learning_style == LearningStyle.KINESTHETIC:
            suggestions.append("🛠️ Request hands-on exercises or practical projects")
        elif self.user_preferences.learning_style == LearningStyle.AUDITORY:
            suggestions.append("💬 Ask for step-by-step verbal explanations")

        # Based on technical level
        if self.user_preferences.technical_level == "beginner":
            suggestions.append("🔰 Ask for 'explain like I'm a beginner' when needed")
        elif self.user_preferences.technical_level == "advanced":
            suggestions.append("🚀 Request deep dives into advanced topics")

        # Based on interests
        if self.user_preferences.topics_of_interest:
            interest_text = ", ".join(self.user_preferences.topics_of_interest[:2])
            suggestions.append(f"🎯 Connect topics to your interests: {interest_text}")

        # Based on response format preference
        if self.user_preferences.response_format == ResponseFormat.EXAMPLES:
            suggestions.append("💡 Always ask for practical examples")
        elif self.user_preferences.response_format == ResponseFormat.STEP_BY_STEP:
            suggestions.append("📝 Request step-by-step breakdowns")

        return suggestions[:3]  # Return top 3 suggestions

    def should_adapt_response(self) -> bool:
        """Determine if response should be adapted based on personalization confidence."""
        return (
            self.adaptive_responses_enabled and
            self.personalization_confidence > 0.3 and
            not self.first_time_user
        )

    def mark_onboarding_completed(self) -> None:
        """Mark user onboarding as completed."""
        self.onboarding_completed = True
        self.first_time_user = False
        self.personalization_confidence = 0.3  # Start with moderate confidence

    # Achievement System Methods
    def initialize_achievements(self) -> None:
        """Initialize the achievement system with default achievements."""

        default_achievements = [
            # Learning Milestones
            Achievement(
                id="first_concept",
                title="First Steps",
                description="Learn your first concept",
                icon="🌱",
                category="learning",
                requirement_type="concepts_count",
                requirement_value=1,
                points=10
            ),
            Achievement(
                id="concept_explorer",
                title="Knowledge Explorer",
                description="Learn 10 concepts",
                icon="🔍",
                category="learning",
                requirement_type="concepts_count",
                requirement_value=10,
                points=50
            ),
            Achievement(
                id="dedicated_learner",
                title="Dedicated Learner",
                description="Learn 25 concepts",
                icon="🎓",
                category="learning",
                requirement_type="concepts_count",
                requirement_value=25,
                points=100
            ),
            Achievement(
                id="knowledge_master",
                title="Knowledge Master",
                description="Learn 50 concepts",
                icon="📚",
                category="learning",
                requirement_type="concepts_count",
                requirement_value=50,
                points=250
            ),

            # Mastery Achievements
            Achievement(
                id="skill_builder",
                title="Skill Builder",
                description="Master 5 concepts",
                icon="🎯",
                category="mastery",
                requirement_type="mastered_count",
                requirement_value=5,
                points=75
            ),
            Achievement(
                id="expert_learner",
                title="Expert Learner",
                description="Master 15 concepts",
                icon="⭐",
                category="mastery",
                requirement_type="mastered_count",
                requirement_value=15,
                points=200
            ),
            Achievement(
                id="mastery_legend",
                title="Mastery Legend",
                description="Master 30 concepts",
                icon="🏆",
                category="mastery",
                requirement_type="mastered_count",
                requirement_value=30,
                points=500
            ),

            # Streak Achievements
            Achievement(
                id="consistent_learner",
                title="Consistent Learner",
                description="3-day learning streak",
                icon="🔥",
                category="engagement",
                requirement_type="learning_streak",
                requirement_value=3,
                points=30
            ),
            Achievement(
                id="weekly_warrior",
                title="Weekly Warrior",
                description="7-day learning streak",
                icon="💪",
                category="engagement",
                requirement_type="learning_streak",
                requirement_value=7,
                points=100
            ),
            Achievement(
                id="learning_champion",
                title="Learning Champion",
                description="14-day learning streak",
                icon="👑",
                category="engagement",
                requirement_type="learning_streak",
                requirement_value=14,
                points=300
            ),

            # Session Achievements
            Achievement(
                id="first_session",
                title="Getting Started",
                description="Complete your first learning session",
                icon="🚀",
                category="engagement",
                requirement_type="session_count",
                requirement_value=1,
                points=15
            ),
            Achievement(
                id="regular_learner",
                title="Regular Learner",
                description="Complete 10 learning sessions",
                icon="📅",
                category="engagement",
                requirement_type="session_count",
                requirement_value=10,
                points=60
            ),
            Achievement(
                id="learning_enthusiast",
                title="Learning Enthusiast",
                description="Complete 25 learning sessions",
                icon="⚡",
                category="engagement",
                requirement_type="session_count",
                requirement_value=25,
                points=150
            ),

            # Interactive Achievements
            Achievement(
                id="curious_mind",
                title="Curious Mind",
                description="Ask 50 questions",
                icon="❓",
                category="engagement",
                requirement_type="questions_asked",
                requirement_value=50,
                points=40
            ),
            Achievement(
                id="knowledge_seeker",
                title="Knowledge Seeker",
                description="Ask 100 questions",
                icon="🔎",
                category="engagement",
                requirement_type="questions_asked",
                requirement_value=100,
                points=120
            ),

            # Quiz Achievements
            Achievement(
                id="quiz_beginner",
                title="Quiz Beginner",
                description="Take your first quiz",
                icon="📝",
                category="assessment",
                requirement_type="quiz_count",
                requirement_value=1,
                points=20
            ),
            Achievement(
                id="quiz_master",
                title="Quiz Master",
                description="Take 10 quizzes",
                icon="🎯",
                category="assessment",
                requirement_type="quiz_count",
                requirement_value=10,
                points=80
            ),
            Achievement(
                id="perfect_score",
                title="Perfect Score",
                description="Get 100% on a quiz",
                icon="💯",
                category="assessment",
                requirement_type="perfect_quiz",
                requirement_value=1,
                points=100
            ),

            # Special Achievements
            Achievement(
                id="personalized_journey",
                title="Personalized Journey",
                description="Complete the personalization setup",
                icon="🎨",
                category="personalization",
                requirement_type="personalization_setup",
                requirement_value=1,
                points=25
            ),
            Achievement(
                id="first_command",
                title="Command Explorer",
                description="Use your first slash command",
                icon="⌨️",
                category="exploration",
                requirement_type="first_command",
                requirement_value=1,
                points=15
            ),
        ]

        for achievement in default_achievements:
            if achievement.id not in self.achievements:
                self.achievements[achievement.id] = achievement

    def update_achievements(self) -> List[Achievement]:
        """Update achievement progress and return newly unlocked achievements."""
        newly_unlocked = []

        # Initialize achievements if not already done
        if not self.achievements:
            self.initialize_achievements()

        # Get current stats
        progress = self.get_learning_progress()
        mastered_count = progress["mastered_concepts"]
        total_concepts = progress["total_concepts"]
        total_sessions = progress["total_sessions"]
        learning_streak = progress["learning_streak"]

        # Calculate other metrics
        total_questions = sum(
            session.questions_asked
            for session in self.learning_sessions
        )
        total_quizzes = sum(
            len(session.quiz_scores)
            for session in self.learning_sessions
        )
        perfect_quizzes = sum(
            1 for session in self.learning_sessions
            for score in session.quiz_scores
            if score >= 1.0
        )

        # Update each achievement
        for achievement in self.achievements.values():
            if achievement.unlocked:
                continue

            # Calculate progress based on requirement type
            old_progress = achievement.progress

            if achievement.requirement_type == "concepts_count":
                achievement.progress = min(1.0, total_concepts / achievement.requirement_value)
            elif achievement.requirement_type == "mastered_count":
                achievement.progress = min(1.0, mastered_count / achievement.requirement_value)
            elif achievement.requirement_type == "learning_streak":
                achievement.progress = min(1.0, learning_streak / achievement.requirement_value)
            elif achievement.requirement_type == "session_count":
                achievement.progress = min(1.0, total_sessions / achievement.requirement_value)
            elif achievement.requirement_type == "questions_asked":
                achievement.progress = min(1.0, total_questions / achievement.requirement_value)
            elif achievement.requirement_type == "quiz_count":
                achievement.progress = min(1.0, total_quizzes / achievement.requirement_value)
            elif achievement.requirement_type == "perfect_quiz":
                achievement.progress = min(1.0, perfect_quizzes / achievement.requirement_value)
            elif achievement.requirement_type == "personalization_setup":
                achievement.progress = 1.0 if self.onboarding_completed else 0.0
            elif achievement.requirement_type == "first_command":
                achievement.progress = 1.0 if len(self.conversation_history) > 2 else 0.0

            # Check if achievement is newly unlocked
            if achievement.progress >= 1.0 and not achievement.unlocked:
                achievement.unlocked = True
                achievement.unlocked_at = datetime.now().isoformat()
                self.total_points += achievement.points
                newly_unlocked.append(achievement)

                # Update level
                self.update_level()

        return newly_unlocked

    def update_level(self) -> None:
        """Update user level based on total points."""
        # Level thresholds (every 100 points = 1 level, starting from level 1)
        self.current_level = 1 + (self.total_points // 100)
        self.level_progress = (self.total_points % 100) / 100.0

    def get_level_info(self) -> Dict[str, Any]:
        """Get level information with visual progress."""
        points_to_next_level = 100 - (self.total_points % 100)

        return {
            "current_level": self.current_level,
            "total_points": self.total_points,
            "level_progress": self.level_progress,
            "points_to_next_level": points_to_next_level,
            "level_title": self._get_level_title(self.current_level)
        }

    def _get_level_title(self, level: int) -> str:
        """Get title for a given level."""
        titles = {
            1: "Novice Learner",
            2: "Curious Mind",
            3: "Knowledge Seeker",
            4: "Dedicated Student",
            5: "Learning Enthusiast",
            6: "Skill Builder",
            7: "Knowledge Explorer",
            8: "Expert Learner",
            9: "Master Student",
            10: "Learning Virtuoso",
            15: "Knowledge Master",
            20: "Learning Legend",
            25: "Wisdom Keeper",
            30: "Enlightened Scholar"
        }

        # For levels beyond what we have defined
        if level in titles:
            return titles[level]
        elif level >= 30:
            return "Transcendent Master"
        elif level >= 25:
            return "Wisdom Keeper"
        elif level >= 20:
            return "Learning Legend"
        elif level >= 15:
            return "Knowledge Master"
        else:
            return f"Level {level} Learner"

    def get_achievement_summary(self) -> Dict[str, Any]:
        """Get comprehensive achievement summary."""
        # Update achievements first
        newly_unlocked = self.update_achievements()

        # Count achievements by category
        categories = {}
        total_achievements = len(self.achievements)
        unlocked_achievements = 0

        for achievement in self.achievements.values():
            if achievement.category not in categories:
                categories[achievement.category] = {"total": 0, "unlocked": 0}

            categories[achievement.category]["total"] += 1
            if achievement.unlocked:
                categories[achievement.category]["unlocked"] += 1
                unlocked_achievements += 1

        # Get recent achievements
        recent_achievements = sorted(
            [a for a in self.achievements.values() if a.unlocked],
            key=lambda x: x.unlocked_at or "",
            reverse=True
        )[:5]

        return {
            "total_achievements": total_achievements,
            "unlocked_achievements": unlocked_achievements,
            "completion_rate": (unlocked_achievements / total_achievements * 100) if total_achievements > 0 else 0,
            "total_points": self.total_points,
            "categories": categories,
            "recent_achievements": recent_achievements,
            "level_info": self.get_level_info(),
            "newly_unlocked": newly_unlocked
        }

    def create_progress_bar(self, progress: float, width: int = 20) -> str:
        """Create a visual progress bar."""
        filled = int(width * progress)
        empty = width - filled

        # Use different characters for filled portion
        if progress >= 1.0:
            filled_chars = "█" * filled
        elif progress >= 0.8:
            filled_chars = "█" * (filled - 1) + "▓"
        elif progress >= 0.6:
            filled_chars = "█" * (filled - 1) + "▒"
        elif progress >= 0.4:
            filled_chars = "█" * (filled - 1) + "░"
        elif progress >= 0.2:
            filled_chars = "▒" if filled > 0 else ""
        else:
            filled_chars = "░" if filled > 0 else ""

        empty_chars = "░" * empty
        return f"{filled_chars}{empty_chars}"

    def get_motivational_message(self) -> str:
        """Get a motivational message based on progress."""
        progress = self.get_learning_progress()
        mastery_pct = progress["mastery_percentage"]

        if mastery_pct >= 90:
            return "🌟 Incredible! You're becoming a true master of these concepts!"
        elif mastery_pct >= 75:
            return "🎯 Excellent progress! You're well on your way to mastery."
        elif mastery_pct >= 50:
            return "🚀 Great job! You're halfway to mastering these concepts."
        elif mastery_pct >= 25:
            return "💪 Good start! Keep building your knowledge foundation."
        elif mastery_pct >= 10:
            return "🌱 You're just beginning! Every concept learned is progress."
        else:
            return "🚀 Ready to start your learning journey? Ask me anything!"