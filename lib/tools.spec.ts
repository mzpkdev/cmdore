import { describe, expect, it } from "vitest"
import { effect, mock } from "./tools"

describe("effect", () => {
    it("should execute the callback when enabled", async () => {
        effect.enabled = true
        let ran = false
        await effect(() => {
            ran = true
        })
        expect(ran).toStrictEqual(true)
    })

    it("should not execute the callback when disabled", async () => {
        effect.enabled = false
        let ran = false
        await effect(() => {
            ran = true
        })
        expect(ran).toStrictEqual(false)
        effect.enabled = true
    })

    it("should return the callback result when enabled", async () => {
        effect.enabled = true
        const result = await effect(() => 42)
        expect(result).toStrictEqual(42)
    })

    it("should return undefined when disabled", async () => {
        effect.enabled = false
        const result = await effect(() => 42)
        expect(result).toStrictEqual(undefined)
        effect.enabled = true
    })

    it("should await async callbacks", async () => {
        effect.enabled = true
        const result = await effect(async () => {
            return await Promise.resolve("async-value")
        })
        expect(result).toStrictEqual("async-value")
    })
})

describe("mock", () => {
    it("should replace the property with a no-op", () => {
        const obj = { greet: (name: string) => `Hello ${name}` }
        mock(obj, "greet")
        expect(obj.greet("world")).toStrictEqual(undefined)
    })

    it("should return a restore function", () => {
        const obj = { greet: () => "hi" }
        const restore = mock(obj, "greet")
        expect(typeof restore).toStrictEqual("function")
    })

    it("should restore the original when called", () => {
        const original = (name: string) => `Hello ${name}`
        const obj = { greet: original }
        const restore = mock(obj, "greet")
        restore()
        expect(obj.greet).toStrictEqual(original)
        expect(obj.greet("world")).toStrictEqual("Hello world")
    })
})
