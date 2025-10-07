# Python Basics

## Variables and Data Types

In Python, variables are containers for storing data values. Unlike other programming languages, Python has no command for declaring a variable. A variable is created the moment you first assign a value to it.

### Example:
```python
x = 5
y = "Hello, World!"
```

### Data Types:
- **Text Type**: str
- **Numeric Types**: int, float, complex
- **Sequence Types**: list, tuple, range
- **Mapping Type**: dict
- **Set Types**: set, frozenset
- **Boolean Type**: bool
- **Binary Types**: bytes, bytearray, memoryview

## Control Flow

### If Statements
```python
if x > 0:
    print("Positive")
elif x < 0:
    print("Negative")
else:
    print("Zero")
```

### Loops
```python
for i in range(5):
    print(i)

while x > 0:
    print(x)
    x -= 1
```

## Functions

Functions are defined using the `def` keyword:

```python
def my_function():
    print("Hello from a function")

def my_function_with_args(name):
    print(f"Hello, {name}!")

return_value = my_function_with_args("Alice")
```

## Lists and Dictionaries

### Lists
```python
my_list = [1, 2, 3, 4, 5]
my_list.append(6)
my_list[0] = 0
```

### Dictionaries
```python
my_dict = {"name": "Alice", "age": 25}
my_dict["city"] = "New York"
```
