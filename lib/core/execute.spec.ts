import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { CmdoreError } from "../errors"
import { effect, terminal } from "../tools"
import type Command from "./Command"
import { execute, intercept } from "./execute"
import type { StandardSchemaV1 } from "./StandardSchema"

const metadata = { name: "cmdore", version: "0.0.8", description: "A test CLI" }

// process.exitCode hygiene: execute() sets process.exitCode on the error path,
// which would otherwise leak into the vitest run and make `npm test` exit
// non-zero even when every assertion passes. Save and restore it around each
// test.
let previousExitCode: typeof process.exitCode
beforeEach(() => {
    previousExitCode = process.exitCode
})
afterEach(() => {
    process.exitCode = previousExitCode ?? 0
})

const numberSchema: StandardSchemaV1<number> = {
    "~standard": {
        version: 1,
        vendor: "test",
        validate: (value) => {
            const n = Number(value)
            return Number.isNaN(n)
                ? { issues: [{ message: "not a number" }] }
                : { value: n }
        }
    }
}

describe("execute - command dispatch", () => {
    it("should dispatch to multiple commands", async () => {
        const ran: string[] = []
        const commands: Command<any, any>[] = [
            {
                name: "build",
                run: () => {
                    ran.push("build")
                }
            },
            {
                name: "test",
                run: () => {
                    ran.push("test")
                }
            }
        ]
        await execute(commands, { argv: ["build"], metadata })
        await execute(commands, { argv: ["test"], metadata })
        expect(ran).toStrictEqual(["build", "test"])
    })

    it("should render and set exitCode when command does not exist", async () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {})
        await expect(
            execute([], { argv: ["nonexistent"], metadata })
        ).resolves.toBeUndefined()
        const output = spy.mock.calls.map((call) => String(call[0])).join("\n")
        const exitCode = process.exitCode
        spy.mockRestore()
        expect(output).toContain(`A command "nonexistent" does not exist.`)
        expect(exitCode).toStrictEqual(2)
    })

    it("should tag the unknown-command error with code cmdore.unknownCommand", async () => {
        await expect(
            execute([], { argv: ["nonexistent"], metadata, onError: "throw" })
        ).rejects.toMatchObject({ code: "cmdore.unknownCommand" })
    })

    it("should call the run function with parsed argv", async () => {
        let received: unknown = null
        await execute(
            [
                {
                    name: "serve",
                    options: [{ name: "port" }],
                    run(argv: any) {
                        received = argv
                    }
                }
            ],
            { argv: ["serve", "--port", "3000"], metadata }
        )
        expect(received).toStrictEqual({ port: ["3000"] })
    })

    it("should call run with empty argv when command has no options", async () => {
        let ran = false
        await execute(
            [
                {
                    name: "ping",
                    run: () => {
                        ran = true
                    }
                }
            ],
            { argv: ["ping"], metadata }
        )
        expect(ran).toStrictEqual(true)
    })

    it("should bind this to the command in run", async () => {
        let receivedThis: unknown = null
        const command: Command<any, any> = {
            name: "build",
            run() {
                receivedThis = this
            }
        }
        await execute([command], { argv: ["build"], metadata })
        expect(receivedThis).toStrictEqual(command)
    })
})

