# Python Basics

## Variables and Data Types

In Python, variables are created when you assign a value to them.

```python
x = 5
y = "Hello"
```

Python has several built-in data types:

- Integer: `int`
- Floating point: `float`
- String: `str`
- Boolean: `bool`

## Functions

Functions in Python are defined using the `def` keyword:

```python
def greet(name):
    return f"Hello, {name}!"
```

## Classes

Python supports object-oriented programming with classes:

```python
class Person:
    def __init__(self, name, age):
        self.name = name
        self.age = age

    def introduce(self):
        return f"My name is {self.name} and I am {self.age} years old."
```
