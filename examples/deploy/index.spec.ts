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
        await program(["deploy", "staging", "--port", "8080"])
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
        await program(["deploy", "production"])
        spy.mockRestore()
        expect(output).toContain("Deploying to production on port 3000...")
    })

    it("should reject invalid environment", async () => {
        await expect(program(["deploy", "dev"])).rejects.toThrowError(
            'Invalid environment "dev".'
        )
    })

    it("should reject invalid port", async () => {
        await expect(
            program(["deploy", "staging", "--port", "0"])
        ).rejects.toThrowError('Invalid port "0".')
    })

    it("should skip effect with --dry-run", async () => {
        const output: string[] = []
        const spy = vi
            .spyOn(console, "log")
            .mockImplementation((...args: any[]) => {
                output.push(String(args[0]))
            })
        await program(["deploy", "staging", "--dry-run"])
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
        await program(["deploy", "staging", "--port", "8080", "--json"])
        spy.mockRestore()
        const lines = output.map((line) => JSON.parse(line))
        expect(lines).toContainEqual({
            environment: "staging",
            port: 8080,
            status: "deploying"
        })
        expect(lines).toContainEqual({
            environment: "staging",
            port: 8080,
            status: "complete"
        })
    })

    it("should skip json effect output with --json --dry-run", async () => {
        const output: string[] = []
        const spy = vi
            .spyOn(process.stdout, "write")
            .mockImplementation((...args: any[]) => {
                output.push(String(args[0]))
                return true
            })
        await program(["deploy", "staging", "--json", "--dry-run"])
        spy.mockRestore()
        const lines = output.map((line) => JSON.parse(line))
        expect(lines).toContainEqual({
            environment: "staging",
            port: 3000,
            status: "deploying"
        })
        expect(lines).not.toContainEqual({
            environment: "staging",
            port: 3000,
            status: "complete"
        })
    })
})
