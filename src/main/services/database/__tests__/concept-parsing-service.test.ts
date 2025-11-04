/**
 * Concept Parsing Service Tests
 *
 * Comprehensive test suite for ConceptParsingService with TDD approach.
 * Tests concept extraction, AI integration, file processing, batch operations,
 * error handling, and performance requirements.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ConceptParsingService } from '@/main/services/ConceptParsingService'
import { DatabaseMocks } from '@/test/utils/mocks/mock-database'
import type {
  Concept,
  ProposedRelationship,
  ParsingJob,
  FileParsingRequest,
  ParsingResult,
  ParsingStatistics
} from '@/shared/types/concept-parsing'

describe('ConceptParsingService', () => {
  let conceptParsingService: ConceptParsingService
  let mockAgentManager: any
  let mockConfigService: any
  let mockWindowAPI: any

  beforeEach(() => {
    // Reset all mocks
    DatabaseMocks.Database._resetMocks()
    vi.clearAllMocks()

    // Create mock dependencies
    mockAgentManager = {
      getProviderInfo: vi.fn(),
      generateSessionTitle: vi.fn()
    }

    mockConfigService = {
      getConfig: vi.fn()
    }

    // Mock window.electronAPI
    mockWindowAPI = {
      readDirectory: vi.fn(),
      existsFile: vi.fn(),
      readFile: vi.fn()
    }
    global.window = { electronAPI: mockWindowAPI } as any

    // Create service instance
    conceptParsingService = new ConceptParsingService(mockAgentManager, mockConfigService)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Service Initialization', () => {
    it('should initialize with required dependencies', () => {
      expect(conceptParsingService).toBeInstanceOf(ConceptParsingService)
    })

    it('should have default parsing options', () => {
      const service = conceptParsingService as any
      expect(service.DEFAULT_OPTIONS).toEqual({
        confidenceThreshold: 0.6,
        maxConceptsPerFile: 50,
        includeRelationships: true,
        extractLearningPaths: true,
        extractAssessments: false
      })
    })
  })

  describe('File Parsing Operations', () => {
    it('should create parsing job for local files', async () => {
      // Arrange
      const request: FileParsingRequest = {
        filePaths: ['file1.md', 'file2.md'],
        directoryPaths: ['/test/dir'],
        options: {
          confidenceThreshold: 0.7,
          maxConceptsPerFile: 30,
          includeRelationships: true
        },
        userId: 'test-user'
      }

      mockAgentManager.getProviderInfo.mockResolvedValue({
        type: 'openai',
        model: 'gpt-4'
      })

      mockConfigService.getConfig.mockResolvedValue({
        ai: {
          model_types: {
            chat: {
              default_provider: 'openai',
              default_model: 'gpt-4',
              settings: {
                temperature: 0.7,
                max_tokens: 2000
              },
              capabilities: {
                thinking: false
              }
            }
          },
          providers: {
            openai: {
              apiKey: 'test-key',
              baseUrl: 'https://api.openai.com'
            }
          }
        }
      })

      mockWindowAPI.readDirectory.mockResolvedValue([
        {
          path: '/test/dir/file3.md',
          isFile: true,
          isMarkdown: true
        }
      ])

      mockWindowAPI.existsFile.mockResolvedValue(true)
      mockWindowAPI.readFile.mockResolvedValue('# Test Concept\n\nThis is a test concept with important information.')

      // Act
      const job = await conceptParsingService.parseLocalFiles(request)

      // Assert
      expect(job).toBeDefined()
      expect(job.id).toMatch(/^job-\d+-[a-z0-9]+$/)
      expect(job.status).toBe('pending')
      expect(job.progress).toBe(0)
      expect(job.materialId).toMatch(/^discovery-\d+$/)
    })

    it('should handle empty file list', async () => {
      // Arrange
      const request: FileParsingRequest = {
        filePaths: [],
        directoryPaths: [],
        options: {
          confidenceThreshold: 0.6,
          maxConceptsPerFile: 50,
          includeRelationships: true
        },
        userId: 'test-user'
      }

      mockAgentManager.getProviderInfo.mockResolvedValue({
        type: 'openai',
        model: 'gpt-4'
      })

      mockConfigService.getConfig.mockResolvedValue({
        ai: {
          model_types: {
            chat: {
              default_provider: 'openai',
              default_model: 'gpt-4',
              settings: { temperature: 0.7, max_tokens: 2000 },
              capabilities: { thinking: false }
            }
          }
        }
      })

      // Act & Assert
      await expect(conceptParsingService.parseLocalFiles(request)).rejects.toThrow('No valid markdown files found')
    })

    it('should collect files from directories', async () => {
      // Arrange
      const request: FileParsingRequest = {
        filePaths: ['file1.md'],
        directoryPaths: ['/test/dir1', '/test/dir2'],
        options: {
          confidenceThreshold: 0.6,
          maxConceptsPerFile: 50,
          includeRelationships: true
        },
        userId: 'test-user'
      }

      mockAgentManager.getProviderInfo.mockResolvedValue({
        type: 'openai',
        model: 'gpt-4'
      })

      mockConfigService.getConfig.mockResolvedValue({
        ai: {
          model_types: {
            chat: {
              default_provider: 'openai',
              default_model: 'gpt-4',
              settings: { temperature: 0.7, max_tokens: 2000 },
              capabilities: { thinking: false }
            }
          }
        }
      })

      mockWindowAPI.readDirectory.mockImplementation((dirPath: string) => {
        if (dirPath === '/test/dir1') {
          return Promise.resolve([
            { path: '/test/dir1/file2.md', isFile: true, isMarkdown: true },
            { path: '/test/dir1/file3.txt', isFile: true, isMarkdown: false }
          ])
        }
        if (dirPath === '/test/dir2') {
          return Promise.resolve([
            { path: '/test/dir2/file4.md', isFile: true, isMarkdown: true }
          ])
        }
        return Promise.resolve([])
      })

      mockWindowAPI.existsFile.mockResolvedValue(true)
      mockWindowAPI.readFile.mockResolvedValue('# Test Content')

      // Act
      const job = await conceptParsingService.parseLocalFiles(request)

      // Assert
      expect(mockWindowAPI.readDirectory).toHaveBeenCalledTimes(2)
      expect(job).toBeDefined()
    })

    it('should handle directory read errors', async () => {
      // Arrange
      const request: FileParsingRequest = {
        filePaths: [],
        directoryPaths: ['/nonexistent/dir'],
        options: {
          confidenceThreshold: 0.6,
          maxConceptsPerFile: 50,
          includeRelationships: true
        },
        userId: 'test-user'
      }

      mockAgentManager.getProviderInfo.mockResolvedValue({
        type: 'openai',
        model: 'gpt-4'
      })

      mockConfigService.getConfig.mockResolvedValue({
        ai: {
          model_types: {
            chat: {
              default_provider: 'openai',
              default_model: 'gpt-4',
              settings: { temperature: 0.7, max_tokens: 2000 },
              capabilities: { thinking: false }
            }
          }
        }
      })

      mockWindowAPI.readDirectory.mockRejectedValue(new Error('Permission denied'))

      // Act & Assert
      await expect(conceptParsingService.parseLocalFiles(request)).rejects.toThrow('Failed to scan directory /nonexistent/dir: Permission denied')
    })
  })

  describe('Job Management Operations', () => {
    it('should track active parsing jobs', async () => {
      // Arrange
      const request: FileParsingRequest = {
        filePaths: ['file1.md'],
        directoryPaths: [],
        options: {
          confidenceThreshold: 0.6,
          maxConceptsPerFile: 50,
          includeRelationships: true
        },
        userId: 'test-user'
      }

      mockAgentManager.getProviderInfo.mockResolvedValue({
        type: 'openai',
        model: 'gpt-4'
      })

      mockConfigService.getConfig.mockResolvedValue({
        ai: {
          model_types: {
            chat: {
              default_provider: 'openai',
              default_model: 'gpt-4',
              settings: { temperature: 0.7, max_tokens: 2000 },
              capabilities: { thinking: false }
            }
          }
        }
      })

      mockWindowAPI.existsFile.mockResolvedValue(true)
      mockWindowAPI.readFile.mockResolvedValue('# Test Concept')

      // Act
      const job1 = await conceptParsingService.parseLocalFiles(request)
      const job2 = await conceptParsingService.parseLocalFiles(request)

      const activeJobs = conceptParsingService.getActiveJobs()

      // Assert
      expect(activeJobs).toHaveLength(2)
      expect(activeJobs.map(job => job.id)).toContain(job1.id)
      expect(activeJobs.map(job => job.id)).toContain(job2.id)
    })

    it('should get job status by ID', async () => {
      // Arrange
      const request: FileParsingRequest = {
        filePaths: ['file1.md'],
        directoryPaths: [],
        options: {
          confidenceThreshold: 0.6,
          maxConceptsPerFile: 50,
          includeRelationships: true
        },
        userId: 'test-user'
      }

      mockAgentManager.getProviderInfo.mockResolvedValue({
        type: 'openai',
        model: 'gpt-4'
      })

      mockConfigService.getConfig.mockResolvedValue({
        ai: {
          model_types: {
            chat: {
              default_provider: 'openai',
              default_model: 'gpt-4',
              settings: { temperature: 0.7, max_tokens: 2000 },
              capabilities: { thinking: false }
            }
          }
        }
      })

      mockWindowAPI.existsFile.mockResolvedValue(true)
      mockWindowAPI.readFile.mockResolvedValue('# Test Concept')

      // Act
      const job = await conceptParsingService.parseLocalFiles(request)
      const jobStatus = conceptParsingService.getJobStatus(job.id)

      // Assert
      expect(jobStatus).toBeDefined()
      expect(jobStatus!.id).toBe(job.id)
      expect(jobStatus!.status).toBe('pending')
    })

    it('should return undefined for non-existent job', () => {
      // Act
      const jobStatus = conceptParsingService.getJobStatus('nonexistent-job')

      // Assert
      expect(jobStatus).toBeUndefined()
    })

    it('should cancel parsing job', async () => {
      // Arrange
      const request: FileParsingRequest = {
        filePaths: ['file1.md'],
        directoryPaths: [],
        options: {
          confidenceThreshold: 0.6,
          maxConceptsPerFile: 50,
          includeRelationships: true
        },
        userId: 'test-user'
      }

      mockAgentManager.getProviderInfo.mockResolvedValue({
        type: 'openai',
        model: 'gpt-4'
      })

      mockConfigService.getConfig.mockResolvedValue({
        ai: {
          model_types: {
            chat: {
              default_provider: 'openai',
              default_model: 'gpt-4',
              settings: { temperature: 0.7, max_tokens: 2000 },
              capabilities: { thinking: false }
            }
          }
        }
      })

      mockWindowAPI.existsFile.mockResolvedValue(true)
      mockWindowAPI.readFile.mockResolvedValue('# Test Concept')

      // Act
      const job = await conceptParsingService.parseLocalFiles(request)
      const cancelled = conceptParsingService.cancelJob(job.id)

      // Assert
      expect(cancelled).toBe(true)

      const jobStatus = conceptParsingService.getJobStatus(job.id)
      expect(jobStatus!.status).toBe('failed')
      expect(jobStatus!.errorMessage).toBe('Job cancelled by user')
    })

    it('should return false when cancelling completed job', async () => {
      // Arrange
      const request: FileParsingRequest = {
        filePaths: ['file1.md'],
        directoryPaths: [],
        options: {
          confidenceThreshold: 0.6,
          maxConceptsPerFile: 50,
          includeRelationships: true
        },
        userId: 'test-user'
      }

      mockAgentManager.getProviderInfo.mockResolvedValue({
        type: 'openai',
        model: 'gpt-4'
      })

      mockConfigService.getConfig.mockResolvedValue({
        ai: {
          model_types: {
            chat: {
              default_provider: 'openai',
              default_model: 'gpt-4',
              settings: { temperature: 0.7, max_tokens: 2000 },
              capabilities: { thinking: false }
            }
          }
        }
      })

      mockWindowAPI.existsFile.mockResolvedValue(true)
      mockWindowAPI.readFile.mockResolvedValue('# Test Concept')

      // Act
      const job = await conceptParsingService.parseLocalFiles(request)

      // Manually set job as completed
      const jobStatus = conceptParsingService.getJobStatus(job.id)
      if (jobStatus) {
        jobStatus.status = 'completed'
      }

      const cancelled = conceptParsingService.cancelJob(job.id)

      // Assert
      expect(cancelled).toBe(false)
    })
  })

  describe('File Validation Operations', () => {
    it('should validate files with markdown content', async () => {
      // Arrange
      const markdownContent = `
# React Hooks

React Hooks are functions that let you use state and other React features in functional components.

## useState Hook

The \`useState\` hook allows you to add state to functional components.

\`\`\`javascript
const [count, setCount] = useState(0);
\`\`\`

## useEffect Hook

The \`useEffect\` hook lets you perform side effects in functional components.
      `.trim()

      mockWindowAPI.existsFile.mockResolvedValue(true)
      mockWindowAPI.readFile.mockResolvedValue(markdownContent)

      // Create a private method to test file validation
      const service = conceptParsingService as any

      // Act
      const validFiles = await service.preValidateFiles(['test.md'])

      // Assert
      expect(validFiles).toHaveLength(1)
      expect(validFiles[0]).toBe('test.md')
    })

    it('should reject files without markdown patterns', async () => {
      // Arrange
      const plainTextContent = 'This is just plain text without any markdown formatting.'

      mockWindowAPI.existsFile.mockResolvedValue(true)
      mockWindowAPI.readFile.mockResolvedValue(plainTextContent)

      const service = conceptParsingService as any

      // Act
      const validFiles = await service.preValidateFiles(['test.txt'])

      // Assert
      expect(validFiles).toHaveLength(0)
    })

    it('should reject empty files', async () => {
      // Arrange
      mockWindowAPI.existsFile.mockResolvedValue(true)
      mockWindowAPI.readFile.mockResolvedValue('')

      const service = conceptParsingService as any

      // Act
      const validFiles = await service.preValidateFiles(['empty.md'])

      // Assert
      expect(validFiles).toHaveLength(0)
    })

    it('should reject files that are too small', async () => {
      // Arrange
      mockWindowAPI.existsFile.mockResolvedValue(true)
      mockWindowAPI.readFile.mockResolvedValue('# Hi') // Too small

      const service = conceptParsingService as any

      // Act
      const validFiles = await service.preValidateFiles(['small.md'])

      // Assert
      expect(validFiles).toHaveLength(0)
    })

    it('should reject files that are too large', async () => {
      // Arrange
      const largeContent = '# Large File\n\n' + 'x'.repeat(200000) // Over 100KB

      mockWindowAPI.existsFile.mockResolvedValue(true)
      mockWindowAPI.readFile.mockResolvedValue(largeContent)

      const service = conceptParsingService as any

      // Act
      const validFiles = await service.preValidateFiles(['large.md'])

      // Assert
      expect(validFiles).toHaveLength(0)
    })

    it('should handle file read errors gracefully', async () => {
      // Arrange
      mockWindowAPI.existsFile.mockResolvedValue(true)
      mockWindowAPI.readFile.mockRejectedValue(new Error('Permission denied'))

      const service = conceptParsingService as any

      // Act
      const validFiles = await service.preValidateFiles(['protected.md'])

      // Assert
      expect(validFiles).toHaveLength(0)
    })

    it('should detect markdown patterns correctly', () => {
      // Arrange
      const service = conceptParsingService as any

      // Test various markdown patterns
      expect(service.containsMarkdownPatterns('# Header')).toBe(true)
      expect(service.containsMarkdownPatterns('## Subheader')).toBe(true)
      expect(service.containsMarkdownContent('`code`')).toBe(true)
      expect(service.containsMarkdownContent('```javascript\ncode\n```')).toBe(true)
      expect(service.containsMarkdownContent('- List item')).toBe(true)
      expect(service.containsMarkdownContent('* Bold text *')).toBe(true)
      expect(service.containsMarkdownContent('[link](url)')).toBe(true)
      expect(service.containsMarkdownContent('| Col1 | Col2 |')).toBe(true)
      expect(service.containsMarkdownContent('Plain text')).toBe(false)
    })
  })

  describe('AI Provider Integration', () => {
    it('should initialize AI provider successfully', async () => {
      // Arrange
      const service = conceptParsingService as any
      const options = {
        confidenceThreshold: 0.7,
        maxConceptsPerFile: 30,
        includeRelationships: true
      }

      mockAgentManager.getProviderInfo.mockResolvedValue({
        type: 'openai',
        model: 'gpt-4'
      })

      mockConfigService.getConfig.mockResolvedValue({
        ai: {
          model_types: {
            chat: {
              default_provider: 'openai',
              default_model: 'gpt-4',
              settings: {
                temperature: 0.7,
                max_tokens: 2000
              },
              capabilities: {
                thinking: false
              }
            }
          },
          providers: {
            openai: {
              apiKey: 'test-key',
              baseUrl: 'https://api.openai.com'
            }
          }
        }
      })

      // Mock ModelFactory
      const mockModelFactory = {
        createModel: vi.fn().mockReturnValue({
          type: 'openai',
          model: 'gpt-4'
        })
      }

      // Act & Assert
      await expect(service.initializePipeline(options)).resolves.not.toThrow()
      expect(service.pipeline).toBeDefined()
    })

    it('should handle missing AI provider', async () => {
      // Arrange
      const service = conceptParsingService as any
      const options = {
        confidenceThreshold: 0.7,
        maxConceptsPerFile: 30,
        includeRelationships: true
      }

      mockAgentManager.getProviderInfo.mockResolvedValue(null)

      // Act & Assert
      await expect(service.initializePipeline(options)).rejects.toThrow('AI provider not initialized')
    })

    it('should handle AI provider initialization error', async () => {
      // Arrange
      const service = conceptParsingService as any
      const options = {
        confidenceThreshold: 0.7,
        maxConceptsPerFile: 30,
        includeRelationships: true
      }

      mockAgentManager.getProviderInfo.mockRejectedValue(new Error('API key invalid'))

      // Act & Assert
      await expect(service.initializePipeline(options)).rejects.toThrow()
    })
  })

  describe('Concept Processing and Results', () => {
    it('should process file batch successfully', async () => {
      // Arrange
      const service = conceptParsingService as any
      const filePaths = ['file1.md', 'file2.md']
      const options = {
        confidenceThreshold: 0.7,
        maxConceptsPerFile: 30,
        includeRelationships: true
      }

      // Mock successful file parsing
      const mockParseResult: ParsingResult = {
        concepts: [
          {
            id: 'concept1',
            name: 'React Hooks',
            type: 'concept',
            description: 'Functions for using state in functional components',
            difficulty: 3,
            confidence: 0.9,
            evidence: [
              {
                text: 'useState allows you to add state',
                source: 'file1.md',
                type: 'definition',
                confidence: 0.9
              }
            ]
          }
        ],
        relationships: [
          {
            id: 'rel1',
            sourceConceptId: 'concept1',
            targetConceptId: 'concept2',
            type: 'related',
            strength: 0.8,
            description: 'Related concepts'
          }
        ],
        learningPath: undefined,
        assessments: [],
        statistics: {
          totalConcepts: 1,
          validConcepts: 1,
          totalRelationships: 1,
          confidenceDistribution: { high: 1, medium: 0, low: 0 },
          difficultyDistribution: { 1: 0, 2: 0, 3: 1, 4: 0, 5: 0 },
          typeDistribution: { concept: 1 },
          processingTime: 1000,
          modelUsage: { 'AI': 1 }
        },
        errors: []
      }

      service.parseSingleFile = vi.fn().mockResolvedValue(mockParseResult)

      // Act
      const results = await service.processFileBatch(filePaths, options)

      // Assert
      expect(results).toHaveLength(2)
      expect(results[0].success).toBe(true)
      expect(results[0].concepts).toHaveLength(1)
      expect(results[0].relationships).toHaveLength(1)
      expect(results[0].processingTime).toBeGreaterThan(0)
    })

    it('should handle parsing errors in batch', async () => {
      // Arrange
      const service = conceptParsingService as any
      const filePaths = ['file1.md', 'invalid.md']
      const options = {
        confidenceThreshold: 0.7,
        maxConceptsPerFile: 30,
        includeRelationships: true
      }

      service.parseSingleFile = vi.fn().mockImplementation((filePath: string) => {
        if (filePath === 'invalid.md') {
          throw new Error('Invalid file format')
        }
        return {
          concepts: [],
          relationships: [],
          learningPath: undefined,
          assessments: [],
          statistics: {},
          errors: []
        }
      })

      // Act
      const results = await service.processFileBatch(filePaths, options)

      // Assert
      expect(results).toHaveLength(2)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(false)
      expect(results[1].errors).toHaveLength(1)
      expect(results[1].errors[0]).toBe('Invalid file format')
    })

    it('should deduplicate concepts correctly', () => {
      // Arrange
      const service = conceptParsingService as any
      const concepts: Concept[] = [
        {
          id: 'concept1',
          name: 'React Hooks',
          type: 'concept',
          description: 'Functions for state management',
          difficulty: 3,
          confidence: 0.8,
          evidence: []
        },
        {
          id: 'concept2',
          name: 'react hooks', // Same name, different case
          type: 'concept',
          description: 'Functions for state management',
          difficulty: 3,
          confidence: 0.9, // Higher confidence
          evidence: []
        },
        {
          id: 'concept3',
          name: 'useState',
          type: 'concept',
          description: 'State hook',
          difficulty: 2,
          confidence: 0.85,
          evidence: []
        }
      ]

      // Act
      const uniqueConcepts = service.deduplicateConcepts(concepts)

      // Assert
      expect(uniqueConcepts).toHaveLength(2)
      expect(uniqueConcepts.find(c => c.name === 'React Hooks')?.confidence).toBe(0.9) // Higher confidence kept
      expect(uniqueConcepts.find(c => c.name === 'useState')).toBeDefined()
    })

    it('should calculate statistics distributions correctly', () => {
      // Arrange
      const service = conceptParsingService as any
      const concepts: Concept[] = [
        { name: 'Concept1', confidence: 0.9, difficulty: 3, type: 'concept', evidence: [], description: '', id: '', },
        { name: 'Concept2', confidence: 0.7, difficulty: 2, type: 'skill', evidence: [], description: '', id: '', },
        { name: 'Concept3', confidence: 0.5, difficulty: 4, type: 'concept', evidence: [], description: '', id: '', },
        { name: 'Concept4', confidence: 0.8, difficulty: 3, type: 'principle', evidence: [], description: '', id: '', }
      ]

      // Act
      const confidenceDist = service.calculateConfidenceDistribution(concepts)
      const difficultyDist = service.calculateDifficultyDistribution(concepts)
      const typeDist = service.calculateTypeDistribution(concepts)

      // Assert
      expect(confidenceDist).toEqual({
        high: 2,    // 0.9, 0.8
        medium: 1,  // 0.7
        low: 1      // 0.5
      })

      expect(difficultyDist).toEqual({
        1: 0, 2: 1, 3: 2, 4: 1, 5: 0
      })

      expect(typeDist).toEqual({
        concept: 2,
        skill: 1,
        principle: 1
      })
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing electron API', async () => {
      // Arrange
      delete (global as any).window
      const request: FileParsingRequest = {
        filePaths: ['file1.md'],
        directoryPaths: [],
        options: {
          confidenceThreshold: 0.6,
          maxConceptsPerFile: 50,
          includeRelationships: true
        },
        userId: 'test-user'
      }

      mockAgentManager.getProviderInfo.mockResolvedValue({
        type: 'openai',
        model: 'gpt-4'
      })

      mockConfigService.getConfig.mockResolvedValue({
        ai: {
          model_types: {
            chat: {
              default_provider: 'openai',
              default_model: 'gpt-4',
              settings: { temperature: 0.7, max_tokens: 2000 },
              capabilities: { thinking: false }
            }
          }
        }
      })

      // Act & Assert
      const job = await conceptParsingService.parseLocalFiles(request)
      await new Promise(resolve => setTimeout(resolve, 100)) // Wait for async processing

      const jobStatus = conceptParsingService.getJobStatus(job.id)
      expect(jobStatus!.status).toBe('failed')
      expect(jobStatus!.errorMessage).toContain('Electron API not available')
    })

    it('should handle configuration errors', async () => {
      // Arrange
      mockConfigService.getConfig.mockResolvedValue({
        ai: null // Missing AI configuration
      })

      const service = conceptParsingService as any

      // Act & Assert
      await expect(service.getGlobalAIConfig()).rejects.toThrow('AI configuration is required but not available')
    })

    it('should handle incomplete AI configuration', async () => {
      // Arrange
      mockConfigService.getConfig.mockResolvedValue({
        ai: {
          model_types: {
            chat: {
              default_provider: '', // Missing
              default_model: '',   // Missing
              settings: { temperature: 0.7, max_tokens: 2000 },
              capabilities: { thinking: false }
            }
          }
        }
      })

      const service = conceptParsingService as any

      // Act & Assert
      await expect(service.getGlobalAIConfig()).rejects.toThrow('Incomplete AI configuration provided')
    })

    it('should handle job processing failures', async () => {
      // Arrange
      const request: FileParsingRequest = {
        filePaths: ['file1.md'],
        directoryPaths: [],
        options: {
          confidenceThreshold: 0.6,
          maxConceptsPerFile: 50,
          includeRelationships: true
        },
        userId: 'test-user'
      }

      mockAgentManager.getProviderInfo.mockRejectedValue(new Error('Service unavailable'))

      // Act
      const job = await conceptParsingService.parseLocalFiles(request)

      // Wait for async processing to complete
      await new Promise(resolve => setTimeout(resolve, 200))

      // Assert
      const jobStatus = conceptParsingService.getJobStatus(job.id)
      expect(jobStatus!.status).toBe('failed')
      expect(jobStatus!.errorMessage).toContain('Service unavailable')
    })

    it('should handle empty parsing results', async () => {
      // Arrange
      const service = conceptParsingService as any
      const results = [{
        filePath: 'file1.md',
        success: true,
        concepts: [], // No concepts extracted
        relationships: [],
        errors: [],
        processingTime: 1000
      }]

      const request: FileParsingRequest = {
        filePaths: ['file1.md'],
        directoryPaths: [],
        options: {
          confidenceThreshold: 0.6,
          maxConceptsPerFile: 50,
          includeRelationships: true
        },
        userId: 'test-user'
      }

      // Act & Assert
      await expect(service.compileResults(results, request)).rejects.toThrow('No concepts were extracted from the files')
    })
  })

  describe('Performance Requirements', () => {
    it('should complete file collection within performance threshold', async () => {
      // Arrange
      const service = conceptParsingService as any
      const request: FileParsingRequest = {
        filePaths: ['file1.md', 'file2.md', 'file3.md'],
        directoryPaths: [],
        options: {
          confidenceThreshold: 0.6,
          maxConceptsPerFile: 50,
          includeRelationships: true
        },
        userId: 'test-user'
      }

      mockWindowAPI.existsFile.mockImplementation((path: string) => {
        return new Promise(resolve => setTimeout(resolve, 5, true))
      })

      const performanceThreshold = 100 // ms

      // Act
      const startTime = performance.now()
      const files = await service.collectFiles(request)
      const duration = performance.now() - startTime

      // Assert
      expect(duration).toBeLessThan(performanceThreshold)
      expect(files).toHaveLength(3)
    })

    it('should handle batch processing efficiently', async () => {
      // Arrange
      const service = conceptParsingService as any
      const filePaths = Array.from({ length: 10 }, (_, i) => `file${i}.md`)
      const options = {
        confidenceThreshold: 0.6,
        maxConceptsPerFile: 50,
        includeRelationships: true
      }

      service.parseSingleFile = vi.fn().mockImplementation(async (filePath: string) => {
        await new Promise(resolve => setTimeout(resolve, 10)) // Simulate processing time
        return {
          concepts: [{ id: `c-${filePath}`, name: `Concept ${filePath}`, type: 'concept', difficulty: 3, confidence: 0.8, evidence: [], description: '' }],
          relationships: [],
          learningPath: undefined,
          assessments: [],
          statistics: {},
          errors: []
        }
      })

      // Act
      const startTime = performance.now()
      const results = await service.processFileBatch(filePaths, options)
      const duration = performance.now() - startTime

      // Assert
      expect(results).toHaveLength(10)
      expect(results.every(r => r.success)).toBe(true)
      expect(duration).toBeLessThan(500) // Should process 10 files quickly
    })
  })

  describe('Static Methods', () => {
    it('should navigate to settings page', () => {
      // Arrange
      const originalLocation = window.location.hash
      window.location.hash = '#/current'

      // Act
      ConceptParsingService.navigateToSettings()

      // Assert
      expect(window.location.hash).toBe('#/settings')

      // Cleanup
      window.location.hash = originalLocation
    })
  })
})