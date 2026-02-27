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
})