describe("execute - error handling", () => {
    it("should render the message and resolve when run throws", async () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {})
        await expect(
            execute(
                [
                    {
                        name: "fail",
                        run: () => {
                            throw new Error("boom")
                        }
                    }
                ],
                { argv: ["fail"], metadata }
            )
        ).resolves.toBeUndefined()
        const output = spy.mock.calls.map((call) => String(call[0])).join("\n")
        spy.mockRestore()
        expect(output).toContain("boom")
    })

    it("should set process.exitCode to 1 for a plain Error", async () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {})
        await execute(
            [
                {
                    name: "fail",
                    run: () => {
                        throw new Error("boom")
                    }
                }
            ],
            { argv: ["fail"], metadata }
        )
        const exitCode = process.exitCode
        spy.mockRestore()
        expect(exitCode).toStrictEqual(1)
    })

    it("should use the CmdoreError's exitCode", async () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {})
        await execute(
            [
                {
                    name: "fail",
                    run: () => {
                        throw new CmdoreError("custom", { exitCode: 42 })
                    }
                }
            ],
            { argv: ["fail"], metadata }
        )
        const exitCode = process.exitCode
        spy.mockRestore()
        expect(exitCode).toStrictEqual(42)
    })

    it("should stringify and render a non-Error throw", async () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {})
        const thrown = "string failure"
        await execute(
            [
                {
                    name: "fail",
                    run: () => Promise.reject(thrown)
                }
            ],
            { argv: ["fail"], metadata }
        )
        const output = spy.mock.calls.map((call) => String(call[0])).join("\n")
        const exitCode = process.exitCode
        spy.mockRestore()
        expect(output).toContain("string failure")
        expect(exitCode).toStrictEqual(1)
    })

    it("should print the stack with --verbose", async () => {
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
        const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {})
        const error = new Error("boom")
        await execute(
            [
                {
                    name: "fail",
                    run: () => {
                        throw error
                    }
                }
            ],
            { argv: ["fail", "--verbose"], metadata }
        )
        const infoOutput = infoSpy.mock.calls
            .map((call) => String(call[0]))
            .join("\n")
        errorSpy.mockRestore()
        infoSpy.mockRestore()
        expect(infoOutput).toContain("Error: boom")
    })

    it("should rethrow the original error with onError: 'throw'", async () => {
        const error = new CmdoreError("explode", { code: "cmdore.custom" })
        await expect(
            execute(
                [
                    {
                        name: "fail",
                        run: () => {
                            throw error
                        }
                    }
                ],
                { argv: ["fail"], metadata, onError: "throw" }
            )
        ).rejects.toBe(error)
    })

    it("should not touch process.exitCode with onError: 'throw'", async () => {
        const error = new Error("boom")
        process.exitCode = 0
        await expect(
            execute(
                [
                    {
                        name: "fail",
                        run: () => {
                            throw error
                        }
                    }
                ],
                { argv: ["fail"], metadata, onError: "throw" }
            )
        ).rejects.toBe(error)
        expect(process.exitCode).toStrictEqual(0)
    })
})

describe("execute - --help flag", () => {
    it("should not throw when --help is passed", async () => {
        const spy = vi.spyOn(console, "log").mockImplementation(() => {})
        await execute([{ name: "build", description: "Build the project" }], {
            argv: ["--help"],
            metadata
        })
        spy.mockRestore()
    })

    it("should show help when no command is given", async () => {
        const spy = vi.spyOn(console, "log").mockImplementation(() => {})
        await execute([], { argv: [], metadata })
        expect(spy).toHaveBeenCalled()
        spy.mockRestore()
    })

    it("should list registered commands in program-level help", async () => {
        const spy = vi.spyOn(console, "log").mockImplementation(() => {})
        await execute(
            [
                { name: "build", description: "Build the project" },
                { name: "deploy", description: "Deploy the project" }
            ],
            { argv: [], metadata }
        )
        const output = spy.mock.calls.map((call) => String(call[0])).join("\n")
        spy.mockRestore()
        expect(output).toContain("build")
        expect(output).toContain("deploy")
        expect(output).toContain("COMMANDS")
    })

    it("should show command-specific help", async () => {
        const spy = vi.spyOn(console, "log").mockImplementation(() => {})
        await execute(
            [{ name: "build", options: [{ name: "watch", arity: 0 }] }],
            { argv: ["build", "--help"], metadata }
        )
        expect(spy).toHaveBeenCalled()
        spy.mockRestore()
    })
})

describe("execute - --version flag", () => {
    it("should not throw when --version is passed", async () => {
        const spy = vi.spyOn(console, "log").mockImplementation(() => {})
        await execute([], { argv: ["--version"], metadata })
        expect(spy).toHaveBeenCalled()
        spy.mockRestore()
    })

    it("should print the metadata version", async () => {
        const spy = vi.spyOn(console, "log").mockImplementation(() => {})
        await execute([], { argv: ["--version"], metadata })
        const output = spy.mock.calls.map((call) => String(call[0])).join("\n")
        spy.mockRestore()
        expect(output).toContain("0.0.8")
    })
})

describe("execute - --dry-run flag", () => {
    it("should disable effect execution", async () => {
        let effectCallbackRan = false
        await execute(
            [
                {
                    name: "deploy",
                    run: () => {
                        effect(() => {
                            effectCallbackRan = true
                        })
                    }
                }
            ],
            { argv: ["deploy", "--dry-run"], metadata }
        )
        expect(effectCallbackRan).toStrictEqual(false)
    })
})

describe("execute - --quiet flag", () => {
    it("should suppress console.log during command execution", async () => {
        const output: string[] = []
        const spy = vi
            .spyOn(console, "log")
            .mockImplementation((...args: any[]) => {
                output.push(String(args[0]))
            })
        await execute(
            [
                {
                    name: "greet",
                    run: () => {
                        console.log("hello")
                    }
                }
            ],
            { argv: ["greet", "--quiet"], metadata }
        )
        spy.mockRestore()
        expect(output).not.toContain("hello")
    })
})

