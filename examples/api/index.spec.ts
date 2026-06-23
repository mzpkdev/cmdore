import { describe, expect, it, vi } from "vitest"
import { program } from "./index"

describe("list", () => {
    it("should output JSON with --json", async () => {
        const output: string[] = []
        const spy = vi
            .spyOn(process.stdout, "write")
            .mockImplementation((...args: any[]) => {
                output.push(String(args[0]))
                return true
            })
        await program(["list", "--json"])
        spy.mockRestore()
        const lines = output.map((line) => JSON.parse(line))
        expect(lines).toContainEqual({ id: 1, name: "item-1" })
        expect(lines).toContainEqual({ id: 2, name: "item-2" })
        expect(lines).toContainEqual({ id: 3, name: "item-3" })
        expect(output).toHaveLength(3)
    })

    it("should respect --limit with --json", async () => {
        const output: string[] = []
        const spy = vi
            .spyOn(process.stdout, "write")
            .mockImplementation((...args: any[]) => {
                output.push(String(args[0]))
                return true
            })
        await program(["list", "--json", "--limit", "2"])
        spy.mockRestore()
        expect(output).toHaveLength(2)
    })

    it("should accept -l alias", async () => {
        const output: string[] = []
        const spy = vi
            .spyOn(process.stdout, "write")
            .mockImplementation((...args: any[]) => {
                output.push(String(args[0]))
                return true
            })
        await program(["list", "--json", "-l", "1"])
        spy.mockRestore()
        expect(output).toHaveLength(1)
        const lines = output.map((line) => JSON.parse(line))
        expect(lines).toContainEqual({ id: 1, name: "item-1" })
    })

    it("should log human-readable output without --json", async () => {
        const output: string[] = []
        const spy = vi
            .spyOn(console, "log")
            .mockImplementation((...args: any[]) => {
                output.push(String(args[0]))
            })
        await program(["list"])
        spy.mockRestore()
        expect(output).toContain("id=1 name=item-1")
        expect(output).toContain("id=2 name=item-2")
        expect(output).toContain("id=3 name=item-3")
    })
})
