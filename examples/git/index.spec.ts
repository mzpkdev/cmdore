import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { program } from "./index"

// execute() now funnels errors: it renders the message and sets
// process.exitCode instead of rejecting. Save/restore process.exitCode so the
// error-path tests below don't leak a non-zero exit into the vitest run.
let previousExitCode: typeof process.exitCode
beforeEach(() => {
    previousExitCode = process.exitCode
})
afterEach(() => {
    process.exitCode = previousExitCode ?? 0
})

describe("push", () => {
    it("should push with intercepted auth token", async () => {
        const output: string[] = []
        const spy = vi
            .spyOn(console, "log")
            .mockImplementation((...args: any[]) => {
                output.push(String(args[0]))
            })
        await program(["push", "--token", "abc123"])
        spy.mockRestore()
        expect(output).toContain("Authenticating...")
        expect(output).toContain("Pushing with token=ABC123")
    })

    it("should support --force flag", async () => {
        const output: string[] = []
        const spy = vi
            .spyOn(console, "log")
            .mockImplementation((...args: any[]) => {
                output.push(String(args[0]))
            })
        await program(["push", "--token", "mytoken", "--force"])
        spy.mockRestore()
        expect(output).toContain("Authenticating...")
        expect(output).toContain("Pushing with token=MYTOKEN")
        expect(output).toContain("Force push enabled")
    })

    it("should output JSON with --json", async () => {
        const output: string[] = []
        const spy = vi
            .spyOn(process.stdout, "write")
            .mockImplementation((...args: any[]) => {
                output.push(String(args[0]))
                return true
            })
        await program(["push", "--token", "abc123", "--json"])
        spy.mockRestore()
        const lines = output.map((line) => JSON.parse(line))
        expect(lines).toContainEqual({
            action: "push",
            token: "ABC123",
            force: false
        })
    })

    it("should include force in JSON output", async () => {
        const output: string[] = []
        const spy = vi
            .spyOn(process.stdout, "write")
            .mockImplementation((...args: any[]) => {
                output.push(String(args[0]))
                return true
            })
        await program(["push", "--token", "mytoken", "--force", "--json"])
        spy.mockRestore()
        const lines = output.map((line) => JSON.parse(line))
        expect(lines).toContainEqual({
            action: "push",
            token: "MYTOKEN",
            force: true
        })
    })

    it("should render an error when --token is missing", async () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {})
        await expect(program(["push"])).resolves.toBeUndefined()
        const output = spy.mock.calls.map((call) => String(call[0])).join("\n")
        const exitCode = process.exitCode
        spy.mockRestore()
        expect(output).toContain('An option "token" is required.')
        expect(exitCode).toStrictEqual(1)
    })
})

describe("status", () => {
    it("should show status without triggering interceptor", async () => {
        const output: string[] = []
        const spy = vi
            .spyOn(console, "log")
            .mockImplementation((...args: any[]) => {
                output.push(String(args[0]))
            })
        await program(["status"])
        spy.mockRestore()
        expect(output).toContain("Status: clean")
        expect(output).not.toContain("Authenticating")
        expect(output).not.toContain("Pushing")
    })

    it("should output JSON with --json", async () => {
        const output: string[] = []
        const spy = vi
            .spyOn(process.stdout, "write")
            .mockImplementation((...args: any[]) => {
                output.push(String(args[0]))
                return true
            })
        await program(["status", "--json"])
        spy.mockRestore()
        const lines = output.map((line) => JSON.parse(line))
        expect(lines).toContainEqual({ status: "clean" })
    })
})
