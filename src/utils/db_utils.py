"""
Database utility functions to reduce code duplication
"""

import sqlite3
from contextlib import contextmanager
from typing import Dict, List, Optional, Tuple, Union


@contextmanager
def get_db_connection(db_path: str):
    """
    Context manager for database connections

    Args:
        db_path: Path to the SQLite database file

    Yields:
        Tuple of (connection, cursor)
    """
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        yield conn, cursor
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def execute_query(
    db_path: str,
    query: str,
    params: Optional[Tuple] = None,
    fetch_one: bool = False,
    fetch_all: bool = True,
) -> Optional[Union[Dict, List[Dict]]]:
    """
    Execute a query and return results

    Args:
        db_path: Path to the SQLite database file
        query: SQL query to execute
        params: Parameters for the query
        fetch_one: Whether to fetch only one result
        fetch_all: Whether to fetch all results

    Returns:
        Query results as dictionary or list of dictionaries
    """
    with get_db_connection(db_path) as (_conn, cursor):
        if params:
            cursor.execute(query, params)
        else:
            cursor.execute(query)

        if fetch_one:
            row = cursor.fetchone()
            return dict(zip([col[0] for col in cursor.description], row)) if row else None
        elif fetch_all:
            rows = cursor.fetchall()
            return [dict(zip([col[0] for col in cursor.description], row)) for row in rows]
        return None


def execute_non_query(db_path: str, query: str, params: Optional[Tuple] = None) -> int:
    """
    Execute a non-query (INSERT, UPDATE, DELETE) and return affected rows

    Args:
        db_path: Path to the SQLite database file
        query: SQL query to execute
        params: Parameters for the query

    Returns:
        Number of affected rows
    """
    with get_db_connection(db_path) as (_conn, cursor):
        if params:
            cursor.execute(query, params)
        else:
            cursor.execute(query)
        return cursor.rowcount


def execute_many(db_path: str, query: str, params_list: List[Tuple]) -> int:
    """
    Execute a query multiple times with different parameters

    Args:
        db_path: Path to the SQLite database file
        query: SQL query to execute
        params_list: List of parameter tuples

    Returns:
        Number of affected rows
    """
    with get_db_connection(db_path) as (_conn, cursor):
        cursor.executemany(query, params_list)
        return cursor.rowcount
