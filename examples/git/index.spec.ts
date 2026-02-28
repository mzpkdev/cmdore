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
        await program.execute(["push", "--token", "abc123"])
        spy.mockRestore()
        expect(output).toContain("Pushing with auth=ABC123")
    })

    it("should support --force flag", async () => {
        const output: string[] = []
        const spy = vi
            .spyOn(console, "log")
            .mockImplementation((...args: any[]) => {
                output.push(String(args[0]))
            })
        await program.execute(["push", "--token", "mytoken", "--force"])
        spy.mockRestore()
        expect(output).toContain("Pushing with auth=MYTOKEN")
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
        await program.execute(["push", "--token", "abc123", "--json"])
        spy.mockRestore()
        expect(output).toContain(
            `${JSON.stringify({ action: "push", auth: "ABC123", force: false })}\n`
        )
    })

    it("should include force in JSON output", async () => {
        const output: string[] = []
        const spy = vi
            .spyOn(process.stdout, "write")
            .mockImplementation((...args: any[]) => {
                output.push(String(args[0]))
                return true
            })
        await program.execute([
            "push",
            "--token",
            "mytoken",
            "--force",
            "--json"
        ])
        spy.mockRestore()
        expect(output).toContain(
            `${JSON.stringify({ action: "push", auth: "MYTOKEN", force: true })}\n`
        )
    })

    it("should throw when --token is missing", async () => {
        await expect(program.execute(["push"])).rejects.toThrowError(
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
        await program.execute(["status"])
        spy.mockRestore()
        expect(output).toContain("Status: clean")
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
        await program.execute(["status", "--json"])
        spy.mockRestore()
        expect(output).toContain(`${JSON.stringify({ status: "clean" })}\n`)
    })
})
