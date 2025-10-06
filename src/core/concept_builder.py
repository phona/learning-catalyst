"""
Concept Builder implementation for Learning Catalyst
Handles concept extraction, relationship building, validation, and summarization
"""
import hashlib
from typing import Any, Dict, List, Optional

from src.data.models.concept import Concept
from src.data.models.extended_models import KnowledgeMap
from src.core.knowledge_navigator import KnowledgeNavigator


class ConceptBuilder:
    """Handles building and managing concepts from various sources"""
    
    def __init__(self, db_manager=None, model_service=None):
        self.db_manager = db_manager
        self.model_service = model_service
        self.concepts = []
        self.relationships = []
        self.concepts_cache: Dict[str, Concept] = {}
        self.relationships_cache: List[Dict[str, str]] = []
        
    async def extract_concepts_with_granularity(
        self,
        file_path: str = "",
        workspace_path: Optional[str] = None,
        granularity: str = "medium"
    ) -> Dict[str, Any]:
        """
        Extract concepts with specified granularity level
        
        Args:
            file_path: Path to a specific markdown file
            workspace_path: Path to workspace directory
            granularity: Level of detail for concept extraction
                "fine" - Extract detailed concepts (paragraphs, code blocks)
                "medium" - Extract concepts based on headers (default)
                "coarse" - Extract only major concepts (top-level headers)
        
        Returns:
            Dictionary containing extracted concepts and relationships
        """
        # Map granularity to extraction mode
        extraction_mode = "headers"  # Default
        if granularity == "fine":
            extraction_mode = "paragraphs"
        elif granularity == "coarse":
            extraction_mode = "headers"
        
        # Extract concepts using markdown parser
        if file_path:
            concepts = self.extract_concepts_from_markdown(file_path, extraction_mode)
        else:
            concepts = []
        
        # Filter concepts based on granularity
        if granularity == "coarse":
            # Keep only top-level headers (level 1)
            filtered_concepts = [
                concept for concept in concepts
                if concept.get('level', 1) == 1
            ]
            concepts = filtered_concepts
        
        # Build relationships
        relationships = self.build_concept_relationships(concepts)
        
        return {
            'concepts': concepts,
            'relationships': relationships
        }
    
    def build_concept_relationships(self, concepts: List[Dict[str, Any]] = None) -> List[Dict[str, str]]:
        """
        Build relationships between concepts based on various factors
        
        Args:
            concepts: List of concept dictionaries
            
        Returns:
            List of relationship dictionaries
        """
        if concepts is None:
            concepts = self.concepts
            
        relationships = []
        
        # Build header hierarchy relationships
        header_relationships = self._build_header_hierarchy_relationships(concepts)
        relationships.extend(header_relationships)
        
        # Build semantic relationships
        semantic_relationships = self._build_semantic_relationships(concepts)
        relationships.extend(semantic_relationships)
        
        # Build prerequisite relationships
        prerequisite_relationships = self._build_prerequisite_relationships(concepts)
        relationships.extend(prerequisite_relationships)
        
        # Remove duplicates
        unique_relationships = self._remove_duplicate_relationships(relationships)
        
        return unique_relationships
    
    def _build_header_hierarchy_relationships(self, concepts: List[Dict[str, Any]]) -> List[Dict[str, str]]:
        """Build relationships based on header hierarchy"""
        relationships = []
        
        # Sort concepts by document order (if available)
        sorted_concepts = sorted(concepts, key=lambda c: c.get('metadata', {}).get('line_number', 0))
        
        # Create relationships based on header levels
        for i, concept in enumerate(sorted_concepts):
            current_level = concept.get('level', 1)
            
            # Look for parent concepts (higher level headers that appear before)
            for j in range(i-1, -1, -1):
                other_concept = sorted_concepts[j]
                other_level = other_concept.get('level', 1)
                
                # If other_concept has a higher level (lower number) and appears before
                if other_level < current_level:
                    relationships.append({
                        'source': other_concept['id'],
                        'target': concept['id'],
                        'relationship_type': 'subtopic_of'
                    })
                    break  # Found the closest parent
        
        return relationships
    
    def _build_semantic_relationships(self, concepts: List[Dict[str, Any]]) -> List[Dict[str, str]]:
        """Build relationships based on semantic similarity"""
        relationships = []
        
        # Simple keyword-based relationship detection
        # In a real implementation, this would use embeddings or NLP
        
        # Define common related keywords
        related_keywords = {
            'introduction': ['overview', 'getting started', 'basics'],
            'advanced': ['expert', 'deep dive', 'complex'],
            'example': ['demo', 'sample', 'case study'],
            'tutorial': ['guide', 'walkthrough', 'howto'],
            'reference': ['documentation', 'api', 'specification']
        }
        
        # Create a mapping from concept ID to concept
        concept_map = {c['id']: c for c in concepts}
        
        # Check for keyword-based relationships
        for concept in concepts:
            title_lower = concept['title'].lower()
            
            for keyword, related_terms in related_keywords.items():
                if keyword in title_lower:
                    # Find concepts with related terms
                    for other_concept in concepts:
                        if other_concept['id'] == concept['id']:
                            continue  # Skip self
                        
                        other_title_lower = other_concept['title'].lower()
                        for term in related_terms:
                            if term in other_title_lower:
                                relationships.append({
                                    'source': concept['id'],
                                    'target': other_concept['id'],
                                    'relationship_type': 'related_to'
                                })
                                break  # Found a related term
        
        return relationships
    
    def _build_prerequisite_relationships(self, concepts: List[Dict[str, Any]]) -> List[Dict[str, str]]:
        """Build prerequisite relationships based on content analysis"""
        relationships = []
        
        # Simple heuristic-based prerequisite detection
        # In a real implementation, this would use more sophisticated NLP
        
        # Define common prerequisite indicators
        prerequisite_indicators = [
            'before you begin', 'prerequisites', 'prior knowledge',
            'requires understanding', 'builds on', 'assumes'
        ]
        
        # Create a mapping from concept ID to concept
        concept_map = {c['id']: c for c in concepts}
        
        # Check for prerequisite indicators in content
        for concept in concepts:
            content_lower = concept['content'].lower()
            
            for indicator in prerequisite_indicators:
                if indicator in content_lower:
                    # Try to find referenced concepts in the content
                    for other_concept in concepts:
                        if other_concept['id'] == concept['id']:
                            continue  # Skip self
                        
                        # If the other concept's title is mentioned in this concept's content
                        if other_concept['title'].lower() in content_lower:
                            relationships.append({
                                'source': other_concept['id'],
                                'target': concept['id'],
                                'relationship_type': 'prerequisite_for'
                            })
        
        return relationships
    
    def _remove_duplicate_relationships(self, relationships: List[Dict[str, str]]) -> List[Dict[str, str]]:
        """Remove duplicate relationships"""
        seen = set()
        unique_relationships = []
        
        for rel in relationships:
            # Create a unique key for the relationship
            key = (rel['source'], rel['target'], rel['relationship_type'])
            if key not in seen:
                seen.add(key)
                unique_relationships.append(rel)
        
        return unique_relationships
    
    def validate_and_deduplicate_concepts(self, concepts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Validate concepts and remove duplicates
        
        Args:
            concepts: List of concept dictionaries
            
        Returns:
            List of validated, unique concept dictionaries
        """
        validated_concepts = []
        seen_hashes = set()
        
        for concept in concepts:
            # Validate required fields
            if not self._validate_concept(concept):
                continue  # Skip invalid concepts
            
            # Create a hash for duplicate detection
            concept_hash = self._create_concept_hash(concept)
            
            # Skip if duplicate
            if concept_hash in seen_hashes:
                continue
            
            # Add to validated concepts
            validated_concepts.append(concept)
            seen_hashes.add(concept_hash)
        
        return validated_concepts
    
    def _validate_concept(self, concept: Dict[str, Any]) -> bool:
        """Validate a concept dictionary"""
        required_fields = ['id', 'title', 'content']
        
        # Check required fields
        for field in required_fields:
            if field not in concept or not concept[field]:
                return False
        
        # Validate content length
        if len(concept['content'].strip()) < 10:
            return False  # Content too short
        
        return True
    
    def _create_concept_hash(self, concept: Dict[str, Any]) -> str:
        """Create a hash for a concept for duplicate detection"""
        # Use title and content for hashing
        hash_data = f"{concept['title']}:{concept['content'][:100]}"
        return hashlib.md5(hash_data.encode()).hexdigest()
    
    async def summarize_concepts(self, concepts: List[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        Generate summaries for concepts
        
        Args:
            concepts: List of concept dictionaries
            
        Returns:
            List of concept dictionaries with added summaries
        """
        if concepts is None:
            concepts = self.concepts
            
        # In a real implementation, this would use an AI model to generate summaries
        # For now, we'll use a simple extractive summarization approach
        
        summarized_concepts = []
        
        for concept in concepts:
            # Create a copy of the concept
            summarized_concept = concept.copy()
            
            # Generate summary
            summary = self._generate_summary(concept['content'])
            
            # Add summary to concept
            summarized_concept['summary'] = summary
            
            summarized_concepts.append(summarized_concept)
        
        return summarized_concepts
    
    def _generate_summary(self, content: str) -> str:
        """Generate a summary for content"""
        # Simple extractive summarization
        # In a real implementation, this would use more sophisticated algorithms
        
        # Split content into sentences
        sentences = content.split('. ')
        
        # If content is short, use it as is
        if len(sentences) <= 3:
            return content
        
        # Otherwise, use the first sentence as summary
        summary = sentences[0].strip()
        
        # Ensure summary ends with a period
        if not summary.endswith('.'):
            summary += '.'
        
        return summary
    
    async def build_knowledge_map(
        self,
        file_path: str = "",
        workspace_path: Optional[str] = None,
        granularity: str = "medium",
        validate: bool = True,
        summarize: bool = True
    ) -> Dict[str, Any]:
        """
        Build a complete knowledge map with concepts and relationships
        
        Args:
            file_path: Path to a specific markdown file
            workspace_path: Path to workspace directory
            granularity: Level of detail for concept extraction
            validate: Whether to validate and deduplicate concepts
            summarize: Whether to generate summaries for concepts
            
        Returns:
            Complete knowledge map with concepts and relationships
        """
        # Extract concepts with specified granularity
        knowledge_map = await self.extract_concepts_with_granularity(
            file_path=file_path,
            workspace_path=workspace_path,
            granularity=granularity
        )
        
        # Validate and deduplicate concepts if requested
        if validate:
            knowledge_map['concepts'] = self.validate_and_deduplicate_concepts(knowledge_map['concepts'])
        
        # Build concept relationships
        knowledge_map['relationships'] = self.build_concept_relationships(knowledge_map['concepts'])
        
        # Generate summaries if requested
        if summarize:
            knowledge_map['concepts'] = await self.summarize_concepts(knowledge_map['concepts'])
        
        # Update cache
        self._update_cache(knowledge_map)
        
        return knowledge_map
    
    def _update_cache(self, knowledge_map: KnowledgeMap) -> None:
        """Update internal cache with new knowledge map"""
        # Update concepts cache
        for concept_data in knowledge_map.concepts:
            concept = Concept(
                id=concept_data['id'],
                title=concept_data['title'],
                content=concept_data['content'],
                prerequisites=[],  # Will be filled based on relationships
                difficulty_level=concept_data.get('level', 1)
            )
            self.concepts_cache[concept.id] = concept
        
        # Update relationships cache
        self.relationships_cache = knowledge_map['relationships']
    
    def get_concept_by_id(self, concept_id: str) -> Optional[Concept]:
        """Get a concept by ID from cache"""
        return self.concepts_cache.get(concept_id)
    
    def get_related_concepts(self, concept_id: str) -> List[Concept]:
        """Get concepts related to the given concept ID"""
        related_concepts = []
        
        # Find relationships where the given concept is the source or target
        for rel in self.relationships_cache:
            related_concept_id = None
            
            if rel['source'] == concept_id:
                related_concept_id = rel['target']
            elif rel['target'] == concept_id:
                related_concept_id = rel['source']
            
            if related_concept_id and related_concept_id in self.concepts_cache:
                related_concepts.append(self.concepts_cache[related_concept_id])
        
        return related_concepts
    
    def extract_concepts_from_markdown(self, file_path: str, granularity: str) -> List[Dict[str, Any]]:
        """Extract concepts from a Markdown file based on specified granularity"""
        from src.utils.markdown_parser import MarkdownParser
        
        # Map granularity to extraction mode
        extraction_mode = "headers"  # Default
        if granularity == "summaries":
            extraction_mode = "sections"
        elif granularity == "full_content":
            extraction_mode = "paragraphs"
        
        parser = MarkdownParser(extraction_mode)
        return parser.find_concepts_in_file(file_path)
    
    def extract_concepts_from_directory(self, dir_path: str, granularity: str) -> List[Dict[str, Any]]:
        """Extract concepts from all Markdown files in a directory"""
        from src.utils.markdown_parser import extract_all_concepts
        return extract_all_concepts(dir_path, granularity)
    
    def save_concepts_to_db(self) -> None:
        """Persist extracted concepts to the database"""
        if self.db_manager:
            for concept_data in self.concepts:
                concept = Concept(
                    id=concept_data['id'],
                    title=concept_data['title'],
                    content=concept_data['content'],
                    prerequisites=concept_data.get('prerequisites', []),
                    difficulty_level=concept_data.get('level', 1)
                )
                self.db_manager.save_concept(concept)
    
    def validate_concepts(self) -> List[Dict[str, Any]]:
        """Validate extracted concepts for consistency and quality"""
        results = []
        for concept in self.concepts:
            is_valid = self._validate_concept(concept)
            issues = []
            
            if not is_valid:
                if not concept.get('title'):
                    issues.append("Missing title")
                if not concept.get('content'):
                    issues.append("Missing content")
                if len(concept.get('content', '').strip()) < 10:
                    issues.append("Content too short")
            
            results.append({
                'concept_id': concept.get('id', ''),
                'is_valid': is_valid,
                'issues': issues
            })
        
        return results
    
    def detect_duplicate_concepts(self) -> List[List[Dict[str, Any]]]:
        """Identify and group duplicate concepts"""
        seen_hashes = {}
        duplicates = []
        
        for concept in self.concepts:
            concept_hash = self._create_concept_hash(concept)
            
            if concept_hash in seen_hashes:
                # Found a duplicate
                existing_concept = seen_hashes[concept_hash]
                
                # Check if we already have a group for this duplicate
                found_group = False
                for group in duplicates:
                    if existing_concept in group:
                        group.append(concept)
                        found_group = True
                        break
                
                # If no group exists, create one
                if not found_group:
                    duplicates.append([existing_concept, concept])
            else:
                seen_hashes[concept_hash] = concept
        
        return duplicates