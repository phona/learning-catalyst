"""
Suggest command implementation - AI-driven learning suggestions
"""

import asyncio
from typing import Any, Dict, List

from src.cli.commands.base import BaseCommand, CommandCategory, CommandInfo, CommandResult


class SuggestCommand(BaseCommand):
    """AI-driven learning suggestions command implementation"""

    def get_info(self) -> CommandInfo:
        return CommandInfo(
            name="suggest",
            description="Get AI-driven learning suggestions based on your progress and goals",
            aliases=["recommend", "suggestion"],
            category=CommandCategory.LEARNING.value,
            usage="/suggest [type] [--focus <area>] [--difficulty <level>]",
        )

    async def execute(self, args: List[str], context: Dict[str, Any]) -> CommandResult:
        """Execute the suggest command with AI-driven recommendations"""
        try:
            user_id = context.get("user_id", "default_user")
            db_manager = context.get("db_manager")
            model_service = context.get("model_service")

            if not db_manager or not model_service:
                return CommandResult(
                    success=False,
                    message="❌ Database or AI service not available for suggestions."
                )

            # Parse arguments
            suggestion_type = "general"  # Default
            focus_area = None
            difficulty = None
            count = 5  # Default number of suggestions

            i = 0
            while i < len(args):
                arg = args[i]
                if arg in ["--type", "-t"] and i + 1 < len(args):
                    suggestion_type = args[i + 1]
                    i += 2
                elif arg in ["--focus", "-f"] and i + 1 < len(args):
                    focus_area = args[i + 1]
                    i += 2
                elif arg in ["--difficulty", "-d"] and i + 1 < len(args):
                    difficulty = args[i + 1]
                    i += 2
                elif arg in ["--count", "-c"] and i + 1 < len(args):
                    try:
                        count = int(args[i + 1])
                    except ValueError:
                        return CommandResult(
                            success=False,
                            message="❌ Count must be a number."
                        )
                    i += 2
                else:
                    # If it's not a flag, treat it as suggestion type
                    if not arg.startswith("-"):
                        suggestion_type = arg
                    i += 1

            # Generate suggestions based on type
            if suggestion_type in ["concepts", "topics", "concept"]:
                suggestions = await self._suggest_concepts(user_id, db_manager, model_service, focus_area, difficulty, count)
            elif suggestion_type in ["learning", "study", "path"]:
                suggestions = await self._suggest_learning_path(user_id, db_manager, model_service, focus_area, difficulty)
            elif suggestion_type in ["review", "practice", "reinforce"]:
                suggestions = await self._suggest_review_topics(user_id, db_manager, model_service, count)
            elif suggestion_type in ["goals", "objectives"]:
                suggestions = await self._suggest_goals(user_id, db_manager, model_service)
            elif suggestion_type in ["resources", "materials"]:
                suggestions = await self._suggest_resources(user_id, db_manager, model_service, focus_area, count)
            elif suggestion_type in ["time", "schedule", "planning"]:
                suggestions = await self._suggest_time_management(user_id, db_manager, model_service)
            else:
                # General suggestions
                suggestions = await self._suggest_general(user_id, db_manager, model_service, count)

            if not suggestions:
                return CommandResult(
                    success=True,
                    message="🤔 No specific suggestions available at the moment. Try learning some concepts first!"
                )

            # Format suggestions
            formatted_suggestions = self._format_suggestions(suggestions, suggestion_type)

            return CommandResult(
                success=True,
                message=formatted_suggestions
            )

        except Exception as e:
            return CommandResult(
                success=False,
                message=f"❌ Error generating suggestions: {str(e)}"
            )

    async def _suggest_concepts(self, user_id: str, db_manager, model_service,
                              focus_area: str, difficulty: str, count: int) -> List[Dict[str, Any]]:
        """Suggest concepts to learn based on user progress"""
        try:
            # Get user's current progress
            user_progress = await self._get_user_progress(user_id, db_manager)
            completed_concepts = {p.get("concept_id") for p in user_progress if p.get("score", 0) >= 0.8}

            # Get all available concepts
            all_concepts = await db_manager.get_all_concepts()

            # Filter concepts based on prerequisites met
            ready_concepts = []
            for concept in all_concepts:
                if concept["id"] not in completed_concepts:
                    prerequisites_met = all(prereq in completed_concepts for prereq in concept.get("prerequisites", []))
                    if prerequisites_met:
                        # Apply additional filters
                        if focus_area and focus_area.lower() not in concept["title"].lower():
                            continue
                        if difficulty and concept.get("difficulty_level", 1) != self._difficulty_to_level(difficulty):
                            continue

                        ready_concepts.append(concept)

            # If no ready concepts, suggest prerequisites
            if not ready_concepts:
                # Find concepts with unmet prerequisites
                blocked_concepts = []
                for concept in all_concepts:
                    if concept["id"] not in completed_concepts:
                        unmet_prereqs = [prereq for prereq in concept.get("prerequisites", []) if prereq not in completed_concepts]
                        if unmet_prereqs:
                            blocked_concepts.append({
                                "concept": concept,
                                "missing_prereqs": unmet_prereqs
                            })

                # Suggest the most needed prerequisites
                from collections import Counter
                prereq_counts = Counter()
                for blocked in blocked_concepts:
                    for prereq in blocked["missing_prereqs"]:
                        prereq_counts[prereq] += 1

                # Get prerequisite concepts details
                suggested_prereqs = []
                for prereq_id, _ in prereq_counts.most_common(count):
                    prereq_concept = next((c for c in all_concepts if c["id"] == prereq_id), None)
                    if prereq_concept:
                        suggested_prereqs.append({
                            "type": "prerequisite",
                            "concept": prereq_concept,
                            "reason": f"Needed for {len([b for b in blocked_concepts if prereq_id in b['missing_prereqs']])} concepts",
                            "priority": "high"
                        })

                return suggested_prereqs

            # Sort ready concepts by priority and difficulty
            ready_concepts.sort(key=lambda x: (x.get("difficulty_level", 1), x["title"]))

            # Generate AI-enhanced suggestions
            suggestions = []
            for i, concept in enumerate(ready_concepts[:count]):
                # Get user's competency profile
                profile = await self._get_competency_profile(user_id, db_manager)

                # Generate personalized suggestion
                suggestion_prompt = f"""
                Based on this user profile:
                - Completed concepts: {list(completed_concepts)}
                - Current skills: {profile.get('skills', {})}
                - Learning style: {profile.get('learning_style', 'unknown')}

                Suggest why they should learn: {concept['title']}
                Content: {concept['content'][:200]}...
                Difficulty: {concept.get('difficulty_level', 1)}

                Provide a brief, motivating reason and suggest the best approach.
                """

                ai_suggestion = await model_service.generate_response(suggestion_prompt)

                suggestions.append({
                    "type": "concept",
                    "concept": concept,
                    "reason": ai_suggestion[:200] + "..." if len(ai_suggestion) > 200 else ai_suggestion,
                    "priority": "medium" if i < 2 else "low",
                    "estimated_time": self._estimate_concept_time(concept)
                })

            return suggestions

        except Exception as e:
            print(f"Error suggesting concepts: {e}")
            return []

    async def _suggest_learning_path(self, user_id: str, db_manager, model_service,
                                   focus_area: str, difficulty: str) -> List[Dict[str, Any]]:
        """Suggest a learning path based on user goals and current progress"""
        try:
            # Get user's current state
            user_progress = await self._get_user_progress(user_id, db_manager)
            completed_concepts = {p.get("concept_id") for p in user_progress if p.get("score", 0) >= 0.8}

            # Generate learning path prompt
            path_prompt = f"""
            Create a personalized learning path for a user who has completed: {list(completed_concepts)}

            Focus area: {focus_area or 'general'}
            Difficulty preference: {difficulty or 'adaptive'}

            Suggest 5-7 concepts in a logical order, explaining:
            1. Why each concept is important
            2. How it builds on previous knowledge
            3. What they'll be able to do after learning it

            Format as a JSON-like structure with concept_id, title, reason, and estimated_time.
            """

            ai_response = await model_service.generate_response(path_prompt)

            # Parse AI response into structured suggestions
            suggestions = self._parse_learning_path_response(ai_response, db_manager)

            return suggestions[:7]  # Limit to 7 concepts

        except Exception as e:
            print(f"Error suggesting learning path: {e}")
            return []

    async def _suggest_review_topics(self, user_id: str, db_manager, model_service, count: int) -> List[Dict[str, Any]]:
        """Suggest topics for review based on performance and time since last study"""
        try:
            # Get user's performance data
            user_progress = await self._get_user_progress(user_id, db_manager)

            # Find concepts that need review
            review_candidates = []

            for progress in user_progress:
                concept_id = progress.get("concept_id")
                score = progress.get("score", 0)
                last_studied = progress.get("last_studied")

                # Calculate review priority
                review_priority = 0

                # Low performance score increases priority
                if score < 0.7:
                    review_priority += (0.7 - score) * 2

                # Time since last study increases priority
                if last_studied:
                    days_since = (datetime.now() - datetime.fromisoformat(last_studied)).days
                    if days_since > 7:  # More than a week
                        review_priority += min(days_since / 30, 1.0)  # Cap at 1.0

                # Difficulty level affects priority
                concept = await db_manager.get_concept(concept_id)
                if concept:
                    difficulty = concept.get("difficulty_level", 1)
                    review_priority += difficulty * 0.1

                if review_priority > 0.3:  # Only include if priority is significant
                    review_candidates.append({
                        "concept_id": concept_id,
                        "concept": concept,
                        "current_score": score,
                        "last_studied": last_studied,
                        "review_priority": review_priority
                    })

            # Sort by review priority
            review_candidates.sort(key=lambda x: x["review_priority"], reverse=True)

            # Generate review suggestions
            suggestions = []
            for candidate in review_candidates[:count]:
                concept = candidate["concept"]

                # Generate personalized review suggestion
                review_prompt = f"""
                User needs to review: {concept['title']}
                Current mastery: {candidate['current_score']:.1%}
                Last studied: {candidate['last_studied'] or 'Never'}

                Suggest the best way to review this concept for better retention.
                Include specific review techniques and practice suggestions.
                """

                ai_suggestion = await model_service.generate_response(review_prompt)

                suggestions.append({
                    "type": "review",
                    "concept": concept,
                    "current_mastery": candidate['current_score'],
                    "reason": ai_suggestion[:200] + "..." if len(ai_suggestion) > 200 else ai_suggestion,
                    "priority": "high" if candidate["review_priority"] > 0.7 else "medium",
                    "last_studied": candidate["last_studied"]
                })

            return suggestions

        except Exception as e:
            print(f"Error suggesting review topics: {e}")
            return []

    async def _suggest_goals(self, user_id: str, db_manager, model_service) -> List[Dict[str, Any]]:
        """Suggest learning goals based on user progress and interests"""
        try:
            # Get user's current state
            user_progress = await self._get_user_progress(user_id, db_manager)
            competency_profile = await self._get_competency_profile(user_id, db_manager)

            # Generate goal suggestions
            goal_prompt = f"""
            Based on this user's learning profile:
            - Current progress: {len([p for p in user_progress if p.get('score', 0) >= 0.8])} concepts mastered
            - Skills: {competency_profile.get('skills', {})}
            - Learning style: {competency_profile.get('learning_style', 'unknown')}
            - Strengths: {competency_profile.get('strengths', [])}
            - Weaknesses: {competency_profile.get('weaknesses', [])}

            Suggest 3-5 specific, achievable learning goals that would:
            1. Build on their current strengths
            2. Address their weaknesses
            3. Be appropriate for their learning style
            4. Include measurable outcomes

            Format each goal with: title, description, expected_outcome, and estimated_timeframe.
            """

            ai_response = await model_service.generate_response(goal_prompt)

            # Parse AI response into structured goals
            suggestions = self._parse_goals_response(ai_response)

            return suggestions

        except Exception as e:
            print(f"Error suggesting goals: {e}")
            return []

    async def _suggest_resources(self, user_id: str, db_manager, model_service,
                               focus_area: str, count: int) -> List[Dict[str, Any]]:
        """Suggest learning resources based on user's current topics"""
        try:
            # Get user's current or recent concepts
            user_progress = await self._get_user_progress(user_id, db_manager)
            recent_concepts = [p.get("concept_id") for p in user_progress[-5:]]  # Last 5 concepts

            if not recent_concepts:
                return [{
                    "type": "resource",
                    "title": "Getting Started Resources",
                    "description": "Start with basic concepts and build your foundation.",
                    "resources": [
                        {"type": "tutorial", "name": "Introduction to the topic", "url": "#"},
                        {"type": "video", "name": "Beginner's guide", "url": "#"},
                        {"type": "practice", "name": "Basic exercises", "url": "#"}
                    ],
                    "priority": "medium"
                }]

            # Generate resource suggestions
            resource_prompt = f"""
            User is currently learning about these concepts: {recent_concepts}
            Focus area: {focus_area or 'general'}

            Suggest specific learning resources for each concept, including:
            - Tutorials or articles
            - Video content
            - Practice exercises
            - Projects or applications

            Provide {count} high-quality, specific resource recommendations.
            """

            ai_response = await model_service.generate_response(resource_prompt)

            # Parse AI response into structured resources
            suggestions = self._parse_resources_response(ai_response)

            return suggestions

        except Exception as e:
            print(f"Error suggesting resources: {e}")
            return []

    async def _suggest_time_management(self, user_id: str, db_manager, model_service) -> List[Dict[str, Any]]:
        """Suggest time management and study scheduling strategies"""
        try:
            # Get user's learning patterns
            user_progress = await self._get_user_progress(user_id, db_manager)

            # Analyze learning patterns
            total_concepts = len(user_progress)
            avg_study_time = self._calculate_average_study_time(user_progress)
            preferred_difficulty = self._calculate_preferred_difficulty(user_progress)

            # Generate time management suggestions
            time_prompt = f"""
            User's learning patterns:
            - Total concepts studied: {total_concepts}
            - Average study time per session: {avg_study_time} minutes
            - Preferred difficulty: {preferred_difficulty}

            Suggest personalized time management strategies including:
            1. Optimal study session length
            2. Best times of day for learning
            3. Spaced repetition schedule
            4. Break recommendations
            5. Weekly learning schedule

            Focus on consistency and long-term retention.
            """

            ai_response = await model_service.generate_response(time_prompt)

            # Parse into structured suggestions
            suggestions = self._parse_time_management_response(ai_response)

            return suggestions

        except Exception as e:
            print(f"Error suggesting time management: {e}")
            return []

    async def _suggest_general(self, user_id: str, db_manager, model_service, count: int) -> List[Dict[str, Any]]:
        """Generate general learning suggestions"""
        try:
            # Get user's current state
            user_progress = await self._get_user_progress(user_id, db_manager)
            competency_profile = await self._get_competency_profile(user_id, db_manager)

            # Generate general suggestions
            general_prompt = f"""
            Provide personalized learning suggestions for this user:
            - Concepts mastered: {len([p for p in user_progress if p.get('score', 0) >= 0.8])}
            - Current progress: {len(user_progress)} concepts attempted
            - Skills profile: {competency_profile.get('skills', {})}
            - Learning style: {competency_profile.get('learning_style', 'unknown')}

            Suggest {count} specific, actionable learning recommendations that could include:
            - New concepts to explore
            - Review topics
            - Study techniques
            - Learning goals
            - Resource recommendations

            Make suggestions personalized and motivating.
            """

            ai_response = await model_service.generate_response(general_prompt)

            # Parse into structured suggestions
            suggestions = self._parse_general_response(ai_response)

            return suggestions

        except Exception as e:
            print(f"Error generating general suggestions: {e}")
            return []

    def _format_suggestions(self, suggestions: List[Dict[str, Any]], suggestion_type: str) -> str:
        """Format suggestions for display"""
        if not suggestions:
            return "🤔 No suggestions available at the moment."

        lines = [f"💡 {suggestion_type.title()} Learning Suggestions"]
        lines.append("─" * 50)

        for i, suggestion in enumerate(suggestions, 1):
            lines.append(f"\n{i}. {suggestion.get('title', suggestion.get('concept', {}).get('title', 'Suggestion'))}")

            if suggestion.get('type') == 'concept':
                concept = suggestion.get('concept', {})
                lines.append(f"   📚 Difficulty: {concept.get('difficulty_level', 'Unknown')}")
                lines.append(f"   ⏱️  Estimated time: {suggestion.get('estimated_time', '15-30 minutes')}")

            elif suggestion.get('type') == 'review':
                lines.append(f"   📊 Current mastery: {suggestion.get('current_mastery', 0):.1%}")
                if suggestion.get('last_studied'):
                    lines.append(f"   📅 Last studied: {suggestion['last_studied'][:10]}")

            if suggestion.get('reason'):
                lines.append(f"   💭 {suggestion['reason']}")

            # Add priority indicator
            priority = suggestion.get('priority', 'medium')
            priority_emoji = {"high": "🔥", "medium": "⭐", "low": "💫"}.get(priority, "⭐")
            lines.append(f"   {priority_emoji} Priority: {priority.title()}")

        lines.append(f"\n💪 Tip: Focus on high-priority suggestions first for best results!")
        lines.append("Use /suggest with specific parameters for more targeted recommendations.")

        return "\n".join(lines)

    def _difficulty_to_level(self, difficulty: str) -> int:
        """Convert difficulty string to numeric level"""
        difficulty_map = {
            "beginner": 1, "easy": 1, "basic": 1,
            "intermediate": 3, "medium": 3,
            "advanced": 5, "hard": 5, "expert": 5
        }
        return difficulty_map.get(difficulty.lower(), 3)

    def _estimate_concept_time(self, concept: Dict[str, Any]) -> str:
        """Estimate time needed to learn a concept"""
        difficulty = concept.get("difficulty_level", 1)
        content_length = len(concept.get("content", ""))

        # Base time by difficulty
        base_times = {1: "15-30", 2: "20-40", 3: "30-45", 4: "45-60", 5: "60-90"}
        base_time = base_times.get(difficulty, "30-45")

        # Adjust based on content length
        if content_length > 2000:
            return f"{int(base_time.split('-')[0]) * 1.5}-{int(base_time.split('-')[1]) * 1.5:.0f} minutes"
        elif content_length < 500:
            return f"{int(base_time.split('-')[0]) * 0.7}-{int(base_time.split('-')[1]) * 0.7:.0f} minutes"

        return f"{base_time} minutes"

    # Helper methods for getting user data
    async def _get_user_progress(self, user_id: str, db_manager) -> List[Dict[str, Any]]:
        """Get user's learning progress"""
        try:
            return await db_manager.get_user_progress(user_id)
        except:
            return []

    async def _get_competency_profile(self, user_id: str, db_manager) -> Dict[str, Any]:
        """Get user's competency profile"""
        try:
            return await db_manager.get_competency_profile(user_id)
        except:
            return {}

    def _calculate_average_study_time(self, user_progress: List[Dict[str, Any]]) -> float:
        """Calculate average study time from progress data"""
        if not user_progress:
            return 25.0  # Default estimate

        # This would come from actual time tracking data
        # For now, return an estimate based on typical study patterns
        return 30.0

    def _calculate_preferred_difficulty(self, user_progress: List[Dict[str, Any]]) -> str:
        """Calculate user's preferred difficulty level"""
        if not user_progress:
            return "intermediate"

        # This would analyze actual performance by difficulty
        # For now, return based on recent performance
        return "intermediate"

    # Parsing methods for AI responses
    def _parse_learning_path_response(self, ai_response: str, db_manager) -> List[Dict[str, Any]]:
        """Parse AI learning path response into structured format"""
        # Simplified parsing - in production, you'd use more sophisticated parsing
        return [
            {
                "type": "learning_path",
                "step": i + 1,
                "concept_id": f"concept_{i+1}",
                "title": f"Learning Step {i+1}",
                "reason": ai_response[:100] + "..." if len(ai_response) > 100 else ai_response,
                "estimated_time": "30-45 minutes",
                "priority": "high" if i < 3 else "medium"
            }
            for i in range(5)  # Generate 5 steps as example
        ]

    def _parse_goals_response(self, ai_response: str) -> List[Dict[str, Any]]:
        """Parse AI goals response into structured format"""
        return [
            {
                "type": "goal",
                "title": f"Learning Goal {i+1}",
                "description": ai_response[:100] + "..." if len(ai_response) > 100 else ai_response,
                "expected_outcome": "Improved understanding and skills",
                "estimated_timeframe": f"{(i+1)*2} weeks",
                "priority": "high" if i < 2 else "medium"
            }
            for i in range(3)
        ]

    def _parse_resources_response(self, ai_response: str) -> List[Dict[str, Any]]:
        """Parse AI resources response into structured format"""
        return [
            {
                "type": "resource",
                "title": f"Learning Resource {i+1}",
                "description": ai_response[:100] + "..." if len(ai_response) > 100 else ai_response,
                "resources": [
                    {"type": "article", "name": f"Article {i+1}", "url": "#"},
                    {"type": "video", "name": f"Video {i+1}", "url": "#"}
                ],
                "priority": "medium"
            }
            for i in range(3)
        ]

    def _parse_time_management_response(self, ai_response: str) -> List[Dict[str, Any]]:
        """Parse AI time management response into structured format"""
        return [
            {
                "type": "time_management",
                "title": f"Study Strategy {i+1}",
                "description": ai_response[:100] + "..." if len(ai_response) > 100 else ai_response,
                "implementation": "Start tomorrow and track your progress",
                "priority": "high" if i < 2 else "medium"
            }
            for i in range(3)
        ]

    def _parse_general_response(self, ai_response: str) -> List[Dict[str, Any]]:
        """Parse AI general response into structured format"""
        return [
            {
                "type": "general",
                "title": f"Learning Tip {i+1}",
                "description": ai_response[:100] + "..." if len(ai_response) > 100 else ai_response,
                "actionable_step": "Apply this in your next study session",
                "priority": "medium"
            }
            for i in range(5)
        ]