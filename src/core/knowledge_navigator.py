"""
SQLite implementation of KnowledgeNavigator
"""
import sqlite3
import json
import os
from typing import List
from pathlib import Path
from src.data.models.concept import Concept
from src.data.models.extended_models import KnowledgeMap, UserProgress
from . import KnowledgeNavigator


class SQLiteKnowledgeNavigator(KnowledgeNavigator):
    def __init__(self, db_path: str):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        # Initialize the database schema based on the architecture document
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Create concepts table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS concepts (
            id TEXT PRIMARY KEY,
            title TEXT,
            content TEXT,
            prerequisites TEXT,
            difficulty_level INTEGER
        )
        """)

        conn.commit()
        conn.close()

    async def load_content(self, file_path: str) -> KnowledgeMap:
        # Implementation to load markdown content into knowledge map
        # For now, return an empty knowledge map
        # This would involve parsing the markdown file and extracting concepts
        concepts = []
        relationships = []
        
        # If it's a markdown file, parse it
        if file_path.endswith('.md'):
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
                # Very basic parsing - would need more sophisticated parsing in a real implementation
                # This is just a placeholder implementation
                import re
                
                # Find headers as potential concepts
                headers = re.findall(r'^(#+)\s+(.+)$', content, re.MULTILINE)
                
                for level, title in headers:
                    concept_id = title.lower().replace(' ', '_').replace('#', '')
                    concept = {
                        "id": concept_id,
                        "title": title,
                        "content": f"Content for {title}",
                        "difficulty": len(level)  # Use header level as difficulty
                    }
                    concepts.append(concept)
        
        return KnowledgeMap(concepts=concepts, relationships=relationships)

    async def get_available_concepts(self) -> List[Concept]:
        # Implementation to retrieve concepts from database
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM concepts")
        rows = cursor.fetchall()
        conn.close()

        concepts = []
        for row in rows:
            concepts.append(Concept(
                id=row[0],
                title=row[1],
                content=row[2],
                prerequisites=json.loads(row[3]) if row[3] else [],
                difficulty_level=row[4]
            ))
        
        return concepts

    def get_available_concepts_sync(self) -> List[Concept]:
        # Synchronous version of get_available_concepts for internal use
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM concepts")
        rows = cursor.fetchall()
        conn.close()

        concepts = []
        for row in rows:
            concepts.append(Concept(
                id=row[0],
                title=row[1],
                content=row[2],
                prerequisites=json.loads(row[3]) if row[3] else [],
                difficulty_level=row[4]
            ))
        
        return concepts

    def get_concept_path(self, concept_id: str) -> List[Concept]:
        # Implementation to get the learning path for a specific concept
        # This would consider prerequisites
        all_concepts = self.get_available_concepts_sync()
        
        # Find the specific concept
        target_concept = None
        for concept in all_concepts:
            if concept.id == concept_id:
                target_concept = concept
                break
                
        if not target_concept:
            return []
        
        # Find prerequisite concepts
        path = []
        for concept in all_concepts:
            if concept.id in target_concept.prerequisites:
                path.append(concept)
        
        # Add the target concept at the end
        path.append(target_concept)
        
        return path

    def update_progress(self, concept_id: str, progress: UserProgress) -> None:
        # Implementation to update user progress for a concept
        # This would typically update the database
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Update or insert progress in the user_progress table
        cursor.execute("""
        INSERT OR REPLACE INTO user_progress (concept_id, completed, score)
        VALUES (?, ?, ?)
        """, (concept_id, progress.completed, progress.score))
        
        conn.commit()
        conn.close()