describe("execute - --verbose flag", () => {
    // NOTE: vi.spyOn(...).mockRestore() clears recorded calls, so every test
    // below captures the call counts/args into locals *before* restoring, then
    // asserts on those locals.
    it("should suppress console.info and console.debug by default", async () => {
        const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {})
        const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {})
        await execute(
            [
                {
                    name: "build",
                    run: () => {
                        console.info("info-line")
                        console.debug("debug-line")
                    }
                }
            ],
            { argv: ["build"], metadata }
        )
        const infoCalls = infoSpy.mock.calls.length
        const debugCalls = debugSpy.mock.calls.length
        infoSpy.mockRestore()
        debugSpy.mockRestore()
        // Without --verbose, execute() mocks console.info/debug with a no-op,
        // so our spies never see the calls made inside run().
        expect(infoCalls).toStrictEqual(0)
        expect(debugCalls).toStrictEqual(0)
    })

    it("should un-mock console.info and console.debug with --verbose", async () => {
        const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {})
        const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {})
        await execute(
            [
                {
                    name: "build",
                    run: () => {
                        console.info("info-line")
                        console.debug("debug-line")
                    }
                }
            ],
            { argv: ["build", "--verbose"], metadata }
        )
        const infoArgs = infoSpy.mock.calls.map((call) => call[0])
        const debugArgs = debugSpy.mock.calls.map((call) => call[0])
        infoSpy.mockRestore()
        debugSpy.mockRestore()
        // With --verbose, execute() leaves console.info/debug alone, so the
        // spies installed before execution still capture the calls.
        expect(infoArgs).toContain("info-line")
        expect(debugArgs).toContain("debug-line")
    })

    it("should keep console.info/debug active but suppress log/warn/error with --quiet --verbose", async () => {
        const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {})
        const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
        await execute(
            [
                {
                    name: "build",
                    run: () => {
                        console.info("info-line")
                        console.log("log-line")
                        console.warn("warn-line")
                    }
                }
            ],
            { argv: ["build", "--quiet", "--verbose"], metadata }
        )
        const infoArgs = infoSpy.mock.calls.map((call) => call[0])
        const logCalls = logSpy.mock.calls.length
        const warnCalls = warnSpy.mock.calls.length
        infoSpy.mockRestore()
        logSpy.mockRestore()
        warnSpy.mockRestore()
        // --verbose un-suppresses info/debug...
        expect(infoArgs).toContain("info-line")
        // ...while --quiet still suppresses log/warn/error.
        expect(logCalls).toStrictEqual(0)
        expect(warnCalls).toStrictEqual(0)
    })

    it("should keep console.info/debug suppressed with --json even when --verbose is set", async () => {
        const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {})
        const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {})
        await execute(
            [
                {
                    name: "build",
                    run: () => {
                        console.info("info-line")
                        console.debug("debug-line")
                    }
                }
            ],
            { argv: ["build", "--verbose", "--json"], metadata }
        )
        const infoCalls = infoSpy.mock.calls.length
        const debugCalls = debugSpy.mock.calls.length
        infoSpy.mockRestore()
        debugSpy.mockRestore()
        // The `|| flags.json` clause forces suppression of info/debug regardless
        // of --verbose.
        expect(infoCalls).toStrictEqual(0)
        expect(debugCalls).toStrictEqual(0)
    })
})

describe("execute - --json flag", () => {
    afterEach(() => {
        terminal.jsonMode = false
    })

    it("should set terminal.jsonMode during execution", async () => {
        let captured = false
        await execute(
            [
                {
                    name: "list",
                    run: () => {
                        captured = terminal.jsonMode
                    }
                }
            ],
            { argv: ["list", "--json"], metadata }
        )
        expect(captured).toStrictEqual(true)
    })

    it("should restore terminal.jsonMode after execution", async () => {
        await execute([{ name: "list", run: () => {} }], {
            argv: ["list", "--json"],
            metadata
        })
        expect(terminal.jsonMode).toStrictEqual(false)
    })

    it("should restore terminal.jsonMode after error", async () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {})
        await execute(
            [
                {
                    name: "fail",
                    run: () => {
                        throw new Error("boom")
                    }
                }
            ],
            { argv: ["fail", "--json"], metadata }
        )
        spy.mockRestore()
        expect(terminal.jsonMode).toStrictEqual(false)
    })

    it("should suppress terminal.log in json mode", async () => {
        const spy = vi.spyOn(console, "log").mockImplementation(() => {})
        await execute(
            [
                {
                    name: "list",
                    run: () => {
                        terminal.log("human output")
                    }
                }
            ],
            { argv: ["list", "--json"], metadata }
        )
        spy.mockRestore()
        expect(spy).not.toHaveBeenCalled()
    })

    it("should output terminal.json in json mode", async () => {
        const output: string[] = []
        const spy = vi
            .spyOn(process.stdout, "write")
            .mockImplementation((...args: any[]) => {
                output.push(String(args[0]))
                return true
            })
        await execute(
            [
                {
                    name: "list",
                    run: () => {
                        terminal.json({ id: 1 })
                        terminal.json({ id: 2 })
                    }
                }
            ],
            { argv: ["list", "--json"], metadata }
        )
        spy.mockRestore()
        const lines = output.map((line) => JSON.parse(line))
        expect(lines).toContainEqual({ id: 1 })
        expect(lines).toContainEqual({ id: 2 })
    })
})

