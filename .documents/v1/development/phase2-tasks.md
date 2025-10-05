# Phase 2 Implementation Tasks

## Core Components to Build

### 1. Concept Building System
- [x] Create `core/concept_builder.py` with ConceptBuilder class
- [x] Implement Markdown file parsing utilities in `utils/markdown_parser.py`
- [x] Add header-based concept extraction (granularity="headers" mode)
- [x] Implement summary-based concept extraction (granularity="summaries" mode)
- [x] Add full-content concept extraction (granularity="full_content" mode)
- [x] Create Concept dataclass with all required fields
- [x] Implement dependency mapping between concepts
- [x] Add concept validation and duplicate detection
- [x] Add concept summarization functionality
- [ ] Write unit tests for concept extraction

#### Detailed Implementation Requirements

The Concept Building System should implement the following key components as defined in the Technical Specification:

1. **ConceptBuilder Class**
   - Must support three extraction modes: headers, summaries, and full_content
   - Should include methods for directory-wide extraction
   - Must implement concept relationship detection
   - Should handle concept validation and duplicate detection
   - Must support concept summarization via AI model

2. **Data Structures**
   - Concept dataclass with id, title, content, source_file, granularity, level, metadata, timestamp
   - ConceptRelationship dataclass for tracking connections between concepts
   - ValidationResult dataclass for reporting concept quality issues
   - ConceptSummary dataclass for storing AI-generated summaries

3. **Markdown Parser Utility**
   - Should implement section parsing based on headers
   - Must extract document structure information
   - Should include content sanitization capabilities
   - Must count various document elements (headers, code blocks, links)

4. **Database Integration**
   - Must add concept and relationship storage methods
   - Should support querying concepts by source file
   - Must handle relationship queries for specific concepts

### 2. Knowledge Graph Construction
- [x] Create `core/knowledge_graph.py` with KnowledgeGraph class
- [x] Implement graph data structure for concept relationships
- [ ] Add dependency tracking functionality
- [ ] Implement graph traversal algorithms
- [x] Add cycle detection in dependencies
- [ ] Create visualization utilities for the graph
- [x] Implement graph persistence to database
- [ ] Add graph analysis tools (longest path, connected components, etc.)

### 3. Assessment Engine
- [x] Create `core/assessment_engine.py` with AssessmentEngine class
- [x] Implement user competency profile creation
- [x] Add proficiency scoring algorithms (correct answer rate, exponential moving average)
- [x] Implement adaptive difficulty adjustment
- [x] Create performance analytics tools
- [x] Add concept-level proficiency tracking
- [x] Implement skill gap identification
- [x] Write unit tests for assessment algorithms

### 4. Analytics Dashboard
- [x] Create `core/analytics_dashboard.py` with AnalyticsDashboard class
- [x] Implement text-based dashboard rendering
- [x] Add proficiency visualization tools
- [x] Create trend analysis functionality
- [x] Implement weak area identification
- [x] Add summary statistics display
- [x] Create export functionality for analytics data
- [x] Add visualization of knowledge graph progress

### 5. Enhanced Database Schema
- [x] Update database schema to support concept tracking
- [x] Add concept proficiency tracking tables
- [x] Implement database migration functionality
- [x] Add indexes for performance optimization
- [x] Create database views for analytics queries
- [x] Add foreign key constraints for data integrity
- [x] Implement database backup functionality

### 6. Configuration Enhancements
- [ ] Update config.toml specification to include concept granularity
- [x] Add concept extraction settings
- [x] Implement configuration validation for new settings
- [x] Add commands to modify concept granularity settings
- [x] Create wizards for configuring analytics preferences

### 7. New CLI Commands
- [x] Implement `/stats` command to show analytics dashboard
- [x] Create `/rebuild` command to re-analyze content with different granularity
- [x] Implement `/status` command to show configuration and project status
- [x] Add command to view knowledge graph statistics
- [x] Create export commands for analytics data

### 8. Enhanced Catalyst Agent
- [x] Update CatalystAgent to work with formal concept model
- [x] Implement concept-based conversation context
- [x] Add integration with AssessmentEngine
- [x] Create proactive knowledge check functionality (Story 8)
- [x] Implement intelligent concept switching
- [x] Add context-aware challenge generation based on knowledge graph
- [x] Enhance welcome prompt with analytics data

### 9. Challenge Engine Enhancements
- [x] Update ChallengeEngine to work with formal concepts
- [x] Implement adaptive difficulty based on user proficiency
- [x] Add question tagging with concept IDs
- [x] Create question pools for each concept
- [x] Add concept-specific evaluation metrics
- [x] Implement challenge recommendations based on knowledge graph

### 10. State Management Enhancements
- [x] Update ApplicationState to include knowledge graph data
- [x] Add support for saving/loading concept progress
- [x] Implement state migration for Phase 1 to Phase 2
- [x] Add checkpoint support for knowledge graph state

### 11. Testing Framework Updates
- [x] Create test fixtures for concept extraction
- [x] Add integration tests for knowledge graph functionality
- [x] Implement performance tests for concept extraction
- [x] Add tests for assessment algorithms
- [x] Create analytics dashboard test scenarios

### 12. Documentation Updates
- [x] Update README.md with Phase 2 features
- [x] Document knowledge graph and concept extraction
- [x] Add analytics dashboard usage instructions
- [x] Document configuration options for Phase 2 features
- [x] Update troubleshooting section for Phase 2 issues