import { describe, expect, it, vi } from "vitest"
import { createProgram } from "./index"

const metadata = {
    name: "fs",
    version: "0.0.0",
    description: "A file system CLI"
}

describe("copy", () => {
    it("should copy multiple files to a destination", async () => {
        const output: string[] = []
        const spy = vi
            .spyOn(console, "log")
            .mockImplementation((...args: any[]) => {
                output.push(String(args[0]))
            })
        await createProgram(metadata).execute([
            "copy",
            "dist/",
            "a.ts",
            "b.ts",
            "c.ts"
        ])
        spy.mockRestore()
        expect(output).toContain("Copying a.ts, b.ts, c.ts to dist/")
    })

    it("should throw when destination is missing", async () => {
        await expect(
            createProgram(metadata).execute(["copy"])
        ).rejects.toThrowError('An argument "destination" is required.')
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
        await createProgram(metadata).execute([
            "remove",
            "a.ts",
            "b.ts",
            "--confirm"
        ])
        spy.mockRestore()
        expect(output).toContain("Removing a.ts, b.ts")
    })

    it("should throw when --confirm is missing", async () => {
        await expect(
            createProgram(metadata).execute(["remove", "a.ts"])
        ).rejects.toThrowError('An option "confirm" is required.')
    })
})
