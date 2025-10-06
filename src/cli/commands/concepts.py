"""
Concepts command implementation for Learning Catalyst CLI
"""

from typing import Optional

import typer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

app = typer.Typer()


@app.command()
def concepts(
    list_all: bool = typer.Option(False, "--list", "-l", help="List all learned concepts"),
    search: Optional[str] = typer.Option(None, "--search", "-s", help="Search for concepts by name"),
):
    """Manage and view learned concepts"""
    console = Console()

    if list_all or not search:
        _list_concepts(console)
    elif search:
        _search_concepts(console, search)


def _list_concepts(console):
    """List all learned concepts"""
    console.print(Panel.fit("[bold blue]Learned Concepts[/bold blue]", border_style="blue"))

    # In a real implementation, this would fetch concepts from the knowledge navigator
    # For now, showing sample data
    sample_concepts = [
        ("Python Basics", "Fundamentals of Python programming", "Beginner", "Completed"),
        ("Object-Oriented Programming", "OOP concepts and design patterns", "Intermediate", "In Progress"),
        ("Data Structures", "Common data structures and algorithms", "Intermediate", "Not Started"),
        ("Machine Learning", "Introduction to ML algorithms", "Advanced", "Not Started"),
    ]

    table = Table(show_header=True, header_style="bold magenta")
    table.add_column("Concept", style="cyan", width=25)
    table.add_column("Description", width=40)
    table.add_column("Level", width=15)
    table.add_column("Status", width=15)

    for concept, desc, level, status in sample_concepts:
        table.add_row(concept, desc, level, status)

    console.print(table)

    console.print("\n[bold]Usage:[/bold]")
    console.print("  learning-catalyst concepts --list")
    console.print("  learning-catalyst concepts --search <term>")


def _search_concepts(console, search_term):
    """Search for concepts by name"""
    console.print(Panel.fit(f"[bold blue]Search Results for '{search_term}'[/bold blue]", border_style="blue"))

    # In a real implementation, this would search concepts in the knowledge navigator
    # For now, showing sample data
    sample_concepts = [
        ("Python Basics", "Fundamentals of Python programming", "Beginner", "Completed"),
        ("Object-Oriented Programming", "OOP concepts and design patterns", "Intermediate", "In Progress"),
    ]

    if sample_concepts:
        table = Table(show_header=True, header_style="bold magenta")
        table.add_column("Concept", style="cyan", width=25)
        table.add_column("Description", width=40)
        table.add_column("Level", width=15)
        table.add_column("Status", width=15)

        for concept, desc, level, status in sample_concepts:
            table.add_row(concept, desc, level, status)

        console.print(table)
    else:
        console.print("[yellow]No concepts found matching your search.[/yellow]")


if __name__ == "__main__":
    app()