describe("execute - --no-colors flag", () => {
    it("should set terminal.colors to false during execution", async () => {
        let captured = true
        await execute(
            [
                {
                    name: "paint",
                    run: () => {
                        captured = terminal.colors
                    }
                }
            ],
            { argv: ["paint", "--no-colors"], metadata }
        )
        expect(captured).toStrictEqual(false)
    })

    it("should restore terminal.colors after execution", async () => {
        await execute([{ name: "paint", run: () => {} }], {
            argv: ["paint", "--no-colors"],
            metadata
        })
        expect(terminal.colors).toStrictEqual(true)
    })

    it("should restore terminal.colors after error", async () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {})
        await execute(
            [
                {
                    name: "fail",
                    run: () => {
                        throw new Error("boom")
                    }
                }
            ],
            { argv: ["fail", "--no-colors"], metadata }
        )
        spy.mockRestore()
        expect(terminal.colors).toStrictEqual(true)
    })
})

describe("execute - option parsing", () => {
    it("should resolve option alias", async () => {
        let received: unknown = null
        await execute(
            [
                {
                    name: "serve",
                    options: [{ name: "port", alias: "p" }],
                    run(argv: any) {
                        received = argv
                    }
                }
            ],
            { argv: ["serve", "-p", "3000"], metadata }
        )
        expect(received).toStrictEqual({ port: ["3000"] })
    })

    it("should use defaultValue when flag is absent", async () => {
        let received: unknown = null
        await execute(
            [
                {
                    name: "serve",
                    options: [{ name: "port", defaultValue: () => "8080" }],
                    run(argv: any) {
                        received = argv
                    }
                }
            ],
            { argv: ["serve"], metadata }
        )
        expect(received).toStrictEqual({ port: "8080" })
    })

    it("should render and set exitCode when a required option is missing", async () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {})
        await expect(
            execute(
                [
                    {
                        name: "deploy",
                        options: [{ name: "env", required: true }]
                    }
                ],
                { argv: ["deploy"], metadata }
            )
        ).resolves.toBeUndefined()
        const output = spy.mock.calls.map((call) => String(call[0])).join("\n")
        const exitCode = process.exitCode
        spy.mockRestore()
        expect(output).toContain(`An option "env" is required.`)
        expect(exitCode).toStrictEqual(2)
    })

    it("should use schema result in argv", async () => {
        let received: unknown = null
        await execute(
            [
                {
                    name: "serve",
                    options: [
                        {
                            name: "port",
                            arity: 1,
                            schema: numberSchema
                        }
                    ],
                    run(argv: any) {
                        received = argv
                    }
                }
            ],
            { argv: ["serve", "--port", "3000"], metadata }
        )
        expect(received).toStrictEqual({ port: 3000 })
    })

    it("should render and set exitCode when a schema rejects", async () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {})
        await expect(
            execute(
                [
                    {
                        name: "serve",
                        options: [
                            {
                                name: "port",
                                arity: 1,
                                schema: numberSchema
                            }
                        ]
                    }
                ],
                { argv: ["serve", "--port", "abc"], metadata }
            )
        ).resolves.toBeUndefined()
        const output = spy.mock.calls.map((call) => String(call[0])).join("\n")
        const exitCode = process.exitCode
        spy.mockRestore()
        expect(output).toContain("not a number")
        expect(exitCode).toStrictEqual(2)
    })
})

