import { describe, expect, it, vi } from "vitest"
import { program } from "./index"

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

    it("should throw when destination is missing", async () => {
        await expect(program(["copy"])).rejects.toThrowError(
            'An argument "destination" is required.'
        )
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

    it("should throw when --confirm is missing", async () => {
        await expect(program(["remove", "a.ts"])).rejects.toThrowError(
            'An option "confirm" is required.'
        )
    })
})
