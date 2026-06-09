import * as path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { findMetadata } from "./metadata"

vi.mock("node:fs", () => ({
    existsSync: vi.fn(),
    readFileSync: vi.fn()
}))

import * as fs from "node:fs"

const existsSync = vi.mocked(fs.existsSync)
const readFileSync = vi.mocked(fs.readFileSync)

describe("findMetadata", () => {
    beforeEach(() => {
        existsSync.mockReset()
        readFileSync.mockReset()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it("reads package.json from the starting directory", () => {
        const start = path.join(path.sep, "project")
        const pkg = path.join(start, "package.json")
        existsSync.mockImplementation((candidate) => candidate === pkg)
        readFileSync.mockReturnValue(
            JSON.stringify({
                name: "my-cli",
                version: "1.2.3",
                description: "A CLI"
            })
        )

        const metadata = findMetadata(start)

        expect(metadata).toStrictEqual({
            name: "my-cli",
            version: "1.2.3",
            description: "A CLI"
        })
        expect(existsSync).toHaveBeenCalledWith(pkg)
    })

    it("walks up parent directories until package.json is found", () => {
        const nested = path.join(path.sep, "project", "src", "deep", "here")
        const rootPkg = path.join(path.sep, "project", "package.json")
        existsSync.mockImplementation((candidate) => candidate === rootPkg)
        readFileSync.mockReturnValue(
            JSON.stringify({
                name: "walked-up",
                version: "0.1.0",
                description: "found at the root"
            })
        )

        const metadata = findMetadata(nested)

        expect(metadata).toStrictEqual({
            name: "walked-up",
            version: "0.1.0",
            description: "found at the root"
        })
        // It probed each intermediate directory before reaching the root.
        expect(existsSync).toHaveBeenCalledWith(
            path.join(nested, "package.json")
        )
        expect(existsSync).toHaveBeenCalledWith(
            path.join(path.sep, "project", "src", "deep", "package.json")
        )
        expect(existsSync).toHaveBeenCalledWith(rootPkg)
        expect(readFileSync).toHaveBeenCalledExactlyOnceWith(rootPkg, "utf-8")
    })

    it("returns the empty fallback when no package.json exists up to the root", () => {
        const start = path.join(path.sep, "nowhere", "to", "be", "found")
        existsSync.mockReturnValue(false)

        const metadata = findMetadata(start)

        expect(metadata).toStrictEqual({
            name: "",
            version: "",
            description: ""
        })
        // readFileSync must never run when nothing is found.
        expect(readFileSync).not.toHaveBeenCalled()
    })

    it("terminates at the filesystem root (parent === current)", () => {
        const root = path.sep
        existsSync.mockReturnValue(false)

        const metadata = findMetadata(root)

        expect(metadata).toStrictEqual({
            name: "",
            version: "",
            description: ""
        })
        // At the root, dirname(root) === root, so it probes exactly once.
        expect(existsSync).toHaveBeenCalledExactlyOnceWith(
            path.join(root, "package.json")
        )
    })

    it("defaults missing fields to empty strings via the nullish fallback", () => {
        const start = path.join(path.sep, "project")
        existsSync.mockReturnValue(true)
        readFileSync.mockReturnValue(JSON.stringify({ name: "only-name" }))

        const metadata = findMetadata(start)

        expect(metadata).toStrictEqual({
            name: "only-name",
            version: "",
            description: ""
        })
    })

    it("defaults every field to empty string for an empty package.json", () => {
        const start = path.join(path.sep, "project")
        existsSync.mockReturnValue(true)
        readFileSync.mockReturnValue("{}")

        const metadata = findMetadata(start)

        expect(metadata).toStrictEqual({
            name: "",
            version: "",
            description: ""
        })
    })
})