describe("execute - interceptors", () => {
    it("should fire when all dependency options are present", async () => {
        let intercepted = false
        const tokenOption = { name: "token" }
        await execute(
            [{ name: "deploy", options: [tokenOption], run: () => {} }],
            {
                argv: ["deploy", "--token", "abc"],
                metadata,
                interceptors: [
                    intercept([tokenOption], async () => {
                        intercepted = true
                    })
                ]
            }
        )
        expect(intercepted).toStrictEqual(true)
    })

    it("should not fire when dependency options are missing", async () => {
        let intercepted = false
        const tokenOption = { name: "token" }
        const otherOption = { name: "other" }
        await execute(
            [{ name: "deploy", options: [otherOption], run: () => {} }],
            {
                argv: ["deploy", "--other", "val"],
                metadata,
                interceptors: [
                    intercept([tokenOption], async () => {
                        intercepted = true
                    })
                ]
            }
        )
        expect(intercepted).toStrictEqual(false)
    })

    it("should build a well-formed interceptor", () => {
        const tokenOption = { name: "token" }
        const handler = async () => {}
        const interceptor = intercept([tokenOption], handler)
        expect(interceptor.dependencies).toStrictEqual([tokenOption])
        expect(interceptor.handler).toStrictEqual(handler)
    })
})

describe("execute - configuration", () => {
    it("should not throw with a minimal configuration", async () => {
        await expect(
            execute([], { argv: [], metadata })
        ).resolves.toBeUndefined()
    })
})

describe("execute - positional arguments", () => {
    it("should pass positional argument to run", async () => {
        let received: unknown = null
        await execute(
            [
                {
                    name: "deploy",
                    arguments: [{ name: "target" }],
                    run(argv: any) {
                        received = argv
                    }
                }
            ],
            { argv: ["deploy", "production"], metadata }
        )
        expect(received).toStrictEqual({ target: "production" })
    })

    it("should pass multiple positional arguments to run", async () => {
        let received: unknown = null
        await execute(
            [
                {
                    name: "deploy",
                    arguments: [{ name: "target" }, { name: "environment" }],
                    run(argv: any) {
                        received = argv
                    }
                }
            ],
            { argv: ["deploy", "app", "staging"], metadata }
        )
        expect(received).toStrictEqual({
            target: "app",
            environment: "staging"
        })
    })

    it("should render and set exitCode when required positional argument is missing", async () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {})
        await expect(
            execute(
                [
                    {
                        name: "deploy",
                        arguments: [{ name: "target", required: true }]
                    }
                ],
                { argv: ["deploy"], metadata }
            )
        ).resolves.toBeUndefined()
        const output = spy.mock.calls.map((call) => String(call[0])).join("\n")
        const exitCode = process.exitCode
        spy.mockRestore()
        expect(output).toContain(`An argument "target" is required.`)
        expect(exitCode).toStrictEqual(2)
    })

    it("should use defaultValue when positional argument is absent", async () => {
        let received: unknown = null
        await execute(
            [
                {
                    name: "deploy",
                    arguments: [
                        { name: "target", defaultValue: () => "production" }
                    ],
                    run(argv: any) {
                        received = argv
                    }
                }
            ],
            { argv: ["deploy"], metadata }
        )
        expect(received).toStrictEqual({ target: "production" })
    })

    it("should use schema for positional argument", async () => {
        let received: unknown = null
        await execute(
            [
                {
                    name: "scale",
                    arguments: [
                        {
                            name: "count",
                            schema: numberSchema
                        }
                    ],
                    run(argv: any) {
                        received = argv
                    }
                }
            ],
            { argv: ["scale", "5"], metadata }
        )
        expect(received).toStrictEqual({ count: 5 })
    })

    it("should collect remaining operands for variadic argument", async () => {
        let received: unknown = null
        await execute(
            [
                {
                    name: "rm",
                    arguments: [{ name: "files", variadic: true }],
                    run(argv: any) {
                        received = argv
                    }
                }
            ],
            { argv: ["rm", "a.ts", "b.ts", "c.ts"], metadata }
        )
        expect(received).toStrictEqual({ files: ["a.ts", "b.ts", "c.ts"] })
    })

    it("should support mixed positional and variadic arguments", async () => {
        let received: unknown = null
        await execute(
            [
                {
                    name: "cp",
                    arguments: [
                        { name: "destination" },
                        { name: "files", variadic: true }
                    ],
                    run(argv: any) {
                        received = argv
                    }
                }
            ],
            { argv: ["cp", "dist/", "a.ts", "b.ts"], metadata }
        )
        expect(received).toStrictEqual({
            destination: "dist/",
            files: ["a.ts", "b.ts"]
        })
    })

    it("should merge positional arguments with named options", async () => {
        let received: unknown = null
        await execute(
            [
                {
                    name: "deploy",
                    arguments: [{ name: "target" }],
                    options: [{ name: "force", arity: 0 }],
                    run(argv: any) {
                        received = argv
                    }
                }
            ],
            { argv: ["deploy", "production", "--force"], metadata }
        )
        expect(received).toStrictEqual({ target: "production", force: true })
    })

    it("should render and set exitCode when variadic argument is not the last", async () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {})
        await expect(
            execute(
                [
                    {
                        name: "bad",
                        arguments: [
                            { name: "files", variadic: true },
                            { name: "target" }
                        ]
                    }
                ],
                { argv: ["bad"], metadata }
            )
        ).resolves.toBeUndefined()
        const output = spy.mock.calls.map((call) => String(call[0])).join("\n")
        const exitCode = process.exitCode
        spy.mockRestore()
        expect(output).toContain(
            `A variadic argument "files" must be the last argument.`
        )
        expect(exitCode).toStrictEqual(1)
    })

    it("should tag the variadic error with code cmdore.invalidArgument", async () => {
        await expect(
            execute(
                [
                    {
                        name: "bad",
                        arguments: [
                            { name: "files", variadic: true },
                            { name: "target" }
                        ]
                    }
                ],
                { argv: ["bad"], metadata, onError: "throw" }
            )
        ).rejects.toMatchObject({ code: "cmdore.invalidArgument" })
    })

    it("should show arguments in help output", async () => {
        const spy = vi.spyOn(console, "log").mockImplementation(() => {})
        await execute(
            [
                {
                    name: "deploy",
                    arguments: [
                        {
                            name: "target",
                            required: true,
                            description: "Deploy target"
                        },
                        {
                            name: "environment",
                            description: "Target environment"
                        }
                    ]
                }
            ],
            { argv: ["deploy", "--help"], metadata }
        )
        const output = spy.mock.calls.map((call) => String(call[0])).join("\n")
        spy.mockRestore()
        expect(output).toContain("<target>")
        expect(output).toContain("[environment]")
        expect(output).toContain("ARGUMENTS")
    })
})

