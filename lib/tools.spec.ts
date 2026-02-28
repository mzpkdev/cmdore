import { afterEach, describe, expect, it, vi } from "vitest"
import { effect, mock, terminal } from "./tools"

const mockAnswers: string[] = []
let answerIndex = 0

vi.mock("node:readline", () => ({
    createInterface: () => ({
        question: (_query: string, callback: (answer: string) => void) => {
            callback(mockAnswers[answerIndex++] ?? "")
        },
        close: () => {}
    })
}))

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

describe("terminal", () => {
    afterEach(() => {
        terminal.colors = true
        terminal.quiet = false
        terminal.jsonMode = false
        vi.restoreAllMocks()
    })

    describe("log", () => {
        it("should output via console.log", () => {
            terminal.colors = false
            const spy = vi.spyOn(console, "log").mockImplementation(() => {})
            terminal.log("hello")
            expect(spy).toHaveBeenCalledWith("hello")
        })

        it("should be suppressed when quiet is true", () => {
            terminal.colors = false
            terminal.quiet = true
            const spy = vi.spyOn(console, "log").mockImplementation(() => {})
            terminal.log("hello")
            expect(spy).not.toHaveBeenCalled()
        })

        it("should be suppressed when jsonMode is true", () => {
            terminal.colors = false
            terminal.jsonMode = true
            const spy = vi.spyOn(console, "log").mockImplementation(() => {})
            terminal.log("hello")
            expect(spy).not.toHaveBeenCalled()
        })

        it("should output empty string when no message and colors off", () => {
            terminal.colors = false
            const spy = vi.spyOn(console, "log").mockImplementation(() => {})
            terminal.log()
            expect(spy).toHaveBeenCalledWith("")
        })
    })

    describe("json", () => {
        it("should write JSON to stdout when jsonMode is true", () => {
            terminal.jsonMode = true
            const spy = vi
                .spyOn(process.stdout, "write")
                .mockImplementation(() => true)
            terminal.json({ id: 1, name: "test" })
            expect(spy).toHaveBeenCalledWith(
                `${JSON.stringify({ id: 1, name: "test" })}\n`
            )
        })

        it("should be silent when jsonMode is false", () => {
            terminal.jsonMode = false
            const spy = vi
                .spyOn(process.stdout, "write")
                .mockImplementation(() => true)
            terminal.json({ id: 1 })
            expect(spy).not.toHaveBeenCalled()
        })

        it("should stringify arrays", () => {
            terminal.jsonMode = true
            const spy = vi
                .spyOn(process.stdout, "write")
                .mockImplementation(() => true)
            terminal.json([1, 2, 3])
            expect(spy).toHaveBeenCalledWith(`${JSON.stringify([1, 2, 3])}\n`)
        })

        it("should stringify primitives", () => {
            terminal.jsonMode = true
            const spy = vi
                .spyOn(process.stdout, "write")
                .mockImplementation(() => true)
            terminal.json("hello")
            expect(spy).toHaveBeenCalledWith('"hello"\n')
        })

        it("should stringify null", () => {
            terminal.jsonMode = true
            const spy = vi
                .spyOn(process.stdout, "write")
                .mockImplementation(() => true)
            terminal.json(null)
            expect(spy).toHaveBeenCalledWith("null\n")
        })
    })

    describe("verbose", () => {
        it("should output via console.info", () => {
            terminal.colors = false
            const spy = vi.spyOn(console, "info").mockImplementation(() => {})
            terminal.verbose("debug info")
            expect(spy).toHaveBeenCalledWith("debug info")
        })

        it("should not be suppressed when quiet is true", () => {
            terminal.colors = false
            terminal.quiet = true
            const spy = vi.spyOn(console, "info").mockImplementation(() => {})
            terminal.verbose("debug info")
            expect(spy).toHaveBeenCalled()
        })
    })

    describe("warn", () => {
        it("should output via console.warn", () => {
            terminal.colors = false
            const spy = vi.spyOn(console, "warn").mockImplementation(() => {})
            terminal.warn("watch out")
            expect(spy).toHaveBeenCalledWith("watch out")
        })

        it("should be suppressed when quiet is true", () => {
            terminal.colors = false
            terminal.quiet = true
            const spy = vi.spyOn(console, "warn").mockImplementation(() => {})
            terminal.warn("watch out")
            expect(spy).not.toHaveBeenCalled()
        })
    })

    describe("error", () => {
        it("should output via console.error", () => {
            terminal.colors = false
            const spy = vi.spyOn(console, "error").mockImplementation(() => {})
            terminal.error("something broke")
            expect(spy).toHaveBeenCalledWith("something broke")
        })

        it("should not be suppressed when quiet is true", () => {
            terminal.colors = false
            terminal.quiet = true
            const spy = vi.spyOn(console, "error").mockImplementation(() => {})
            terminal.error("something broke")
            expect(spy).toHaveBeenCalled()
        })
    })

    describe("prompt", () => {
        const setAnswers = (...answers: string[]) => {
            mockAnswers.length = 0
            mockAnswers.push(...answers)
            answerIndex = 0
        }

        it("should return user input", async () => {
            setAnswers("hello")
            const result = await terminal.prompt("Enter:")
            expect(result).toStrictEqual("hello")
        })

        it("should retry on empty input by default", async () => {
            setAnswers("", "", "finally")
            const result = await terminal.prompt("Enter:")
            expect(result).toStrictEqual("finally")
        })

        it("should accept empty input when allowEmpty is true", async () => {
            setAnswers("")
            const result = await terminal.prompt("Enter:", { allowEmpty: true })
            expect(result).toStrictEqual("")
        })

        it("should apply parser to the answer", async () => {
            setAnswers("42")
            const result = await terminal.prompt("Number:", {
                parser: (v) => parseInt(v, 10)
            })
            expect(result).toStrictEqual(42)
        })

        it("should retry when validate returns false", async () => {
            setAnswers("bad", "good")
            const result = await terminal.prompt("Enter:", {
                validate: (v) => v === "good"
            })
            expect(result).toStrictEqual("good")
        })

        it("should show validation message and retry when validate returns string", async () => {
            terminal.colors = false
            const warnSpy = vi
                .spyOn(console, "warn")
                .mockImplementation(() => {})
            setAnswers("bad", "good")
            const result = await terminal.prompt("Enter:", {
                validate: (v) => v === "good" || "Try again"
            })
            expect(result).toStrictEqual("good")
            expect(warnSpy).toHaveBeenCalledWith("Try again")
        })

        it("should work with no message", async () => {
            setAnswers("answer")
            const result = await terminal.prompt()
            expect(result).toStrictEqual("answer")
        })
    })
})
