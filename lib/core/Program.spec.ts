import { afterEach, describe, expect, it, vi } from "vitest"
import { effect, terminal } from "../tools"
import Program from "./Program"

const metadata = { name: "cmdore", version: "0.0.8", description: "A test CLI" }

describe("Program.register", () => {
    it("should return this for chaining", () => {
        const program = new Program({ metadata })
        const result = program.register({ name: "build", run: () => {} })
        expect(result).toStrictEqual(program)
    })

    it("should register multiple commands", async () => {
        const program = new Program({ metadata })
        const ran: string[] = []
        program.register({
            name: "build",
            run: () => {
                ran.push("build")
            }
        })
        program.register({
            name: "test",
            run: () => {
                ran.push("test")
            }
        })
        await program.execute(["build"])
        await program.execute(["test"])
        expect(ran).toStrictEqual(["build", "test"])
    })
})

describe("Program.execute", () => {
    describe("command dispatch", () => {
        it("should throw when command does not exist", async () => {
            const program = new Program({ metadata })
            await expect(program.execute(["nonexistent"])).rejects.toThrowError(
                `A command "nonexistent" does not exist.`
            )
        })

        it("should call the run function with parsed argv", async () => {
            let received: unknown = null
            const program = new Program({ metadata })
            program.register({
                name: "serve",
                options: [{ name: "port" }],
                run(argv: any) {
                    received = argv
                }
            })
            await program.execute(["serve", "--port", "3000"])
            expect(received).toStrictEqual({ port: ["3000"] })
        })

        it("should call run with empty argv when command has no options", async () => {
            let ran = false
            const program = new Program({ metadata })
            program.register({
                name: "ping",
                run: () => {
                    ran = true
                }
            })
            await program.execute(["ping"])
            expect(ran).toStrictEqual(true)
        })
    })

    describe("--help flag", () => {
        it("should not throw when --help is passed", async () => {
            const program = new Program({ metadata })
            program.register({
                name: "build",
                description: "Build the project"
            })
            const spy = vi.spyOn(console, "log").mockImplementation(() => {})
            await program.execute(["--help"])
            spy.mockRestore()
        })

        it("should show help when no command is given", async () => {
            const program = new Program({ metadata })
            const spy = vi.spyOn(console, "log").mockImplementation(() => {})
            await program.execute([])
            expect(spy).toHaveBeenCalled()
            spy.mockRestore()
        })

        it("should show command-specific help", async () => {
            const program = new Program({ metadata })
            program.register({
                name: "build",
                options: [{ name: "watch", arity: 0 }]
            })
            const spy = vi.spyOn(console, "log").mockImplementation(() => {})
            await program.execute(["build", "--help"])
            expect(spy).toHaveBeenCalled()
            spy.mockRestore()
        })
    })

    describe("--version flag", () => {
        it("should not throw when --version is passed", async () => {
            const program = new Program({ metadata })
            const spy = vi.spyOn(console, "log").mockImplementation(() => {})
            await program.execute(["--version"])
            expect(spy).toHaveBeenCalled()
            spy.mockRestore()
        })
    })

    describe("--dry-run flag", () => {
        it("should disable effect execution", async () => {
            const program = new Program({ metadata })
            let effectCallbackRan = false
            program.register({
                name: "deploy",
                run: () => {
                    effect(() => {
                        effectCallbackRan = true
                    })
                }
            })
            await program.execute(["deploy", "--dry-run"])
            expect(effectCallbackRan).toStrictEqual(false)
        })
    })

    describe("--quiet flag", () => {
        it("should suppress console.log during command execution", async () => {
            const program = new Program({ metadata })
            const output: string[] = []
            const spy = vi
                .spyOn(console, "log")
                .mockImplementation((...args: any[]) => {
                    output.push(String(args[0]))
                })
            program.register({
                name: "greet",
                run: () => {
                    console.log("hello")
                }
            })
            await program.execute(["greet", "--quiet"])
            spy.mockRestore()
            expect(output).not.toContain("hello")
        })
    })

    describe("--json flag", () => {
        afterEach(() => {
            terminal.jsonMode = false
        })

        it("should set terminal.jsonMode during execution", async () => {
            const program = new Program({ metadata })
            let captured = false
            program.register({
                name: "list",
                run: () => {
                    captured = terminal.jsonMode
                }
            })
            await program.execute(["list", "--json"])
            expect(captured).toStrictEqual(true)
        })

        it("should restore terminal.jsonMode after execution", async () => {
            const program = new Program({ metadata })
            program.register({
                name: "list",
                run: () => {}
            })
            await program.execute(["list", "--json"])
            expect(terminal.jsonMode).toStrictEqual(false)
        })

        it("should restore terminal.jsonMode after error", async () => {
            const program = new Program({ metadata })
            program.register({
                name: "fail",
                run: () => {
                    throw new Error("boom")
                }
            })
            await expect(
                program.execute(["fail", "--json"])
            ).rejects.toThrowError("boom")
            expect(terminal.jsonMode).toStrictEqual(false)
        })

        it("should suppress terminal.log in json mode", async () => {
            const program = new Program({ metadata })
            program.register({
                name: "list",
                run: () => {
                    terminal.log("human output")
                }
            })
            const spy = vi.spyOn(console, "log").mockImplementation(() => {})
            await program.execute(["list", "--json"])
            spy.mockRestore()
            expect(spy).not.toHaveBeenCalled()
        })

        it("should output terminal.json in json mode", async () => {
            const program = new Program({ metadata })
            program.register({
                name: "list",
                run: () => {
                    terminal.json({ id: 1 })
                    terminal.json({ id: 2 })
                }
            })
            const output: string[] = []
            const spy = vi
                .spyOn(process.stdout, "write")
                .mockImplementation((...args: any[]) => {
                    output.push(String(args[0]))
                    return true
                })
            await program.execute(["list", "--json"])
            spy.mockRestore()
            expect(output).toContain(`${JSON.stringify({ id: 1 })}\n`)
            expect(output).toContain(`${JSON.stringify({ id: 2 })}\n`)
        })
    })

    describe("option parsing", () => {
        it("should resolve option alias", async () => {
            let received: unknown = null
            const program = new Program({ metadata })
            program.register({
                name: "serve",
                options: [{ name: "port", alias: "p" }],
                run(argv: any) {
                    received = argv
                }
            })
            await program.execute(["serve", "-p", "3000"])
            expect(received).toStrictEqual({ port: ["3000"] })
        })

        it("should use defaultValue when flag is absent", async () => {
            let received: unknown = null
            const program = new Program({ metadata })
            program.register({
                name: "serve",
                options: [{ name: "port", defaultValue: () => "8080" }],
                run(argv: any) {
                    received = argv
                }
            })
            await program.execute(["serve"])
            expect(received).toStrictEqual({ port: "8080" })
        })

        it("should throw when a required option is missing", async () => {
            const program = new Program({ metadata })
            program.register({
                name: "deploy",
                options: [{ name: "env", required: true }]
            })
            await expect(program.execute(["deploy"])).rejects.toThrowError(
                `An option "env" is required.`
            )
        })

        it("should use validate function result in argv", async () => {
            let received: unknown = null
            const program = new Program({ metadata })
            program.register({
                name: "serve",
                options: [
                    { name: "port", validate: (v: string) => parseInt(v, 10) }
                ],
                run(argv: any) {
                    received = argv
                }
            })
            await program.execute(["serve", "--port", "3000"])
            expect(received).toStrictEqual({ port: 3000 })
        })
    })
})