describe("execute - repeated variadic options", () => {
    it("should accumulate values across repeated occurrences of a variadic option", async () => {
        let received: unknown = null
        await execute(
            [
                {
                    name: "open",
                    options: [{ name: "repos" }],
                    run(argv: any) {
                        received = argv
                    }
                }
            ],
            { argv: ["open", "--repos", "a", "--repos", "b"], metadata }
        )
        expect(received).toStrictEqual({ repos: ["a", "b"] })
    })

    it("should treat `--x a --x b` the same as `--x a b`", async () => {
        let split: unknown = null
        let inline: unknown = null
        await execute(
            [
                {
                    name: "open",
                    options: [{ name: "repos" }],
                    run(argv: any) {
                        split = argv
                    }
                }
            ],
            { argv: ["open", "--repos", "a", "--repos", "b"], metadata }
        )
        await execute(
            [
                {
                    name: "open",
                    options: [{ name: "repos" }],
                    run(argv: any) {
                        inline = argv
                    }
                }
            ],
            { argv: ["open", "--repos", "a", "b"], metadata }
        )
        expect(split).toStrictEqual({ repos: ["a", "b"] })
        expect(inline).toStrictEqual(split)
    })

    it("should accumulate across alias and long-form occurrences", async () => {
        let received: unknown = null
        await execute(
            [
                {
                    name: "open",
                    options: [{ name: "repos", alias: "r" }],
                    run(argv: any) {
                        received = argv
                    }
                }
            ],
            { argv: ["open", "-r", "a", "--repos", "b"], metadata }
        )
        expect(received).toStrictEqual({ repos: ["a", "b"] })
    })

    it("should keep last-wins for a repeated single-value (arity 1) option", async () => {
        let received: unknown = null
        await execute(
            [
                {
                    name: "serve",
                    options: [{ name: "port", arity: 1 }],
                    run(argv: any) {
                        received = argv
                    }
                }
            ],
            { argv: ["serve", "--port", "3000", "--port", "4000"], metadata }
        )
        expect(received).toStrictEqual({ port: "4000" })
    })

    it("should not leak a repeated arity-1 value into a positional argument", async () => {
        let received: unknown = null
        await execute(
            [
                {
                    name: "serve",
                    arguments: [{ name: "target" }],
                    options: [{ name: "port", arity: 1 }],
                    run(argv: any) {
                        received = argv
                    }
                }
            ],
            {
                argv: ["serve", "host", "--port", "3000", "--port", "4000"],
                metadata
            }
        )
        expect(received).toStrictEqual({ target: "host", port: "4000" })
    })
})

