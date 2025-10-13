#!/usr/bin/env python3
"""
Demo script for Learning Catalyst Multi-Agent System.

This script demonstrates the capabilities of the new multi-agent AI system.
"""

import asyncio
import sys
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

async def demo_multi_agent():
    """Demonstrate the multi-agent system capabilities."""
    print("🚀 Learning Catalyst Multi-Agent System Demo")
    print("=" * 60)

    try:
        from src.ai.integration import AIIntegration
        from src.cli.commands import CommandProcessor
        from src.cli.state import CLIState
        from src.core.config import ConfigManager

        # Initialize the system
        print("\n📋 Initializing System...")
        ai = AIIntegration()
        session_id = await ai.start_session()
        config = ConfigManager()
        state = CLIState()
        state.ai_session_id = session_id
        processor = CommandProcessor()

        print(f"✅ Session started: {session_id[:8]}...")

        # Demo scenarios
        scenarios = [
            {
                "title": "🎓 Learning with Tutor Agent",
                "input": "Can you explain what recursion is in programming?",
                "expected_agent": "tutor"
            },
            {
                "title": "📝 Assessment with Assessment Agent",
                "input": "Quiz me on programming fundamentals",
                "expected_agent": "assessment"
            },
            {
                "title": "🎯 Recommendations with Recommendation Agent",
                "input": "What should I learn after understanding basics?",
                "expected_agent": "recommendation"
            },
            {
                "title": "💬 General Conversation",
                "input": "How are you doing today?",
                "expected_agent": "conversation"
            }
        ]

        print("\n🤖 Running Demo Scenarios...")
        print("-" * 60)

        for i, scenario in enumerate(scenarios, 1):
            print(f"\n{scenario['title']}")
            print(f"User: {scenario['input']}")

            # Process through AI system
            response = await ai.process_request(scenario['input'], session_id)

            print(f"Agent: {response['agent_type']} (confidence: {response['confidence']:.1%})")

            # Show first few lines of response
            response_preview = response['content'].split('\n')[:3]
            for line in response_preview:
                if line.strip():
                    print(f"       {line}")

            # Show tool usage
            if response.get('tool_results'):
                tools_used = [r['tool'] for r in response['tool_results'] if r['result']]
                if tools_used:
                    print(f"       🔧 Tools used: {', '.join(tools_used)}")

            print()

        # Show system capabilities
        print("📊 System Capabilities")
        print("-" * 30)
        agents = ai.get_available_agents()
        tools = ai.get_available_tools()

        print(f"🤖 Available Agents: {len(agents)}")
        for agent_type, info in agents.items():
            print(f"   • {agent_type.title()}: {len(info['capabilities'])} capabilities")

        print(f"\n🔧 Available Tools: {len(tools)}")
        for tool_name in tools.keys():
            print(f"   • {tool_name}")

        # Show session summary
        print("\n📈 Session Summary")
        print("-" * 20)
        session_info = await ai.get_session_info(session_id)
        print(f"Total Interactions: {session_info['interaction_count']}")
        print(f"Session Duration: {session_info['session_duration_minutes']} minutes")
        print(f"Topics Discussed: {', '.join(session_info['recent_topics'][-3:]) if session_info['recent_topics'] else 'None'}")

        if session_info['conversation_summary']['agent_usage']:
            print("Agent Usage:")
            for agent, count in session_info['conversation_summary']['agent_usage'].items():
                print(f"   • {agent}: {count} times")

        print("\n✨ Demo completed successfully!")
        print("\nTo use the system:")
        print("1. Run the CLI: python -m src.cli.main")
        print("2. Type messages directly (handled by AI agents)")
        print("3. Use /ai [message] for explicit AI interaction")
        print("4. Use /statistics to see learning progress")
        print("5. Use /help for all available commands")

    except Exception as e:
        print(f"❌ Demo failed: {e}")
        import traceback
        traceback.print_exc()
        return 1

    return 0

if __name__ == "__main__":
    exit_code = asyncio.run(demo_multi_agent())
    sys.exit(exit_code)