describe("Program.intercept", () => {
    it("should fire when all dependency options are present", async () => {
        let intercepted = false
        const program = new Program({ metadata })
        const tokenOption = { name: "token" }
        program.intercept([tokenOption], async () => {
            intercepted = true
        })
        program.register({
            name: "deploy",
            options: [tokenOption],
            run: () => {}
        })
        await program.execute(["deploy", "--token", "abc"])
        expect(intercepted).toStrictEqual(true)
    })

    it("should not fire when dependency options are missing", async () => {
        let intercepted = false
        const program = new Program({ metadata })
        const tokenOption = { name: "token" }
        const otherOption = { name: "other" }
        program.intercept([tokenOption], async () => {
            intercepted = true
        })
        program.register({
            name: "deploy",
            options: [otherOption],
            run: () => {}
        })
        await program.execute(["deploy", "--other", "val"])
        expect(intercepted).toStrictEqual(false)
    })

    it("should return this for chaining", () => {
        const program = new Program({ metadata })
        const result = program.intercept([], async () => {})
        expect(result).toStrictEqual(program)
    })
})

describe("Program constructor", () => {
    it("should not throw with no configuration", () => {
        expect(() => new Program()).not.toThrow()
    })
})

describe("positional arguments", () => {
    it("should pass positional argument to run", async () => {
        let received: unknown = null
        const program = new Program({ metadata })
        program.register({
            name: "deploy",
            arguments: [{ name: "target" }],
            run(argv: any) {
                received = argv
            }
        })
        await program.execute(["deploy", "production"])
        expect(received).toStrictEqual({ target: "production" })
    })

    it("should pass multiple positional arguments to run", async () => {
        let received: unknown = null
        const program = new Program({ metadata })
        program.register({
            name: "deploy",
            arguments: [{ name: "target" }, { name: "environment" }],
            run(argv: any) {
                received = argv
            }
        })
        await program.execute(["deploy", "app", "staging"])
        expect(received).toStrictEqual({
            target: "app",
            environment: "staging"
        })
    })

    it("should throw when required positional argument is missing", async () => {
        const program = new Program({ metadata })
        program.register({
            name: "deploy",
            arguments: [{ name: "target", required: true }]
        })
        await expect(program.execute(["deploy"])).rejects.toThrowError(
            `An argument "target" is required.`
        )
    })

    it("should use defaultValue when positional argument is absent", async () => {
        let received: unknown = null
        const program = new Program({ metadata })
        program.register({
            name: "deploy",
            arguments: [{ name: "target", defaultValue: () => "production" }],
            run(argv: any) {
                received = argv
            }
        })
        await program.execute(["deploy"])
        expect(received).toStrictEqual({ target: "production" })
    })

    it("should use validate function for positional argument", async () => {
        let received: unknown = null
        const program = new Program({ metadata })
        program.register({
            name: "scale",
            arguments: [
                { name: "count", validate: (v: string) => parseInt(v, 10) }
            ],
            run(argv: any) {
                received = argv
            }
        })
        await program.execute(["scale", "5"])
        expect(received).toStrictEqual({ count: 5 })
    })

    it("should collect remaining operands for variadic argument", async () => {
        let received: unknown = null
        const program = new Program({ metadata })
        program.register({
            name: "rm",
            arguments: [{ name: "files", variadic: true }],
            run(argv: any) {
                received = argv
            }
        })
        await program.execute(["rm", "a.ts", "b.ts", "c.ts"])
        expect(received).toStrictEqual({ files: ["a.ts", "b.ts", "c.ts"] })
    })

    it("should support mixed positional and variadic arguments", async () => {
        let received: unknown = null
        const program = new Program({ metadata })
        program.register({
            name: "cp",
            arguments: [
                { name: "destination" },
                { name: "files", variadic: true }
            ],
            run(argv: any) {
                received = argv
            }
        })
        await program.execute(["cp", "dist/", "a.ts", "b.ts"])
        expect(received).toStrictEqual({
            destination: "dist/",
            files: ["a.ts", "b.ts"]
        })
    })

    it("should merge positional arguments with named options", async () => {
        let received: unknown = null
        const program = new Program({ metadata })
        program.register({
            name: "deploy",
            arguments: [{ name: "target" }],
            options: [{ name: "force", arity: 0 }],
            run(argv: any) {
                received = argv
            }
        })
        await program.execute(["deploy", "production", "--force"])
        expect(received).toStrictEqual({ target: "production", force: [] })
    })

    it("should throw when variadic argument is not the last", () => {
        const program = new Program({ metadata })
        expect(() =>
            program.register({
                name: "bad",
                arguments: [
                    { name: "files", variadic: true },
                    { name: "target" }
                ]
            })
        ).toThrowError(`A variadic argument "files" must be the last argument.`)
    })

    it("should show arguments in help output", async () => {
        const program = new Program({ metadata })
        program.register({
            name: "deploy",
            arguments: [
                {
                    name: "target",
                    required: true,
                    description: "Deploy target"
                },
                { name: "environment", description: "Target environment" }
            ]
        })
        const spy = vi.spyOn(console, "log").mockImplementation(() => {})
        await program.execute(["deploy", "--help"])
        const output = spy.mock.calls.map((call) => String(call[0])).join("\n")
        spy.mockRestore()
        expect(output).toContain("<target>")
        expect(output).toContain("[environment]")
        expect(output).toContain("ARGUMENTS")
    })
})
