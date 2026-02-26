import { describe, it, expect } from "vitest"
import { CmdoreError } from "./errors"


describe("CmdoreError", () => {
    it("should be an instance of Error", () => {
        const error = new CmdoreError("something broke")
        expect(error).toBeInstanceOf(Error)
    })

    it("should prefix the message with 'Cmdore Error: '", () => {
        const error = new CmdoreError("something broke")
        expect(error.message).toStrictEqual("Cmdore Error: something broke")
    })

    it("should handle undefined message", () => {
        const error = new CmdoreError()
        expect(error.message).toStrictEqual("Cmdore Error: undefined")
    })
})
