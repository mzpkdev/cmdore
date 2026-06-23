import { describe, expect, it } from "vitest"
import { CmdoreError } from "./errors"

describe("CmdoreError", () => {
    it("should be an instance of Error", () => {
        const error = new CmdoreError("something broke")
        expect(error).toBeInstanceOf(Error)
    })

    it("should keep the message clean without a prefix", () => {
        const error = new CmdoreError("something broke")
        expect(error.message).toStrictEqual("something broke")
    })

    it("should set the name to CmdoreError", () => {
        const error = new CmdoreError("something broke")
        expect(error.name).toStrictEqual("CmdoreError")
    })

    it("should handle undefined message", () => {
        const error = new CmdoreError()
        expect(error.message).toStrictEqual("")
    })

    it("should default code to 'cmdore.error'", () => {
        const error = new CmdoreError("something broke")
        expect(error.code).toStrictEqual("cmdore.error")
    })

    it("should default exitCode to 1", () => {
        const error = new CmdoreError("something broke")
        expect(error.exitCode).toStrictEqual(1)
    })

    it("should use an explicit code when provided", () => {
        const error = new CmdoreError("nope", { code: "cmdore.unknownCommand" })
        expect(error.code).toStrictEqual("cmdore.unknownCommand")
    })

    it("should use an explicit exitCode when provided", () => {
        const error = new CmdoreError("nope", { exitCode: 2 })
        expect(error.exitCode).toStrictEqual(2)
    })
})
