# JavaScript Fundamentals

## Variables and Data Types

JavaScript variables can be declared using `var`, `let`, or `const`:

```javascript
let name = "John";
const age = 25;
var city = "New York";
```

### Data Types:
- **Primitive**: string, number, boolean, undefined, null, symbol
- **Reference**: object, array, function

## Functions

### Function Declarations
```javascript
function greet(name) {
    return `Hello, ${name}!`;
}

// Function expressions
const greet2 = function(name) {
    return `Hello, ${name}!`;
};

// Arrow functions
const greet3 = (name) => `Hello, ${name}!`;
```

## Arrays and Objects

### Arrays
```javascript
const fruits = ["apple", "banana", "orange"];
fruits.push("mango");
fruits[0] = "avocado";
```

### Objects
```javascript
const person = {
    name: "Alice",
    age: 25,
    greet: function() {
        return `Hello, I'm ${this.name}`;
    }
};
```

## Control Structures

### Conditional Statements
```javascript
if (age >= 18) {
    console.log("Adult");
} else {
    console.log("Minor");
}

// Ternary operator
const message = age >= 18 ? "Adult" : "Minor";
```

### Loops
```javascript
for (let i = 0; i < 5; i++) {
    console.log(i);
}

// For...of loop
for (const fruit of fruits) {
    console.log(fruit);
}

// While loop
let count = 0;
while (count < 5) {
    console.log(count);
    count++;
}
```

## ES6 Features

### Template Literals
```javascript
const message = `Hello, ${name}! You are ${age} years old.`;
```

### Destructuring
```javascript
const {name, age} = person;
const [first, second] = fruits;
```
