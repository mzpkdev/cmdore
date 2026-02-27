import { describe, expect, it, vi } from "vitest"
import { createProgram } from "./index"

const metadata = { name: "git", version: "0.0.0", description: "A git CLI" }

describe("push", () => {
    it("should push with intercepted auth token", async () => {
        const output: string[] = []
        const spy = vi
            .spyOn(console, "log")
            .mockImplementation((...args: any[]) => {
                output.push(String(args[0]))
            })
        await createProgram(metadata).execute(["push", "--token", "abc123"])
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
        await createProgram(metadata).execute([
            "push",
            "--token",
            "mytoken",
            "--force"
        ])
        spy.mockRestore()
        expect(output).toContain("Pushing with auth=MYTOKEN")
        expect(output).toContain("Force push enabled")
    })

    it("should throw when --token is missing", async () => {
        await expect(
            createProgram(metadata).execute(["push"])
        ).rejects.toThrowError('An option "token" is required.')
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
        await createProgram(metadata).execute(["status"])
        spy.mockRestore()
        expect(output).toContain("Status: clean")
        expect(output).not.toContain("Pushing")
    })
})