describe("execute - unknown flag rejection", () => {
    it("should reject an unknown long flag with a clear message", async () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {})
        await expect(
            execute([{ name: "open", run: () => {} }], {
                argv: ["open", "--bogus"],
                metadata
            })
        ).resolves.toBeUndefined()
        const output = spy.mock.calls.map((call) => String(call[0])).join("\n")
        const exitCode = process.exitCode
        spy.mockRestore()
        expect(output).toContain(`An option "--bogus" is unknown.`)
        expect(exitCode).toStrictEqual(2)
    })

    it("should tag the unknown-flag error with code cmdore.unknownFlag", async () => {
        await expect(
            execute([{ name: "open", run: () => {} }], {
                argv: ["open", "--bogus"],
                metadata,
                onError: "throw"
            })
        ).rejects.toMatchObject({ code: "cmdore.unknownFlag" })
    })

    it("should reject an unknown short flag", async () => {
        await expect(
            execute([{ name: "open", run: () => {} }], {
                argv: ["open", "-x"],
                metadata,
                onError: "throw"
            })
        ).rejects.toMatchObject({ code: "cmdore.unknownFlag" })
    })

    it("should reject an unknown flag written in --name=value form", async () => {
        await expect(
            execute([{ name: "open", run: () => {} }], {
                argv: ["open", "--bogus=1"],
                metadata,
                onError: "throw"
            })
        ).rejects.toMatchObject({ code: "cmdore.unknownFlag" })
    })

    it("should accept a defined global flag (--dry-run)", async () => {
        let ran = false
        await execute(
            [
                {
                    name: "open",
                    run: () => {
                        ran = true
                    }
                }
            ],
            { argv: ["open", "--dry-run"], metadata, onError: "throw" }
        )
        expect(ran).toStrictEqual(true)
    })

    it("should accept a defined per-command option", async () => {
        let received: unknown = null
        await execute(
            [
                {
                    name: "open",
                    options: [{ name: "repos" }],
                    run(argv: any) {
                        received = argv
                    }
                }
            ],
            { argv: ["open", "--repos", "a"], metadata, onError: "throw" }
        )
        expect(received).toStrictEqual({ repos: ["a"] })
    })

    it("should not treat tokens after `--` as unknown flags", async () => {
        let received: unknown = null
        await execute(
            [
                {
                    name: "open",
                    arguments: [{ name: "files", variadic: true }],
                    run(argv: any) {
                        received = argv
                    }
                }
            ],
            { argv: ["open", "--", "--bogus"], metadata, onError: "throw" }
        )
        expect(received).toStrictEqual({ files: ["--bogus"] })
    })
})

