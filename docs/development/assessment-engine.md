# Assessment Engine Development Guide

---
title: Building Adaptive Quizzes and Learning Assessments
description: Comprehensive guide to implementing adaptive assessment engines, quiz generation, and personalized learning evaluation
version: 2.0.0
last_updated: 2025-10-08
---

## Overview

This guide covers the implementation of Learning Catalyst's assessment engine, which provides adaptive quiz generation, personalized difficulty adjustment, real-time feedback systems, and comprehensive performance analytics. These features transform static learning into dynamic, responsive educational experiences.

**Perfect for**: Feature developers building adaptive learning systems, AI engineers implementing quiz generation, and developers creating personalized assessment algorithms

**Key Features:**
- Adaptive quiz generation with AI-powered question creation
- Personalized difficulty adjustment based on performance
- Real-time feedback and hint systems
- Comprehensive performance analytics and progress tracking
- Multi-format assessment support (multiple choice, coding, theoretical)
- Learning objective alignment and competency mapping

## 📚 Table of Contents

1. [Assessment Engine Architecture](#assessment-engine-architecture)
2. [Adaptive Quiz Generation](#adaptive-quiz-generation)
3. [Difficulty Adjustment Algorithms](#difficulty-adjustment-algorithms)
4. [Real-Time Feedback Systems](#real-time-feedback-systems)
5. [Performance Analytics Integration](#performance-analytics-integration)
6. [Interactive Quiz Implementation](#interactive-quiz-implementation)
7. [Assessment Data Models](#assessment-data-models)
8. [Testing Assessment Systems](#testing-assessment-systems)

## 🏗️ Assessment Engine Architecture

### Core Components

The assessment engine consists of several interconnected components that work together to provide adaptive learning experiences:

```python
# src/core/assessment_engine.py
from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum

class QuestionType(Enum):
    MULTIPLE_CHOICE = "multiple_choice"
    CODING_CHALLENGE = "coding_challenge"
    THEORETICAL = "theoretical"
    FILL_BLANK = "fill_blank"
    TRUE_FALSE = "true_false"

class DifficultyLevel(Enum):
    BEGINNER = 1
    INTERMEDIATE = 2
    ADVANCED = 3
    EXPERT = 4

@dataclass
class Question:
    id: str
    type: QuestionType
    content: str
    options: List[str]  # For multiple choice
    correct_answer: Any
    explanation: str
    difficulty: DifficultyLevel
    topic: str
    prerequisites: List[str]
    estimated_time: int  # in seconds
    points: int

@dataclass
class AssessmentResult:
    question_id: str
    user_answer: Any
    is_correct: bool
    time_taken: int
    hints_used: int
    confidence: float
    feedback: str
    learning_insights: List[str]

class AssessmentEngine(ABC):
    @abstractmethod
    async def generate_assessment(self, topic: str, user_profile: Dict[str, Any]) -> List[Question]:
        """Generate adaptive assessment questions"""
        pass

    @abstractmethod
    async def evaluate_answer(self, question: Question, user_answer: Any, context: Dict[str, Any]) -> AssessmentResult:
        """Evaluate user answer and provide feedback"""
        pass

    @abstractmethod
    async def adjust_difficulty(self, user_performance: List[AssessmentResult]) -> DifficultyLevel:
        """Adjust difficulty based on user performance"""
        pass
```

### Implementation Architecture

```python
# src/core/advanced_assessment_engine.py
class AdvancedAssessmentEngine(AssessmentEngine):
    def __init__(self, ai_service, knowledge_graph, db_manager):
        self.ai_service = ai_service
        self.knowledge_graph = knowledge_graph
        self.db_manager = db_manager
        self.question_generator = QuestionGenerator(ai_service)
        self.difficulty_adjuster = DifficultyAdjuster()
        self.feedback_generator = FeedbackGenerator(ai_service)

    async def generate_assessment(self, topic: str, user_profile: Dict[str, Any]) -> List[Question]:
        """Generate personalized assessment based on user profile and topic"""

        # 1. Analyze user's current knowledge state
        current_mastery = await self._assess_current_mastery(topic, user_profile['user_id'])

        # 2. Determine appropriate difficulty range
        difficulty_range = self._calculate_difficulty_range(current_mastery, user_profile)

        # 3. Generate question pool
        question_pool = await self._generate_question_pool(topic, difficulty_range)

        # 4. Select and sequence questions optimally
        assessment = await self._sequence_questions(question_pool, user_profile)

        return assessment

    async def evaluate_answer(self, question: Question, user_answer: Any, context: Dict[str, Any]) -> AssessmentResult:
        """Evaluate user answer with rich feedback"""

        # 1. Determine correctness
        is_correct = await self._evaluate_correctness(question, user_answer)

        # 2. Generate personalized feedback
        feedback = await self.feedback_generator.generate_feedback(
            question, user_answer, is_correct, context
        )

        # 3. Calculate confidence and learning insights
        confidence = await self._calculate_answer_confidence(question, user_answer, context)
        insights = await self._generate_learning_insights(question, user_answer, is_correct)

        return AssessmentResult(
            question_id=question.id,
            user_answer=user_answer,
            is_correct=is_correct,
            time_taken=context.get('time_taken', 0),
            hints_used=context.get('hints_used', 0),
            confidence=confidence,
            feedback=feedback,
            learning_insights=insights
        )
```

## 🎯 Adaptive Quiz Generation

### AI-Powered Question Generation

```python
# src/core/question_generator.py
class QuestionGenerator:
    def __init__(self, ai_service):
        self.ai_service = ai_service
        self.templates = self._load_question_templates()

    async def generate_questions(self, topic: str, count: int, difficulty: DifficultyLevel,
                               user_context: Dict[str, Any]) -> List[Question]:
        """Generate questions using AI with context awareness"""

        questions = []

        # Analyze learning objectives
        learning_objectives = await self._extract_learning_objectives(topic, user_context)

        for i in range(count):
            # Generate question for each learning objective
            objective = learning_objectives[i % len(learning_objectives)]

            question = await self._generate_single_question(
                topic, objective, difficulty, user_context
            )
            questions.append(question)

        return questions

    async def _generate_single_question(self, topic: str, objective: str,
                                      difficulty: DifficultyLevel,
                                      user_context: Dict[str, Any]) -> Question:
        """Generate a single question using AI"""

        # Get user's learning history for personalization
        weak_areas = user_context.get('weak_areas', [])
        mastered_concepts = user_context.get('mastered_concepts', [])

        prompt = f"""
        Generate a {difficulty.value} level question for {topic} focusing on: {objective}

        User Context:
        - Weak areas: {weak_areas}
        - Already mastered: {mastered_concepts}
        - Learning style: {user_context.get('learning_style', 'balanced')}

        Requirements:
        1. Question should test understanding of {objective}
        2. Difficulty should be appropriate for {difficulty.value} level
        3. Avoid concepts the user has already mastered
        4. Include practical, real-world applications when possible
        5. Provide clear explanation for the answer

        Return in JSON format:
        {{
            "content": "Question text",
            "type": "multiple_choice|coding_challenge|theoretical",
            "options": ["option1", "option2", "option3", "option4"],
            "correct_answer": "correct option or answer",
            "explanation": "Detailed explanation",
            "estimated_time": 60,
            "points": 10
        }}
        """

        response = await self.ai_service.generate_response(prompt)
        question_data = json.loads(response.content)

        return Question(
            id=self._generate_question_id(),
            type=QuestionType(question_data['type']),
            content=question_data['content'],
            options=question_data.get('options', []),
            correct_answer=question_data['correct_answer'],
            explanation=question_data['explanation'],
            difficulty=difficulty,
            topic=topic,
            prerequisites=await self._identify_prerequisites(topic, objective),
            estimated_time=question_data['estimated_time'],
            points=question_data['points']
        )

    async def generate_coding_challenge(self, topic: str, difficulty: DifficultyLevel,
                                       user_context: Dict[str, Any]) -> Question:
        """Generate coding challenge with test cases"""

        prompt = f"""
        Generate a coding challenge for {topic} at {difficulty.value} level.

        User Context:
        - Previous code submissions: {user_context.get('code_history', [])}
        - Common errors: {user_context.get('common_errors', [])}
        - Preferred language: {user_context.get('preferred_language', 'python')}

        Requirements:
        1. Practical, real-world problem
        2. Clear requirements and constraints
        3. Include sample input/output
        4. Provide test cases for validation
        5. Encourage good coding practices

        Return in JSON format:
        {{
            "content": "Problem description with requirements",
            "starter_code": "Function signature or template",
            "test_cases": [
                {{"input": "test input", "expected_output": "expected output"}}
            ],
            "constraints": ["time/space constraints"],
            "hints": ["progressive hints"],
            "solution_explanation": "Approach explanation"
        }}
        """

        response = await self.ai_service.generate_response(prompt)
        challenge_data = json.loads(response.content)

        return Question(
            id=self._generate_question_id(),
            type=QuestionType.CODING_CHALLENGE,
            content=challenge_data['content'],
            options=[],
            correct_answer={
                'starter_code': challenge_data['starter_code'],
                'test_cases': challenge_data['test_cases'],
                'constraints': challenge_data['constraints'],
                'solution': challenge_data['solution_explanation']
            },
            explanation=challenge_data['solution_explanation'],
            difficulty=difficulty,
            topic=topic,
            prerequisites=await self._identify_prerequisites(topic, 'coding'),
            estimated_time=challenge_data.get('estimated_time', 300),
            points=20
        )
```

### Question Templates and Patterns

```python
# src/core/question_templates.py
class QuestionTemplates:
    MULTIPLE_CHOICE_TEMPLATES = [
        {
            "pattern": "conceptual_understanding",
            "template": "Which of the following best describes {concept}?",
            "distractor_strategy": "common_misconceptions"
        },
        {
            "pattern": "practical_application",
            "template": "In which scenario would you use {concept}?",
            "distractor_strategy": "plausible_but_incorrect"
        },
        {
            "pattern": "comparison",
            "template": "What is the main difference between {concept1} and {concept2}?",
            "distractor_strategy": "subtle_distinctions"
        }
    ]

    CODING_CHALLENGE_TEMPLATES = [
        {
            "pattern": "algorithm_implementation",
            "template": "Implement a function that {task_description}",
            "complexity_indicators": ["time_complexity", "space_complexity", "edge_cases"]
        },
        {
            "pattern": "bug_fixing",
            "template": "Fix the following code that {description_of_issue}",
            "complexity_indicators": ["logical_errors", "syntactic_issues", "performance_problems"]
        },
        {
            "pattern": "code_refactoring",
            "template": "Refactor the following code to {improvement_goal}",
            "complexity_indicators": ["code_quality", "maintainability", "efficiency"]
        }
    ]

    def generate_from_template(self, template_type: str, concept: str, context: Dict[str, Any]) -> str:
        """Generate question from predefined template"""

        templates = getattr(self, f"{template_type.upper()}_TEMPLATES", [])

        # Select appropriate template based on context
        template = self._select_template(templates, context)

        # Fill template with concept-specific content
        return template["template"].format(
            concept=concept,
            concept1=context.get('concept1', ''),
            concept2=context.get('concept2', ''),
            task_description=context.get('task_description', ''),
            description_of_issue=context.get('description_of_issue', ''),
            improvement_goal=context.get('improvement_goal', '')
        )
```

## ⚙️ Difficulty Adjustment Algorithms

### Adaptive Difficulty System

```python
# src/core/difficulty_adjuster.py
class DifficultyAdjuster:
    def __init__(self):
        self.performance_history = {}
        self.adjustment_sensitivity = 0.2  # How quickly to adjust difficulty

    async def adjust_difficulty(self, user_id: str, recent_performance: List[AssessmentResult],
                              current_difficulty: DifficultyLevel) -> DifficultyLevel:
        """Adjust difficulty based on recent performance"""

        # Calculate performance metrics
        performance_score = self._calculate_performance_score(recent_performance)

        # Determine adjustment needed
        adjustment = self._calculate_adjustment(performance_score)

        # Apply adjustment to current difficulty
        new_difficulty = self._apply_adjustment(current_difficulty, adjustment)

        # Record adjustment for future analysis
        self._record_adjustment(user_id, current_difficulty, new_difficulty, performance_score)

        return new_difficulty

    def _calculate_performance_score(self, results: List[AssessmentResult]) -> float:
        """Calculate overall performance score from recent results"""

        if not results:
            return 0.5  # Neutral score

        # Weight factors
        accuracy_weight = 0.4
        speed_weight = 0.2
        hint_penalty_weight = 0.2
        confidence_weight = 0.2

        # Calculate components
        accuracy = sum(1 for r in results if r.is_correct) / len(results)
        avg_time = sum(r.time_taken for r in results) / len(results)
        hints_used = sum(r.hints_used for r in results) / len(results)
        avg_confidence = sum(r.confidence for r in results) / len(results)

        # Normalize and weight components
        accuracy_score = accuracy  # Already 0-1
        speed_score = max(0, 1 - (avg_time / 300))  # Normalize to 5 minutes max
        hint_score = max(0, 1 - hints_used)  # Fewer hints is better
        confidence_score = avg_confidence

        # Calculate weighted score
        performance_score = (
            accuracy_score * accuracy_weight +
            speed_score * speed_weight +
            hint_score * hint_penalty_weight +
            confidence_score * confidence_weight
        )

        return performance_score

    def _calculate_adjustment(self, performance_score: float) -> int:
        """Calculate difficulty adjustment based on performance"""

        if performance_score >= 0.85:
            return 1  # Increase difficulty
        elif performance_score <= 0.45:
            return -1  # Decrease difficulty
        else:
            return 0  # Maintain current difficulty

    def _apply_adjustment(self, current: DifficultyLevel, adjustment: int) -> DifficultyLevel:
        """Apply adjustment to current difficulty level"""

        new_level = current.value + adjustment

        # Ensure within bounds
        new_level = max(1, min(4, new_level))

        return DifficultyLevel(new_level)
```

### Personalized Learning Curve

```python
# src/core/learning_curve.py
class PersonalizedLearningCurve:
    def __init__(self):
        self.user_curves = {}  # Store individual learning curves

    async def get_optimal_difficulty(self, user_id: str, topic: str,
                                    target_mastery: float = 0.8) -> DifficultyLevel:
        """Get optimal difficulty for user to reach target mastery"""

        # Get user's learning curve for this topic
        learning_curve = await self._get_learning_curve(user_id, topic)

        # Predict optimal difficulty for target mastery
        optimal_difficulty = self._predict_optimal_difficulty(learning_curve, target_mastery)

        return optimal_difficulty

    async def update_learning_curve(self, user_id: str, topic: str,
                                  difficulty: DifficultyLevel, performance: float) -> None:
        """Update user's learning curve based on performance"""

        if user_id not in self.user_curves:
            self.user_curves[user_id] = {}

        if topic not in self.user_curves[user_id]:
            self.user_curves[user_id][topic] = []

        # Add data point
        self.user_curves[user_id][topic].append({
            'difficulty': difficulty.value,
            'performance': performance,
            'timestamp': datetime.now().isoformat()
        })

        # Keep only recent data (last 50 points)
        if len(self.user_curves[user_id][topic]) > 50:
            self.user_curves[user_id][topic] = self.user_curves[user_id][topic][-50:]

    def _predict_optimal_difficulty(self, learning_curve: List[Dict], target_mastery: float) -> DifficultyLevel:
        """Predict optimal difficulty to achieve target mastery"""

        if not learning_curve:
            return DifficultyLevel.INTERMEDIATE

        # Analyze performance patterns
        performance_by_difficulty = defaultdict(list)
        for point in learning_curve:
            performance_by_difficulty[point['difficulty']].append(point['performance'])

        # Find difficulty level closest to target performance
        best_difficulty = DifficultyLevel.INTERMEDIATE
        best_difference = float('inf')

        for difficulty, performances in performance_by_difficulty.items():
            avg_performance = sum(performances) / len(performances)
            difference = abs(avg_performance - target_mastery)

            if difference < best_difference:
                best_difference = difference
                best_difficulty = DifficultyLevel(difficulty)

        return best_difficulty
```

## 💬 Real-Time Feedback Systems

### Intelligent Feedback Generation

```python
# src/core/feedback_generator.py
class FeedbackGenerator:
    def __init__(self, ai_service):
        self.ai_service = ai_service
        self.feedback_templates = self._load_feedback_templates()

    async def generate_feedback(self, question: Question, user_answer: Any,
                              is_correct: bool, context: Dict[str, Any]) -> str:
        """Generate personalized feedback for user's answer"""

        if is_correct:
            return await self._generate_correct_feedback(question, user_answer, context)
        else:
            return await self._generate_incorrect_feedback(question, user_answer, context)

    async def _generate_correct_feedback(self, question: Question, user_answer: Any,
                                        context: Dict[str, Any]) -> str:
        """Generate feedback for correct answers"""

        # Get user's learning history
        improvement_areas = context.get('improvement_areas', [])
        learning_style = context.get('learning_style', 'balanced')

        prompt = f"""
        Generate encouraging and educational feedback for a correct answer.

        Question: {question.content}
        User's Answer: {user_answer}
        Question Type: {question.type.value}
        Topic: {question.topic}

        User Context:
        - Learning style: {learning_style}
        - Areas for improvement: {improvement_areas}
        - Recent performance: {context.get('recent_performance', 'unknown')}

        Requirements:
        1. Acknowledge the correct answer positively
        2. Provide additional insight or connection
        3. Suggest next step or related concept
        4. Keep concise but educational
        5. Match user's learning style

        Generate feedback (2-3 sentences):
        """

        response = await self.ai_service.generate_response(prompt)
        return response.content.strip()

    async def _generate_incorrect_feedback(self, question: Question, user_answer: Any,
                                         context: Dict[str, Any]) -> str:
        """Generate constructive feedback for incorrect answers"""

        # Analyze the incorrect answer
        error_pattern = await self._analyze_error_pattern(question, user_answer)

        prompt = f"""
        Generate constructive feedback for an incorrect answer.

        Question: {question.content}
        User's Answer: {user_answer}
        Correct Answer: {question.correct_answer}
        Question Type: {question.type.value}
        Topic: {question.topic}

        Error Analysis: {error_pattern}

        User Context:
        - Learning style: {context.get('learning_style', 'balanced')}
        - Common mistakes: {context.get('common_mistakes', [])}
        - Current difficulty: {context.get('current_difficulty', 'intermediate')}

        Requirements:
        1. Be encouraging and constructive
        2. Explain why the answer is incorrect
        3. Provide hint towards correct answer (don't give it away)
        4. Address the specific error pattern
        5. Suggest review material if needed

        Generate feedback (3-4 sentences):
        """

        response = await self.ai_service.generate_response(prompt)
        return response.content.strip()

    async def _analyze_error_pattern(self, question: Question, user_answer: Any) -> str:
        """Analyze the pattern of error in user's answer"""

        if question.type == QuestionType.MULTIPLE_CHOICE:
            return await self._analyze_multiple_choice_error(question, user_answer)
        elif question.type == QuestionType.CODING_CHALLENGE:
            return await self._analyze_coding_error(question, user_answer)
        else:
            return await self._analyze_theoretical_error(question, user_answer)

    async def _generate_progressive_hints(self, question: Question, hint_level: int) -> List[str]:
        """Generate progressive hints for a question"""

        hints = []

        if hint_level >= 1:
            # Level 1: General direction
            hints.append(f"💡 Hint 1: Think about the core concept of {question.topic}")

        if hint_level >= 2:
            # Level 2: More specific guidance
            hints.append(f"💡 Hint 2: Consider how {question.prerequisites[0] if question.prerequisites else 'fundamental principles'} relates to this problem")

        if hint_level >= 3:
            # Level 3: Strong hint (almost giving answer)
            hints.append(f"💡 Hint 3: Look for the key principle in the question's wording")

        return hints
```

## 📊 Performance Analytics Integration

### Comprehensive Assessment Analytics

```python
# src/core/assessment_analytics.py
class AssessmentAnalytics:
    def __init__(self, db_manager, knowledge_graph):
        self.db_manager = db_manager
        self.knowledge_graph = knowledge_graph

    async def generate_assessment_report(self, user_id: str, time_period: Dict[str, str]) -> Dict[str, Any]:
        """Generate comprehensive assessment performance report"""

        # Get assessment data
        assessment_data = await self._get_assessment_data(user_id, time_period)

        # Calculate key metrics
        metrics = await self._calculate_assessment_metrics(assessment_data)

        # Analyze learning trends
        trends = await self._analyze_learning_trends(assessment_data)

        # Identify strengths and weaknesses
        analysis = await self._analyze_strengths_weaknesses(assessment_data)

        # Generate recommendations
        recommendations = await self._generate_recommendations(metrics, trends, analysis)

        return {
            "summary": metrics,
            "trends": trends,
            "strengths_weaknesses": analysis,
            "recommendations": recommendations,
            "detailed_breakdown": await self._generate_detailed_breakdown(assessment_data)
        }

    async def _calculate_assessment_metrics(self, data: List[Dict]) -> Dict[str, Any]:
        """Calculate key assessment metrics"""

        if not data:
            return {"error": "No assessment data available"}

        total_assessments = len(data)
        correct_answers = sum(1 for d in data if d.get('is_correct', False))
        accuracy = correct_answers / total_assessments

        # Time metrics
        avg_time = sum(d.get('time_taken', 0) for d in data) / total_assessments
        total_time = sum(d.get('time_taken', 0) for d in data)

        # Difficulty distribution
        difficulty_distribution = defaultdict(int)
        for d in data:
            difficulty_distribution[d.get('difficulty', 'intermediate')] += 1

        # Topic performance
        topic_performance = defaultdict(lambda: {'correct': 0, 'total': 0})
        for d in data:
            topic = d.get('topic', 'unknown')
            topic_performance[topic]['total'] += 1
            if d.get('is_correct', False):
                topic_performance[topic]['correct'] += 1

        # Calculate topic accuracies
        topic_accuracies = {}
        for topic, stats in topic_performance.items():
            topic_accuracies[topic] = stats['correct'] / stats['total']

        return {
            "total_assessments": total_assessments,
            "accuracy": accuracy,
            "average_time_per_question": avg_time,
            "total_time_spent": total_time,
            "difficulty_distribution": dict(difficulty_distribution),
            "topic_performance": topic_accuracies,
            "improvement_rate": await self._calculate_improvement_rate(data)
        }

    async def _analyze_learning_trends(self, data: List[Dict]) -> Dict[str, Any]:
        """Analyze learning trends over time"""

        if len(data) < 2:
            return {"message": "Insufficient data for trend analysis"}

        # Sort by timestamp
        sorted_data = sorted(data, key=lambda x: x.get('timestamp', ''))

        # Calculate moving averages
        window_size = min(10, len(sorted_data) // 2)
        moving_averages = []

        for i in range(window_size, len(sorted_data)):
            window = sorted_data[i-window_size:i]
            accuracy = sum(1 for d in window if d.get('is_correct', False)) / len(window)
            moving_averages.append(accuracy)

        # Determine trend direction
        if len(moving_averages) >= 2:
            recent_avg = sum(moving_averages[-3:]) / min(3, len(moving_averages))
            earlier_avg = sum(moving_averages[:3]) / min(3, len(moving_averages[:3]))

            if recent_avg > earlier_avg + 0.05:
                trend_direction = "improving"
            elif recent_avg < earlier_avg - 0.05:
                trend_direction = "declining"
            else:
                trend_direction = "stable"
        else:
            trend_direction = "insufficient_data"

        return {
            "trend_direction": trend_direction,
            "moving_averages": moving_averages,
            "recent_performance": moving_averages[-1] if moving_averages else 0,
            "performance_velocity": self._calculate_performance_velocity(moving_averages)
        }
```

## 🎮 Interactive Quiz Implementation

### Complete Quiz Workflow

```python
# src/cli/commands/learning/quiz.py
class QuizCommand(BaseCommand):
    """Interactive quiz command with adaptive difficulty and real-time feedback"""

    def __init__(self):
        super().__init__()
        self.info = CommandInfo(
            name="quiz",
            description="Start an adaptive quiz on any topic",
            usage="/quiz [topic] [options]",
            aliases=["q", "test"],
            category="Learning"
        )
        self.assessment_engine = None  # Will be injected from context

    async def execute(self, args: List[str], context: Dict[str, Any]) -> CommandResult:
        """Execute interactive quiz session"""

        try:
            # Parse arguments
            topic = args[0] if args else None
            options = self._parse_options(args[1:]) if len(args) > 1 else {}

            # Get assessment engine from context
            self.assessment_engine = context.get("assessment_engine")
            if not self.assessment_engine:
                self.assessment_engine = await self._initialize_assessment_engine(context)

            # Start interactive quiz session
            quiz_results = await self._run_interactive_quiz(topic, options, context)

            # Display results and recommendations
            await self._display_quiz_results(quiz_results, context)

            return CommandResult(success=True, data=quiz_results)

        except Exception as e:
            return CommandResult(
                success=False,
                error=f"Failed to start quiz: {str(e)}"
            )

    async def _run_interactive_quiz(self, topic: str, options: Dict[str, Any],
                                   context: Dict[str, Any]) -> Dict[str, Any]:
        """Run interactive quiz session"""

        # Get user profile
        user_id = context.get("user_id", "default")
        user_profile = await self._get_user_profile(user_id)

        # Generate adaptive assessment
        questions = await self.assessment_engine.generate_assessment(
            topic or user_profile.get('current_topic', 'general'),
            user_profile
        )

        if not questions:
            self.cli_interface.display_error("No questions available for this topic")
            return {"error": "No questions available"}

        # Run quiz session
        quiz_session = QuizSession(
            questions=questions,
            user_profile=user_profile,
            options=options
        )

        results = await quiz_session.run(self.cli_interface, self.assessment_engine, context)

        return results

class QuizSession:
    def __init__(self, questions: List[Question], user_profile: Dict[str, Any], options: Dict[str, Any]):
        self.questions = questions
        self.user_profile = user_profile
        self.options = options
        self.current_question_index = 0
        self.results = []
        self.start_time = time.time()

    async def run(self, cli_interface, assessment_engine, context: Dict[str, Any]) -> Dict[str, Any]:
        """Run the interactive quiz session"""

        total_questions = len(self.questions)

        while self.current_question_index < total_questions:
            question = self.questions[self.current_question_index]

            # Display question
            await self._display_question(question, cli_interface)

            # Get user answer
            user_answer = await self._get_user_answer(question, cli_interface)

            if user_answer is None:  # User quit
                break

            # Evaluate answer
            question_start_time = time.time()
            time_taken = int(time.time() - question_start_time)

            answer_context = {
                **context,
                'time_taken': time_taken,
                'hints_used': getattr(self, '_hints_used', 0),
                'user_profile': self.user_profile
            }

            result = await assessment_engine.evaluate_answer(
                question, user_answer, answer_context
            )

            # Display feedback
            await self._display_feedback(result, cli_interface)

            # Store result
            self.results.append(result)

            # Move to next question
            self.current_question_index += 1

        # Calculate final results
        return await self._calculate_final_results()

    async def _display_question(self, question: Question, cli_interface) -> None:
        """Display question with rich formatting"""

        # Question header
        header = f"🎯 **Question {self.current_question_index + 1}/{len(self.questions)}**"
        if question.type == QuestionType.CODING_CHALLENGE:
            header += f" - 💻 Coding Challenge"
        header += f" - {question.difficulty.value.title()} Level"

        cli_interface.display_header(header)

        # Question content
        cli_interface.display_content(question.content)

        # Display options if multiple choice
        if question.type == QuestionType.MULTIPLE_CHOICE and question.options:
            for i, option in enumerate(question.options, 1):
                cli_interface.display_content(f"  {i}. {option}")

        # Display metadata
        metadata = [
            f"⏱️ Time: {question.estimated_time}s",
            f"🏆 Points: {question.points}",
            f"📚 Topic: {question.topic}"
        ]
        cli_interface.display_content(" | ".join(metadata))

        # Show hint availability
        cli_interface.display_content("💡 Type 'hint' for a clue (reduces points)")

    async def _get_user_answer(self, question: Question, cli_interface) -> Any:
        """Get user answer with validation"""

        while True:
            try:
                user_input = input("\nYour answer: ").strip()

                if user_input.lower() in ['quit', 'exit', 'q']:
                    return None

                if user_input.lower() == 'hint':
                    await self._provide_hint(question, cli_interface)
                    continue

                # Validate answer based on question type
                validated_answer = await self._validate_answer(question, user_input)
                if validated_answer is not None:
                    return validated_answer
                else:
                    cli_interface.display_error("Invalid answer format. Please try again.")

            except KeyboardInterrupt:
                return None

    async def _display_feedback(self, result: AssessmentResult, cli_interface) -> None:
        """Display feedback with rich formatting"""

        if result.is_correct:
            cli_interface.display_success("✅ Correct!")
        else:
            cli_interface.display_error("❌ Not quite right")

        # Display detailed feedback
        cli_interface.display_content(result.feedback)

        # Display learning insights
        if result.learning_insights:
            cli_interface.display_header("💡 Learning Insights:")
            for insight in result.learning_insights:
                cli_interface.display_content(f"  • {insight}")

        # Display performance metrics
        metrics = []
        if result.time_taken:
            metrics.append(f"⏱️ Time: {result.time_taken}s")
        if result.hints_used:
            metrics.append(f"💡 Hints: {result.hints_used}")
        if result.confidence:
            metrics.append(f"🎯 Confidence: {result.confidence*100:.0f}%")

        if metrics:
            cli_interface.display_content(" | ".join(metrics))

        # Pause before continuing
        input("\nPress Enter to continue...")
```

## 📋 Assessment Data Models

### Comprehensive Data Structures

```python
# src/data/models/assessment.py
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, JSON
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class AssessmentSession(Base):
    __tablename__ = 'assessment_sessions'

    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False)
    topic = Column(String, nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime)
    total_questions = Column(Integer, default=0)
    correct_answers = Column(Integer, default=0)
    total_time = Column(Integer, default=0)
    average_difficulty = Column(Float)
    session_data = Column(JSON)  # Store detailed session information

class QuestionResponse(Base):
    __tablename__ = 'question_responses'

    id = Column(String, primary_key=True)
    session_id = Column(String, nullable=False)
    question_id = Column(String, nullable=False)
    user_answer = Column(Text)
    is_correct = Column(Boolean, nullable=False)
    time_taken = Column(Integer, default=0)
    hints_used = Column(Integer, default=0)
    confidence = Column(Float)
    feedback = Column(Text)
    learning_insights = Column(JSON)
    response_timestamp = Column(DateTime, nullable=False)

class UserAssessmentProfile(Base):
    __tablename__ = 'user_assessment_profiles'

    user_id = Column(String, primary_key=True)
    topic = Column(String, primary_key=True)
    current_difficulty = Column(String, default='intermediate')
    mastery_level = Column(Float, default=0.0)
    total_assessments = Column(Integer, default=0)
    average_accuracy = Column(Float, default=0.0)
    improvement_rate = Column(Float, default=0.0)
    preferred_question_types = Column(JSON)
    weak_areas = Column(JSON)
    strong_areas = Column(JSON)
    last_updated = Column(DateTime)
    learning_curve_data = Column(JSON)  # Store performance over time
```

## 🧪 Testing Assessment Systems

### Comprehensive Testing Strategies

```python
# tests/unit/core/test_assessment_engine.py
class TestAssessmentEngine:
    @pytest.fixture
    def assessment_engine(self, mock_ai_service, mock_knowledge_graph, mock_db_manager):
        return AdvancedAssessmentEngine(mock_ai_service, mock_knowledge_graph, mock_db_manager)

    @pytest.fixture
    def sample_user_profile(self):
        return {
            'user_id': 'test_user',
            'learning_style': 'visual',
            'weak_areas': ['loops', 'recursion'],
            'mastered_concepts': ['variables', 'functions'],
            'preferred_difficulty': 'intermediate'
        }

    @pytest.mark.asyncio
    async def test_question_generation(self, assessment_engine, sample_user_profile):
        """Test AI-powered question generation"""

        questions = await assessment_engine.generate_assessment(
            'python_functions', sample_user_profile
        )

        assert len(questions) > 0
        assert all(q.topic == 'python_functions' for q in questions)
        assert all(q.difficulty.value in [1, 2, 3, 4] for q in questions)
        assert all(q.content for q in questions)

    @pytest.mark.asyncio
    async def test_answer_evaluation(self, assessment_engine):
        """Test answer evaluation and feedback generation"""

        question = Question(
            id='test_q1',
            type=QuestionType.MULTIPLE_CHOICE,
            content='What is the output of print(2 + 3)?',
            options=['5', '6', '23', 'Error'],
            correct_answer='5',
            explanation='2 + 3 equals 5 in Python',
            difficulty=DifficultyLevel.BEGINNER,
            topic='python_basics'
        )

        # Test correct answer
        result = await assessment_engine.evaluate_answer(
            question, '5', {'user_id': 'test_user'}
        )

        assert result.is_correct is True
        assert result.feedback
        assert result.confidence > 0.5

        # Test incorrect answer
        result = await assessment_engine.evaluate_answer(
            question, '6', {'user_id': 'test_user'}
        )

        assert result.is_correct is False
        assert result.feedback
        assert len(result.learning_insights) > 0

    @pytest.mark.asyncio
    async def test_difficulty_adjustment(self, assessment_engine):
        """Test adaptive difficulty adjustment"""

        # Test performance improvement
        good_performance = [
            AssessmentResult('q1', 'answer', True, 30, 0, 0.9, 'Great!', []),
            AssessmentResult('q2', 'answer', True, 25, 0, 0.95, 'Excellent!', []),
            AssessmentResult('q3', 'answer', True, 35, 1, 0.85, 'Good job!', [])
        ]

        new_difficulty = await assessment_engine.adjust_difficulty(
            'test_user', good_performance, DifficultyLevel.INTERMEDIATE
        )

        assert new_difficulty == DifficultyLevel.ADVANCED

        # Test performance decline
        poor_performance = [
            AssessmentResult('q1', 'answer', False, 60, 2, 0.3, 'Try again', []),
            AssessmentResult('q2', 'answer', False, 45, 1, 0.4, 'Not quite', []),
            AssessmentResult('q3', 'answer', True, 30, 1, 0.6, 'Better', [])
        ]

        new_difficulty = await assessment_engine.adjust_difficulty(
            'test_user', poor_performance, DifficultyLevel.INTERMEDIATE
        )

        assert new_difficulty == DifficultyLevel.BEGINNER

# tests/integration/test_assessment_integration.py
class TestAssessmentIntegration:
    @pytest.mark.asyncio
    async def test_complete_assessment_workflow(self, temp_workspace, mock_ai_service):
        """Test complete assessment workflow from start to finish"""

        # Setup
        db_manager = DatabaseManager(str(temp_workspace / "data.db"))
        knowledge_graph = KnowledgeGraph(db_manager)
        assessment_engine = AdvancedAssessmentEngine(mock_ai_service, knowledge_graph, db_manager)

        user_profile = {
            'user_id': 'integration_test_user',
            'current_topic': 'python_basics',
            'learning_style': 'balanced'
        }

        # Generate assessment
        questions = await assessment_engine.generate_assessment('python_basics', user_profile)
        assert len(questions) >= 3

        # Simulate user taking assessment
        results = []
        for question in questions[:3]:  # Take first 3 questions
            user_answer = '5' if question.correct_answer == '5' else 'wrong_answer'

            result = await assessment_engine.evaluate_answer(
                question, user_answer, {'user_id': user_profile['user_id']}
            )
            results.append(result)

        # Verify results
        assert len(results) == 3
        assert all(isinstance(r, AssessmentResult) for r in results)

        # Test difficulty adjustment
        initial_difficulty = DifficultyLevel.INTERMEDIATE
        new_difficulty = await assessment_engine.adjust_difficulty(
            user_profile['user_id'], results, initial_difficulty
        )

        assert isinstance(new_difficulty, DifficultyLevel)

        # Test performance analytics
        analytics = AssessmentAnalytics(db_manager, knowledge_graph)
        report = await analytics.generate_assessment_report(
            user_profile['user_id'],
            {'start': datetime.now().isoformat(), 'end': datetime.now().isoformat()}
        )

        assert 'summary' in report
        assert 'trends' in report
        assert 'recommendations' in report
```

---

*Last updated: October 8, 2025*
*Version: 2.0.0*
*See also: [Knowledge Systems Guide](knowledge-systems.md), [Interactive Features Guide](interactive-features.md), [User Examples](../../examples/basic-workflows.md)*