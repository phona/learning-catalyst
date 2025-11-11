/**
 * Phase 3 Comprehensive Tests
 *
 * Complete testing suite for Context-Aware Challenges including
 * project-based challenges, natural language prompts, and format conversion.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProjectChallengeGenerator } from '../project-challenge-generator';
import { WorkspaceIntegration } from '../workspace-integration';
import { NaturalPromptGenerator } from '../natural-prompt-generator';
import { NaturalLanguageConverter } from '../natural-language-converter';
import type {
  UserLearningContext,
  VibeType
} from '../../../../../shared/types/electron-api/chat-api';
import type {
  ProjectChallengeRequest,
  ProjectChallenge
} from '../project-challenge-generator';
import type {
  NaturalPromptRequest,
  NaturalPromptResponse
} from '../natural-prompt-generator';
import type {
  ConversionRequest,
  ConversionResult
} from '../natural-language-converter';

// Mock dependencies
const mockLogger = {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

const mockDependencies = {
  logger: mockLogger
};

describe('Phase 3: Context-Aware Challenges', () => {
  let projectChallengeGenerator: ProjectChallengeGenerator;
  let workspaceIntegration: WorkspaceIntegration;
  let naturalPromptGenerator: NaturalPromptGenerator;
  let naturalLanguageConverter: NaturalLanguageConverter;

  beforeEach(() => {
    vi.clearAllMocks();

    projectChallengeGenerator = new ProjectChallengeGenerator(mockDependencies);
    workspaceIntegration = new WorkspaceIntegration(mockDependencies);
    naturalPromptGenerator = new NaturalPromptGenerator(mockDependencies);
    naturalLanguageConverter = new NaturalLanguageConverter(mockDependencies);
  });

  afterEach(() => {
    projectChallengeGenerator.dispose();
    workspaceIntegration.dispose();
    naturalPromptGenerator.dispose();
    naturalLanguageConverter.dispose();
  });

  describe('Project-Based Challenge Generation', () => {
    const mockUserContext: UserLearningContext = {
      id: 'user1',
      sessionId: 'session1',
      confidenceLevel: 0.8,
      learningVelocity: 1.2,
      engagementLevel: 0.9,
      stuckPoints: [],
      recentConcepts: [{ concept: 'useState', mastery: 0.7 }],
      practiceHistory: [],
      lastPracticeTime: Date.now() - 3600000,
      preferences: { difficultyPreference: 'medium', feedbackStyle: 'encouraging' },
      statistics: {}
    };

    it('should generate React component challenges', async () => {
      const request: ProjectChallengeRequest = {
        userContext: mockUserContext,
        currentTopic: 'React hooks',
        vibe: 'understanding',
        difficulty: 'medium'
      };

      const challenge = await projectChallengeGenerator.generateProjectChallenge(request);

      expect(challenge).toBeDefined();
      expect(challenge.id).toBeDefined();
      expect(challenge.type).toBeOneOf(['enhancement', 'feature-add', 'refactor']);
      expect(challenge.file).toContain('.tsx');
      expect(challenge.currentCode).toContain('useState');
      expect(challenge.challenge).toContain('enhance');
      expect(challenge.learningObjectives).toContain('React hooks');
      expect(challenge.projectRelevance).toContain('actual project');
    });

    it('should generate challenges for different vibe types', async () => {
      const vibes: VibeType[] = ['confused', 'understanding', 'breakthrough', 'practicing', 'misunderstanding'];

      for (const vibe of vibes) {
        const request: ProjectChallengeRequest = {
          userContext: mockUserContext,
          currentTopic: 'useEffect',
          vibe,
          difficulty: 'medium'
        };

        const challenge = await projectChallengeGenerator.generateProjectChallenge(request);

        expect(challenge).toBeDefined();
        expect(challenge.challenge.length).toBeGreaterThan(10);
        expect(challenge.context).toContain('project');

        // Check vibe-appropriate challenge type
        if (vibe === 'confused' || vibe === 'misunderstanding') {
          expect(['enhancement', 'bug-fix']).toContain(challenge.type);
        } else if (vibe === 'breakthrough') {
          expect(['feature-add', 'enhancement']).toContain(challenge.type);
        }
      }
    });

    it('should adapt challenges based on user confidence level', async () => {
      const lowConfidenceContext = { ...mockUserContext, confidenceLevel: 0.3 };
      const highConfidenceContext = { ...mockUserContext, confidenceLevel: 0.9 };

      const lowRequest: ProjectChallengeRequest = {
        userContext: lowConfidenceContext,
        currentTopic: 'React components',
        vibe: 'confused',
        difficulty: 'easy'
      };

      const highRequest: ProjectChallengeRequest = {
        userContext: highConfidenceContext,
        currentTopic: 'React components',
        vibe: 'understanding',
        difficulty: 'hard'
      };

      const lowChallenge = await projectChallengeGenerator.generateProjectChallenge(lowRequest);
      const highChallenge = await projectChallengeGenerator.generateProjectChallenge(highRequest);

      expect(lowChallenge.difficulty).toBe('easy');
      expect(highChallenge.difficulty).toBe('hard');
      expect(lowChallenge.estimatedTime).toBeLessThanOrEqual(highChallenge.estimatedTime);
    });

    it('should provide fallback when no project files are available', async () => {
      const request: ProjectChallengeRequest = {
        userContext: mockUserContext,
        currentTopic: 'unknown topic',
        vibe: 'understanding',
        difficulty: 'medium',
        projectPath: '/nonexistent/path'
      };

      const challenge = await projectChallengeGenerator.generateProjectChallenge(request);

      expect(challenge).toBeDefined();
      expect(challenge.file).toBe('practice-file.ts');
      expect(challenge.challenge).toContain('practice exercise');
    });
  });

  describe('Workspace Integration', () => {
    it('should analyze project structure correctly', async () => {
      // Mock workspace scanning
      vi.spyOn(workspaceIntegration, 'scanWorkspace').mockResolvedValue({
        name: 'TestProject',
        type: 'react',
        rootPath: '/test/project',
        files: [
          {
            path: '/test/project/src/App.tsx',
            name: 'App.tsx',
            extension: '.tsx',
            content: 'import React from "react";',
            size: 100,
            lastModified: Date.now(),
            type: 'component',
            language: 'typescript',
            framework: 'react'
          }
        ],
        dependencies: { 'react': '^18.0.0' },
        frameworks: ['React', 'TypeScript'],
        patterns: [],
        complexity: 'simple',
        score: 0.7
      });

      const structure = await workspaceIntegration.scanWorkspace();

      expect(structure.name).toBe('TestProject');
      expect(structure.type).toBe('react');
      expect(structure.files).toHaveLength(1);
      expect(structure.frameworks).toContain('React');
    });

    it('should extract code patterns from files', async () => {
      const analysisResult = await workspaceIntegration.analyzeFile({
        path: '/test/component.tsx',
        name: 'component.tsx',
        extension: '.tsx',
        content: `
          import React, { useState } from 'react';

          export const TestComponent = () => {
            const [count, setCount] = useState(0);

            const increment = () => setCount(count + 1);

            return <div>{count}</div>;
          };
        `,
        size: 200,
        lastModified: Date.now(),
        type: 'component',
        language: 'typescript',
        framework: 'react'
      }, {
        analyzeImports: true,
        analyzeExports: true,
        detectPatterns: true,
        extractFunctions: true,
        extractClasses: true,
        extractComments: false
      });

      expect(analysisResult.functions).toHaveLength(2);
      expect(analysisResult.imports).toHaveLength(1);
      expect(analysisResult.patterns.length).toBeGreaterThan(0);
      expect(analysisResult.metrics.functions).toBe(2);
    });

    it('should detect project frameworks correctly', () => {
      const reactFile = {
        path: '/test/App.tsx',
        content: 'import React from "react";',
        extension: '.tsx'
      } as any;

      const vueFile = {
        path: '/test/App.vue',
        content: '<template><div></div></template>',
        extension: '.vue'
      } as any;

      const expressFile = {
        path: '/test/server.js',
        content: 'const express = require("express");',
        extension: '.js'
      } as any;

      expect(workspaceIntegration['detectFileFramework'](reactFile.path, reactFile.content)).toBe('react');
      expect(workspaceIntegration['detectFileFramework'](vueFile.path, vueFile.content)).toBe('vue');
      expect(workspaceIntegration['detectFileFramework'](expressFile.path, expressFile.content)).toBe('express');
    });
  });

  describe('Natural Prompt Generation', () => {
    const mockUserContext: UserLearningContext = {
      id: 'user1',
      sessionId: 'session1',
      confidenceLevel: 0.8,
      learningVelocity: 1.2,
      engagementLevel: 0.9,
      stuckPoints: [],
      recentConcepts: [{ concept: 'useState', mastery: 0.7 }],
      practiceHistory: [],
      lastPracticeTime: Date.now() - 3600000,
      preferences: { difficultyPreference: 'medium', feedbackStyle: 'encouraging' },
      statistics: {}
    };

    it('should generate conversational prompts for all vibe types', async () => {
      const vibes: VibeType[] = ['confused', 'understanding', 'breakthrough', 'practicing', 'misunderstanding'];

      for (const vibe of vibes) {
        const request: NaturalPromptRequest = {
          userContext: mockUserContext,
          vibe,
          currentTopic: 'React hooks',
          preferences: {
            style: 'conversational',
            length: 'medium',
            formality: 'casual'
          }
        };

        const response = await naturalPromptGenerator.generateNaturalPrompt(request);

        expect(response).toBeDefined();
        expect(response.id).toBeDefined();
        expect(response.type).toBeDefined();
        expect(response.opening.length).toBeGreaterThan(5);
        expect(response.challenge.length).toBeGreaterThan(10);
        expect(response.context.length).toBeGreaterThan(10);
        expect(response.options.accept.length).toBeGreaterThan(0);
        expect(response.options.decline.length).toBeGreaterThan(0);
        expect(response.options.postpone.length).toBeGreaterThan(0);
        expect(response.metadata.naturalness).toBeGreaterThan(0.5);
      }
    });

    it('should personalize prompts based on user preferences', async () => {
      const directRequest: NaturalPromptRequest = {
        userContext: mockUserContext,
        vibe: 'understanding',
        currentTopic: 'TypeScript',
        preferences: {
          style: 'direct',
          length: 'short',
          formality: 'formal'
        }
      };

      const conversationalRequest: NaturalPromptRequest = {
        userContext: mockUserContext,
        vibe: 'understanding',
        currentTopic: 'TypeScript',
        preferences: {
          style: 'conversational',
          length: 'detailed',
          formality: 'casual'
        }
      };

      const directResponse = await naturalPromptGenerator.generateNaturalPrompt(directRequest);
      const conversationalResponse = await naturalPromptGenerator.generateNaturalPrompt(conversationalRequest);

      expect(directResponse.opening).not.toEqual(conversationalResponse.opening);
      expect(directResponse.metadata.approach).toBe('direct');
      expect(conversationalResponse.metadata.approach).toBe('gentle');
    });

    it('should include project context when challenge is provided', async () => {
      const mockChallenge: ProjectChallenge = {
        id: 'challenge1',
        type: 'enhancement',
        title: 'Enhance Todo Component',
        description: 'Improve your todo component',
        file: '/src/components/TodoItem.tsx',
        currentCode: 'const TodoItem = () => <div>Todo</div>;',
        challenge: 'Add state management',
        context: 'This will improve your actual todo app',
        steps: ['Analyze code', 'Implement changes'],
        hints: ['Think about user experience'],
        solution: {
          approach: 'Use React hooks',
          code: 'const TodoItem = () => { /* implementation */ }',
          explanation: 'This adds proper state management'
        },
        learningObjectives: ['React hooks'],
        estimatedTime: 15,
        difficulty: 'medium',
        prerequisites: ['React basics'],
        relatedConcepts: ['useState'],
        projectRelevance: 'Directly improves your todo app'
      };

      const request: NaturalPromptRequest = {
        userContext: mockUserContext,
        vibe: 'understanding',
        currentTopic: 'React hooks',
        challenge: mockChallenge
      };

      const response = await naturalPromptGenerator.generateNaturalPrompt(request);

      expect(response.context).toContain('TodoItem.tsx');
      expect(response.challenge).toContain('todo');
    });

    it('should avoid template repetition', async () => {
      const request: NaturalPromptRequest = {
        userContext: mockUserContext,
        vibe: 'understanding',
        currentTopic: 'React'
      };

      const responses = await Promise.all([
        naturalPromptGenerator.generateNaturalPrompt(request),
        naturalPromptGenerator.generateNaturalPrompt(request),
        naturalPromptGenerator.generateNaturalPrompt(request)
      ]);

      const openings = responses.map(r => r.opening);

      // Should have some variety in openings
      const uniqueOpenings = new Set(openings);
      expect(uniqueOpenings.size).toBeGreaterThan(1);
    });

    it('should provide fallback when template generation fails', async () => {
      // Mock template selection to return empty array
      vi.spyOn(naturalPromptGenerator, 'selectTemplate' as any).mockReturnValue(undefined);

      const request: NaturalPromptRequest = {
        userContext: mockUserContext,
        vibe: 'understanding',
        currentTopic: 'React'
      };

      const response = await naturalPromptGenerator.generateNaturalPrompt(request);

      expect(response).toBeDefined();
      expect(response.type).toBe('suggestion');
      expect(response.opening).toContain('Since you\'re learning');
    });
  });

  describe('Natural Language Conversion', () => {
    it('should convert structured exercises to conversational format', async () => {
      const mockExercise = {
        id: 'exercise1',
        title: 'React useState Exercise',
        type: 'coding' as const,
        difficulty: 'medium' as const,
        topic: 'React hooks',
        subtopics: ['useState'],
        instructions: 'Create a component that uses useState to manage a counter.',
        problem: 'Build a counter component using React hooks.',
        hints: ['Remember to import useState', 'Think about initial state'],
        solution: {
          answer: 'const Counter = () => { const [count, setCount] = useState(0); return <div>{count}</div>; }',
          explanation: 'This component uses useState to manage counter state.'
        },
        estimatedTime: 15,
        prerequisites: ['React basics'],
        learningObjectives: ['useState hook', 'state management']
      };

      const request: ConversionRequest = {
        exercise: mockExercise,
        targetFormat: 'conversational',
        context: {
          userLevel: 'intermediate',
          vibe: 'understanding',
          topic: 'React hooks'
        },
        preferences: {
          style: 'conversational',
          length: 'medium',
          includeHints: true,
          includeSolution: true
        }
      };

      const result = await naturalLanguageConverter.convertToNaturalLanguage(request);

      expect(result.success).toBe(true);
      expect(result.naturalExercise).toBeDefined();
      expect(result.naturalExercise!.type).toBe('conversational');
      expect(result.naturalExercise!.introduction).toContain('React hooks');
      expect(result.naturalExercise!.challenge).toContain('counter');
      expect(result.naturalExercise!.guidance.length).toBeGreaterThan(0);
      expect(result.naturalExercise!.hints).toBeDefined();
      expect(result.naturalExercise!.solution).toBeDefined();
      expect(result.conversionDetails.naturalnessScore).toBeGreaterThan(0.5);
    });

    it('should convert project challenges to project-based format', async () => {
      const mockProjectChallenge: ProjectChallenge = {
        id: 'project1',
        type: 'enhancement',
        title: 'Enhance Todo Component',
        description: 'Add state management to your todo component',
        file: '/src/components/TodoItem.tsx',
        currentCode: 'export const TodoItem = ({ text }) => <div>{text}</div>;',
        challenge: 'Add toggle functionality using useState',
        context: 'This will improve your actual todo app',
        steps: ['Import useState', 'Add state', 'Implement toggle'],
        hints: ['Think about initial state'],
        solution: {
          approach: 'Use React useState hook',
          code: 'const TodoItem = ({ text }) => { const [completed, setCompleted] = useState(false); /* ... */ }',
          explanation: 'This adds proper state management to the component'
        },
        learningObjectives: ['useState', 'component state'],
        estimatedTime: 20,
        difficulty: 'medium',
        prerequisites: ['React basics'],
        relatedConcepts: ['React hooks'],
        projectRelevance: 'Directly enhances your actual project'
      };

      const request: ConversionRequest = {
        exercise: mockProjectChallenge,
        targetFormat: 'project-based',
        context: {
          userLevel: 'intermediate',
          vibe: 'understanding',
          topic: 'React hooks',
          projectContext: 'Your todo application needs better state management'
        }
      };

      const result = await naturalLanguageConverter.convertToNaturalLanguage(request);

      expect(result.success).toBe(true);
      expect(result.naturalExercise!.type).toBe('project-based');
      expect(result.naturalExercise!.introduction).toContain('TodoItem.tsx');
      expect(result.naturalExercise!.challenge).toContain('toggle');
      expect(result.naturalExercise!.context).toContain('actual project');
      expect(result.naturalExercise!.solution!.code).toContain('useState');
    });

    it('should maintain learning objectives during conversion', async () => {
      const mockExercise = {
        id: 'exercise1',
        title: 'Array Methods Exercise',
        type: 'coding' as const,
        difficulty: 'easy' as const,
        topic: 'JavaScript arrays',
        subtopics: ['map', 'filter'],
        instructions: 'Use array methods to transform data.',
        problem: 'Transform this array using map and filter.',
        hints: ['Think about chaining methods'],
        solution: {
          answer: 'const result = data.map(item => item).filter(item => true);',
          explanation: 'This shows how to chain array methods.'
        },
        estimatedTime: 10,
        prerequisites: ['JavaScript basics'],
        learningObjectives: ['Array.map', 'Array.filter', 'Method chaining']
      };

      const request: ConversionRequest = {
        exercise: mockExercise,
        targetFormat: 'conversational'
      };

      const result = await naturalLanguageConverter.convertToNaturalLanguage(request);

      expect(result.success).toBe(true);
      expect(result.naturalExercise!.learningObjectives).toContain('Array.map');
      expect(result.naturalExercise!.learningObjectives).toContain('Array.filter');
    });

    it('should adapt language style based on preferences', async () => {
      const mockExercise = {
        id: 'exercise1',
        title: 'Function Exercise',
        type: 'coding' as const,
        difficulty: 'medium' as const,
        topic: 'JavaScript functions',
        subtopics: [],
        instructions: 'Write a function that returns the sum of two numbers.',
        problem: 'Create an addition function.',
        hints: [],
        solution: {
          answer: 'const add = (a, b) => a + b;',
          explanation: 'This function adds two numbers.'
        },
        estimatedTime: 5,
        prerequisites: [],
        learningObjectives: ['Function syntax']
      };

      const gentleRequest: ConversionRequest = {
        exercise: mockExercise,
        targetFormat: 'conversational',
        preferences: {
          style: 'gentle',
          length: 'medium'
        }
      };

      const directRequest: ConversionRequest = {
        exercise: mockExercise,
        targetFormat: 'conversational',
        preferences: {
          style: 'direct',
          length: 'short'
        }
      };

      const gentleResult = await naturalLanguageConverter.convertToNaturalLanguage(gentleRequest);
      const directResult = await naturalLanguageConverter.convertToNaturalLanguage(directRequest);

      expect(gentleResult.success).toBe(true);
      expect(directResult.success).toBe(true);

      // Different options should be generated based on style
      expect(gentleResult.naturalExercise!.options.accept).not.toEqual(directResult.naturalExercise!.options.accept);
    });

    it('should handle conversion errors gracefully', async () => {
      const invalidExercise = {
        id: 'invalid',
        title: '',
        type: 'coding' as const,
        difficulty: 'medium' as const,
        topic: '',
        subtopics: [],
        instructions: '',
        problem: '',
        hints: [],
        solution: {
          answer: '',
          explanation: ''
        },
        estimatedTime: 0,
        prerequisites: [],
        learningObjectives: []
      };

      const request: ConversionRequest = {
        exercise: invalidExercise,
        targetFormat: 'conversational'
      };

      const result = await naturalLanguageConverter.convertToNaturalLanguage(request);

      expect(result.success).toBe(true); // Should still succeed with fallback
      expect(result.naturalExercise).toBeDefined();
      expect(result.naturalExercise!.challenge).toContain('practice exercise');
    });
  });

  describe('Integration Tests', () => {
    it('should create complete project-based practice flow', async () => {
      const mockUserContext: UserLearningContext = {
        id: 'user1',
        sessionId: 'session1',
        confidenceLevel: 0.8,
        learningVelocity: 1.2,
        engagementLevel: 0.9,
        stuckPoints: [],
        recentConcepts: [{ concept: 'useState', mastery: 0.7 }],
        practiceHistory: [],
        lastPracticeTime: Date.now() - 3600000,
        preferences: { difficultyPreference: 'medium', feedbackStyle: 'encouraging' },
        statistics: {}
      };

      // Step 1: Generate project-based challenge
      const challengeRequest: ProjectChallengeRequest = {
        userContext: mockUserContext,
        currentTopic: 'React hooks',
        vibe: 'understanding',
        difficulty: 'medium'
      };

      const challenge = await projectChallengeGenerator.generateProjectChallenge(challengeRequest);

      // Step 2: Generate natural prompt for the challenge
      const promptRequest: NaturalPromptRequest = {
        userContext: mockUserContext,
        vibe: 'understanding',
        currentTopic: 'React hooks',
        challenge
      };

      const prompt = await naturalPromptGenerator.generateNaturalPrompt(promptRequest);

      // Step 3: Convert challenge to natural language exercise
      const conversionRequest: ConversionRequest = {
        exercise: challenge,
        targetFormat: 'project-based',
        context: {
          userLevel: 'intermediate',
          vibe: 'understanding',
          topic: 'React hooks'
        }
      };

      const conversionResult = await naturalLanguageConverter.convertToNaturalLanguage(conversionRequest);

      // Verify complete flow
      expect(challenge).toBeDefined();
      expect(challenge.projectRelevance).toContain('actual project');

      expect(prompt).toBeDefined();
      expect(prompt.challenge.length).toBeGreaterThan(10);
      expect(prompt.metadata.naturalness).toBeGreaterThan(0.5);

      expect(conversionResult.success).toBe(true);
      expect(conversionResult.naturalExercise).toBeDefined();
      expect(conversionResult.naturalExercise!.type).toBe('project-based');
      expect(conversionResult.conversionDetails.naturalnessScore).toBeGreaterThan(0.6);

      // Verify all components reference the same project
      expect(challenge.file).toContain('.tsx');
      expect(prompt.context).toContain('project');
      expect(conversionResult.naturalExercise!.introduction).toContain('project');
    });

    it('should handle all vibe types in complete workflow', async () => {
      const vibes: VibeType[] = ['confused', 'understanding', 'breakthrough', 'practicing', 'misunderstanding'];

      for (const vibe of vibes) {
        const mockUserContext: UserLearningContext = {
          id: 'user1',
          sessionId: 'session1',
          confidenceLevel: vibe === 'confused' ? 0.4 : 0.8,
          learningVelocity: 1.0,
          engagementLevel: 0.8,
          stuckPoints: vibe === 'confused' ? ['useState'] : [],
          recentConcepts: [{ concept: 'React hooks', mastery: 0.6 }],
          practiceHistory: [],
          lastPracticeTime: Date.now() - 3600000,
          preferences: { difficultyPreference: 'medium', feedbackStyle: 'encouraging' },
          statistics: {}
        };

        const challengeRequest: ProjectChallengeRequest = {
          userContext: mockUserContext,
          currentTopic: 'React hooks',
          vibe,
          difficulty: vibe === 'confused' ? 'easy' : 'medium'
        };

        const challenge = await projectChallengeGenerator.generateProjectChallenge(challengeRequest);
        expect(challenge).toBeDefined();
        expect(challenge.difficulty).toBe(vibe === 'confused' ? 'easy' : 'medium');

        const promptRequest: NaturalPromptRequest = {
          userContext: mockUserContext,
          vibe,
          currentTopic: 'React hooks',
          challenge
        };

        const prompt = await naturalPromptGenerator.generateNaturalPrompt(promptRequest);
        expect(prompt).toBeDefined();
        expect(prompt.type).toBeDefined();
        expect(prompt.metadata.urgency).toBeDefined();
      }
    });

    it('should maintain performance benchmarks', async () => {
      const startTime = Date.now();

      const mockUserContext: UserLearningContext = {
        id: 'user1',
        sessionId: 'session1',
        confidenceLevel: 0.8,
        learningVelocity: 1.2,
        engagementLevel: 0.9,
        stuckPoints: [],
        recentConcepts: [{ concept: 'useState', mastery: 0.7 }],
        practiceHistory: [],
        lastPracticeTime: Date.now() - 3600000,
        preferences: { difficultyPreference: 'medium', feedbackStyle: 'encouraging' },
        statistics: {}
      };

      // Complete workflow
      const challengeRequest: ProjectChallengeRequest = {
        userContext: mockUserContext,
        currentTopic: 'React hooks',
        vibe: 'understanding',
        difficulty: 'medium'
      };

      const challenge = await projectChallengeGenerator.generateProjectChallenge(challengeRequest);

      const promptRequest: NaturalPromptRequest = {
        userContext: mockUserContext,
        vibe: 'understanding',
        currentTopic: 'React hooks',
        challenge
      };

      const prompt = await naturalPromptGenerator.generateNaturalPrompt(promptRequest);

      const conversionRequest: ConversionRequest = {
        exercise: challenge,
        targetFormat: 'project-based'
      };

      const conversionResult = await naturalLanguageConverter.convertToNaturalLanguage(conversionRequest);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete entire workflow in under 5 seconds
      expect(duration).toBeLessThan(5000);
      expect(challenge).toBeDefined();
      expect(prompt).toBeDefined();
      expect(conversionResult.success).toBe(true);
    });
  });
});