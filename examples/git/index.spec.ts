import { describe, expect, it, vi } from "vitest"
import { program } from "./index"

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

    it("should throw when --token is missing", async () => {
        await expect(program(["push"])).rejects.toThrowError(
            'An option "token" is required.'
        )
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
