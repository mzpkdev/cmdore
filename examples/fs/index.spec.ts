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

describe("copy", () => {
    it("should copy multiple files to a destination", async () => {
        const output: string[] = []
        const spy = vi
            .spyOn(console, "log")
            .mockImplementation((...args: any[]) => {
                output.push(String(args[0]))
            })
        await program(["copy", "dist/", "a.ts", "b.ts", "c.ts"])
        spy.mockRestore()
        expect(output).toContain("Copying a.ts, b.ts, c.ts to dist/")
    })

    it("should output JSON with --json", async () => {
        const output: string[] = []
        const spy = vi
            .spyOn(process.stdout, "write")
            .mockImplementation((...args: any[]) => {
                output.push(String(args[0]))
                return true
            })
        await program(["copy", "dist/", "a.ts", "b.ts", "--json"])
        spy.mockRestore()
        const lines = output.map((line) => JSON.parse(line))
        expect(lines).toContainEqual({
            action: "copy",
            destination: "dist/",
            files: ["a.ts", "b.ts"]
        })
    })

    it("should render an error when destination is missing", async () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {})
        await expect(program(["copy"])).resolves.toBeUndefined()
        const output = spy.mock.calls.map((call) => String(call[0])).join("\n")
        const exitCode = process.exitCode
        spy.mockRestore()
        expect(output).toContain('An argument "destination" is required.')
        expect(exitCode).toStrictEqual(2)
    })
})

describe("remove", () => {
    it("should remove files when --confirm is passed", async () => {
        const output: string[] = []
        const spy = vi
            .spyOn(console, "log")
            .mockImplementation((...args: any[]) => {
                output.push(String(args[0]))
            })
        await program(["remove", "a.ts", "b.ts", "--confirm"])
        spy.mockRestore()
        expect(output).toContain("Removing a.ts, b.ts")
    })

    it("should output JSON with --json", async () => {
        const output: string[] = []
        const spy = vi
            .spyOn(process.stdout, "write")
            .mockImplementation((...args: any[]) => {
                output.push(String(args[0]))
                return true
            })
        await program(["remove", "a.ts", "b.ts", "--confirm", "--json"])
        spy.mockRestore()
        const lines = output.map((line) => JSON.parse(line))
        expect(lines).toContainEqual({
            action: "remove",
            files: ["a.ts", "b.ts"]
        })
    })

    it("should render an error when --confirm is missing", async () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {})
        await expect(program(["remove", "a.ts"])).resolves.toBeUndefined()
        const output = spy.mock.calls.map((call) => String(call[0])).join("\n")
        const exitCode = process.exitCode
        spy.mockRestore()
        expect(output).toContain('An option "confirm" is required.')
        expect(exitCode).toStrictEqual(2)
    })
})
