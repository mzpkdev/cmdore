import { describe, expect, it, vi } from "vitest"
import { program } from "./index"

describe("list", () => {
    it("should serialize yielded items as JSON with --json", async () => {
        const output: string[] = []
        const spy = vi
            .spyOn(console, "log")
            .mockImplementation((...args: any[]) => {
                output.push(String(args[0]))
            })
        await program.execute(["list", "--json"])
        spy.mockRestore()
        expect(output).toContain(
            JSON.stringify({ id: 1, name: "item-1" }, null, 2)
        )
        expect(output).toContain(
            JSON.stringify({ id: 2, name: "item-2" }, null, 2)
        )
        expect(output).toContain(
            JSON.stringify({ id: 3, name: "item-3" }, null, 2)
        )
        expect(output).toHaveLength(3)
    })

    it("should respect --limit with --json", async () => {
        const output: string[] = []
        const spy = vi
            .spyOn(console, "log")
            .mockImplementation((...args: any[]) => {
                output.push(String(args[0]))
            })
        await program.execute(["list", "--json", "--limit", "2"])
        spy.mockRestore()
        expect(output).toHaveLength(2)
    })

    it("should accept -l alias", async () => {
        const output: string[] = []
        const spy = vi
            .spyOn(console, "log")
            .mockImplementation((...args: any[]) => {
                output.push(String(args[0]))
            })
        await program.execute(["list", "--json", "-l", "1"])
        spy.mockRestore()
        expect(output).toHaveLength(1)
        expect(output).toContain(
            JSON.stringify({ id: 1, name: "item-1" }, null, 2)
        )
    })

    it("should log human-readable output without --json", async () => {
        const output: string[] = []
        const spy = vi
            .spyOn(console, "log")
            .mockImplementation((...args: any[]) => {
                output.push(String(args[0]))
            })
        await program.execute(["list"])
        spy.mockRestore()
        expect(output).toContain("id=1 name=item-1")
        expect(output).toContain("id=2 name=item-2")
        expect(output).toContain("id=3 name=item-3")
    })
})
