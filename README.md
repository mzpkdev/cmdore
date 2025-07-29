<div align="center">

[![license](https://img.shields.io/npm/l/cmdore.svg)](https://github.com/mzpkdev/cmdore/blob/master/LICENSE)
[![npm version](https://img.shields.io/npm/v/cmdore.svg)](https://www.npmjs.com/package/cmdore)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![bundle size](https://img.shields.io/bundlephobia/min/cmdore)](https://bundlephobia.com/result?p=cmdore)

</div>
<br>
<br>

<p align="center">
  <strong>cmdore</strong>
  <p align="center">
    A lightweight, type-safe CLI framework for Node.js applications.
    <br />
    <br />
    <a href="https://github.com/mzpkdev/cmdore/issues">Report a bug</a>
    &nbsp;&nbsp;·&nbsp;&nbsp;
    <a href="https://github.com/mzpkdev/cmdore/issues">Request a feature</a>
  </p>
<br />
<br />

Table of Contents
------------------

* [Getting started](#getting-started)
    * [How to install](#how-to-install)
* [Features](#features)
* [Usage](#usage)
* [Missing Features](#missing-features)

Getting started
----------------

### How to install

```shell
npm install cmdore
```

Features
--------

* **Type-safe API**: Built with TypeScript for excellent type safety and autocompletion
* **Simple command registration**: Easy-to-use API for registering commands
* **Option handling**: Support for command options with aliases
* **Validation**: Built-in option validation capabilities
* **Default values**: Support for default option values
* **Custom parsers**: Ability to define custom parsers for option values
* **Help generation**: Automatic help text generation
* **Version display**: Built-in version command support
* **Error handling**: Structured error handling for validation and unexpected errors
* **Output control**: Support for different output modes (verbose, quiet, JSON)

Usage
-----

```typescript
// Create a new program
const program = new Program();

// Define a command
const myCommand = defineCommand({
  name: "mycommand",
  description: "Description of my command",
  options: [
    defineOption({
      name: "input",
      description: "Input file",
      alias: "i",
      required: true
    }),
    defineOption({
      name: "output",
      description: "Output file",
      alias: "o",
      defaultValue: () => "./output"
    })
  ],
  runner: function({ input, output }) {
    // Command implementation
    console.log(`Processing ${input} to ${output}`);
  }
});

// Register the command and execute
program
  .register(myCommand)
  .execute(process.argv.slice(2))
  .catch(error => console.error(error));
```

Missing Features
---------------

* **Command groups/namespaces**: Support for organizing commands in hierarchical groups
* **Interactive prompts**: Built-in support for interactive user input
* **Autocomplete**: Command and option autocomplete in shells
* **Progress indicators**: Built-in progress bars and spinners
* **Color support**: Integrated colorized output
* **Configuration files**: Support for loading options from configuration files
* **Plugin system**: Extensibility through plugins
* **Subcommands**: Nested command structure
* **Global options**: Options that apply to all commands
* **Command aliases**: Alternative names for commands
* **Documentation generation**: Automatic generation of documentation from command definitions
* **Testing utilities**: Helpers for testing command implementations