describe("execute - commandless", () => {
    it("should run a single command with no subcommand token", async () => {
        let ran = false
        await execute(
            {
                name: "greet",
                run: () => {
                    ran = true
                }
            },
            { argv: [], metadata }
        )
        expect(ran).toStrictEqual(true)
    })

    it("should map the first operand to arguments[0] without a subcommand token", async () => {
        let received: unknown = null
        await execute(
            {
                name: "greet",
                arguments: [{ name: "name" }],
                run(argv: any) {
                    received = argv
                }
            },
            { argv: ["world"], metadata }
        )
        expect(received).toStrictEqual({ name: "world" })
    })

    it("should render and set exitCode when a required argument is missing", async () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {})
        await expect(
            execute(
                {
                    name: "greet",
                    arguments: [{ name: "name", required: true }]
                },
                { argv: [], metadata }
            )
        ).resolves.toBeUndefined()
        const output = spy.mock.calls.map((call) => String(call[0])).join("\n")
        const exitCode = process.exitCode
        spy.mockRestore()
        expect(output).toContain(`An argument "name" is required.`)
        expect(exitCode).toStrictEqual(2)
    })

    it("should throw a CmdoreError for a missing required argument with onError: 'throw'", async () => {
        await expect(
            execute(
                {
                    name: "greet",
                    arguments: [{ name: "name", required: true }]
                },
                { argv: [], metadata, onError: "throw" }
            )
        ).rejects.toBeInstanceOf(CmdoreError)
    })

    it("should collect all operands into a variadic argument", async () => {
        let received: unknown = null
        await execute(
            {
                name: "rm",
                arguments: [{ name: "files", variadic: true }],
                run(argv: any) {
                    received = argv
                }
            },
            { argv: ["a.ts", "b.ts", "c.ts"], metadata }
        )
        expect(received).toStrictEqual({ files: ["a.ts", "b.ts", "c.ts"] })
    })

    it("should not repeat the command name in the --help USAGE line", async () => {
        const greetMetadata = {
            name: "greet",
            version: "1.0.0",
            description: "A greeting CLI"
        }
        const spy = vi.spyOn(console, "log").mockImplementation(() => {})
        await execute(
            {
                name: "greet",
                description: "Print a friendly greeting",
                arguments: [{ name: "name", required: true }],
                options: [
                    {
                        name: "loud",
                        alias: "l",
                        arity: 0,
                        description: "Shout the greeting"
                    }
                ]
            },
            { argv: ["--help"], metadata: greetMetadata }
        )
        const output = spy.mock.calls.map((call) => String(call[0])).join("\n")
        spy.mockRestore()
        // The USAGE line reads "greet <name> [options]" — the program name
        // appears once, never "greet greet <name> ...".
        const usageLine = output
            .split("\n")
            .find((line) => line.trim().startsWith("greet <name>"))
        expect(usageLine).toBeDefined()
        expect(output).not.toContain("greet greet")
        // The title reuses the command description but omits the command name.
        expect(output).toContain("Print a friendly greeting")
        expect(output).toContain("USAGE")
    })

    it("should support --json structured output", async () => {
        const output: string[] = []
        const spy = vi
            .spyOn(process.stdout, "write")
            .mockImplementation((...args: any[]) => {
                output.push(String(args[0]))
                return true
            })
        await execute(
            {
                name: "list",
                run: () => {
                    terminal.json({ id: 1 })
                }
            },
            { argv: ["--json"], metadata }
        )
        spy.mockRestore()
        terminal.jsonMode = false
        const lines = output.map((line) => JSON.parse(line))
        expect(lines).toContainEqual({ id: 1 })
    })

    it("should support --quiet by suppressing console.log during run", async () => {
        const captured: string[] = []
        const spy = vi
            .spyOn(console, "log")
            .mockImplementation((...args: any[]) => {
                captured.push(String(args[0]))
            })
        await execute(
            {
                name: "greet",
                run: () => {
                    console.log("hello")
                }
            },
            { argv: ["--quiet"], metadata }
        )
        spy.mockRestore()
        expect(captured).not.toContain("hello")
    })

    it("should support --dry-run by skipping effect execution", async () => {
        let effectCallbackRan = false
        await execute(
            {
                name: "deploy",
                run: () => {
                    effect(() => {
                        effectCallbackRan = true
                    })
                }
            },
            { argv: ["--dry-run"], metadata }
        )
        expect(effectCallbackRan).toStrictEqual(false)
    })

    it("should support --version", async () => {
        const spy = vi.spyOn(console, "log").mockImplementation(() => {})
        await execute(
            { name: "greet", run: () => {} },
            {
                argv: ["--version"],
                metadata
            }
        )
        const output = spy.mock.calls.map((call) => String(call[0])).join("\n")
        spy.mockRestore()
        expect(output).toContain("0.0.8")
    })

    it("should not treat the first operand as a subcommand (regression vs array form)", async () => {
        // In commandless mode the operand "build" is data, not a command name:
        // it maps straight to arguments[0] rather than being consumed as a
        // dispatch token (which would leave the argument undefined).
        let received: unknown = null
        await execute(
            {
                name: "whatever",
                arguments: [{ name: "subject" }],
                run(argv: any) {
                    received = argv
                }
            },
            { argv: ["build"], metadata }
        )
        expect(received).toStrictEqual({ subject: "build" })
    })

    it("should still dispatch by name in the array form (regression)", async () => {
        const ran: string[] = []
        const commands: Command<any, any>[] = [
            {
                name: "build",
                run: () => {
                    ran.push("build")
                }
            },
            {
                name: "test",
                run: () => {
                    ran.push("test")
                }
            }
        ]
        // The array form consumes the first token as the subcommand name.
        await execute(commands, { argv: ["build"], metadata })
        await execute(commands, { argv: ["test"], metadata })
        expect(ran).toStrictEqual(["build", "test"])
    })

    it("should still pass a positional operand after the subcommand in the array form (regression)", async () => {
        let received: unknown = null
        await execute(
            [
                {
                    name: "deploy",
                    arguments: [{ name: "target" }],
                    run(argv: any) {
                        received = argv
                    }
                }
            ],
            { argv: ["deploy", "production"], metadata }
        )
        expect(received).toStrictEqual({ target: "production" })
    })
})
