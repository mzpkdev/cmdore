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

describe("greet", () => {
    it("should greet by name", async () => {
        const output: string[] = []
        const spy = vi
            .spyOn(console, "log")
            .mockImplementation((...args: any[]) => {
                output.push(String(args[0]))
            })
        await program(["Alice"])
        spy.mockRestore()
        expect(output).toContain("Hello, Alice!")
    })

    it("should shout the greeting with --loud", async () => {
        const output: string[] = []
        const spy = vi
            .spyOn(console, "log")
            .mockImplementation((...args: any[]) => {
                output.push(String(args[0]))
            })
        await program(["Alice", "--loud"])
        spy.mockRestore()
        expect(output).toContain("HELLO, ALICE!")
    })

    it("should render an error when the required name is missing", async () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {})
        await expect(program([])).resolves.toBeUndefined()
        const output = spy.mock.calls.map((call) => String(call[0])).join("\n")
        const exitCode = process.exitCode
        spy.mockRestore()
        expect(output).toContain("name")
        expect(exitCode).toStrictEqual(1)
    })
})
