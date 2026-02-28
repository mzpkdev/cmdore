import { describe, expect, it, vi } from "vitest"
import { program } from "./index"

describe("deploy", () => {
    it("should deploy to a valid environment with custom port", async () => {
        const output: string[] = []
        const spy = vi
            .spyOn(console, "log")
            .mockImplementation((...args: any[]) => {
                output.push(String(args[0]))
            })
        await program.execute(["deploy", "staging", "--port", "8080"])
        spy.mockRestore()
        expect(output).toContain("Deploying to staging on port 8080...")
        expect(output).toContain("Deployment to staging complete.")
    })

    it("should use default port when not specified", async () => {
        const output: string[] = []
        const spy = vi
            .spyOn(console, "log")
            .mockImplementation((...args: any[]) => {
                output.push(String(args[0]))
            })
        await program.execute(["deploy", "production"])
        spy.mockRestore()
        expect(output).toContain("Deploying to production on port 3000...")
    })

    it("should reject invalid environment", async () => {
        await expect(program.execute(["deploy", "dev"])).rejects.toThrowError(
            'An argument "environment" does not accept "dev" as a value.'
        )
    })

    it("should reject invalid port", async () => {
        await expect(
            program.execute(["deploy", "staging", "--port", "0"])
        ).rejects.toThrowError(
            'An option "port" does not accept "0" as an argument.'
        )
    })

    it("should skip effect with --dry-run", async () => {
        const output: string[] = []
        const spy = vi
            .spyOn(console, "log")
            .mockImplementation((...args: any[]) => {
                output.push(String(args[0]))
            })
        await program.execute(["deploy", "staging", "--dry-run"])
        spy.mockRestore()
        expect(output).toContain("Deploying to staging on port 3000...")
        expect(output).not.toContain("Deployment to staging complete.")
    })

    it("should output JSON with --json", async () => {
        const output: string[] = []
        const spy = vi
            .spyOn(process.stdout, "write")
            .mockImplementation((...args: any[]) => {
                output.push(String(args[0]))
                return true
            })
        await program.execute(["deploy", "staging", "--port", "8080", "--json"])
        spy.mockRestore()
        expect(output).toContain(
            `${JSON.stringify({ environment: "staging", port: 8080, status: "deploying" })}\n`
        )
        expect(output).toContain(
            `${JSON.stringify({ environment: "staging", port: 8080, status: "complete" })}\n`
        )
    })

    it("should skip json effect output with --json --dry-run", async () => {
        const output: string[] = []
        const spy = vi
            .spyOn(process.stdout, "write")
            .mockImplementation((...args: any[]) => {
                output.push(String(args[0]))
                return true
            })
        await program.execute(["deploy", "staging", "--json", "--dry-run"])
        spy.mockRestore()
        expect(output).toContain(
            `${JSON.stringify({ environment: "staging", port: 3000, status: "deploying" })}\n`
        )
        expect(output).not.toContain(
            `${JSON.stringify({ environment: "staging", port: 3000, status: "complete" })}\n`
        )
    })
})
