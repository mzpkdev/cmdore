import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
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

// Reset every mutable global back to its module default so a failing
// assertion in one test can never leak state into the next. Guaranteed to
// run via afterEach even when an expectation throws.
const resetGlobalState = (): void => {
    effect.reset()
    terminal.colors = true
    terminal.quiet = false
    terminal.jsonMode = false
    vi.restoreAllMocks()
}

beforeEach(resetGlobalState)
afterEach(resetGlobalState)

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
    })

    it("should await async callbacks", async () => {
        effect.enabled = true
        const result = await effect(async () => {
            return await Promise.resolve("async-value")
        })
        expect(result).toStrictEqual("async-value")
    })

    describe("fn", () => {
        it("should call real, return its value, and record the args", () => {
            let calledWith: [string, number] | undefined
            const write = effect.fn((file: string, size: number) => {
                calledWith = [file, size]
                return `wrote ${size} to ${file}`
            })

            const result = write("out.txt", 7)

            expect(result).toStrictEqual("wrote 7 to out.txt")
            expect(calledWith).toStrictEqual(["out.txt", 7])
            expect(effect.log).toStrictEqual([
                { wrapper: write, label: "anonymous", args: ["out.txt", 7] }
            ])
        })

        it("should use real.name as the default label", () => {
            const named = (value: number) => value
            const write = effect.fn(named)
            write(1)
            expect(effect.log[0]?.label).toStrictEqual("named")
        })

        it("should record an explicit label without using it as the key", () => {
            const write = effect.fn(() => "ok", "write-config")
            write()
            expect(effect.log[0]?.label).toStrictEqual("write-config")
            expect(effect.log[0]?.wrapper).toStrictEqual(write)
        })

        it("should skip real and return undefined on dry-run", () => {
            effect.enabled = false
            let ran = false
            const write = effect.fn(() => {
                ran = true
                return "wrote"
            })

            const result = write()

            expect(ran).toStrictEqual(false)
            expect(result).toStrictEqual(undefined)
            expect(effect.log).toHaveLength(1)
        })

        it("should await an async real when enabled", async () => {
            const write = effect.fn(async (value: string) =>
                Promise.resolve(`async-${value}`)
            )
            await expect(write("x")).resolves.toStrictEqual("async-x")
        })
    })

    describe("mock", () => {
        it("should call the fake with the args and propagate its return", () => {
            let realRan = false
            const write = effect.fn((value: number) => {
                realRan = true
                return value * 2
            })
            const fakeArgs: number[] = []
            effect.mock(write, (value: number) => {
                fakeArgs.push(value)
                return 99
            })

            const result = write(5)

            expect(result).toStrictEqual(99)
            expect(fakeArgs).toStrictEqual([5])
            expect(realRan).toStrictEqual(false)
            expect(effect.log).toHaveLength(1)
        })

        it("should run the fake even on dry-run (mock wins over the gate)", () => {
            effect.enabled = false
            const write = effect.fn(() => "real")
            effect.mock(write, () => "fake")
            expect(write()).toStrictEqual("fake")
        })

        it("should only override the wrapper it was keyed to", () => {
            const a = effect.fn(() => "real-a")
            const b = effect.fn(() => "real-b")
            effect.mock(a, () => "fake-a")
            expect(a()).toStrictEqual("fake-a")
            expect(b()).toStrictEqual("real-b")
        })
    })

    describe("unmock", () => {
        it("should remove a single override and fall back to real", () => {
            const write = effect.fn(() => "real")
            effect.mock(write, () => "fake")
            effect.unmock(write)
            expect(write()).toStrictEqual("real")
        })
    })

    describe("reset", () => {
        it("should clear mocks, clear the log, and restore enabled", () => {
            effect.enabled = false
            const write = effect.fn(() => "real")
            effect.mock(write, () => "fake")
            write()

            effect.reset()

            expect(effect.enabled).toStrictEqual(true)
            expect(effect.log).toStrictEqual([])
            expect(write()).toStrictEqual("real")
        })
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

        it("should output via console.log when colors are enabled", () => {
            const spy = vi.spyOn(console, "log").mockImplementation(() => {})
            terminal.log("hello")
            expect(spy).toHaveBeenCalledOnce()
        })

        it("should be suppressed when quiet is true and colors are enabled", () => {
            terminal.quiet = true
            const spy = vi.spyOn(console, "log").mockImplementation(() => {})
            terminal.log("hello")
            expect(spy).not.toHaveBeenCalled()
        })

        it("should be suppressed when jsonMode is true and colors are enabled", () => {
            terminal.jsonMode = true
            const spy = vi.spyOn(console, "log").mockImplementation(() => {})
            terminal.log("hello")
            expect(spy).not.toHaveBeenCalled()
        })

        it("should output via console.log when no message and colors are enabled", () => {
            const spy = vi.spyOn(console, "log").mockImplementation(() => {})
            terminal.log()
            expect(spy).toHaveBeenCalledOnce()
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

        it("should output via console.info when colors are enabled", () => {
            const spy = vi.spyOn(console, "info").mockImplementation(() => {})
            terminal.verbose("debug info")
            expect(spy).toHaveBeenCalledOnce()
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

        it("should output via console.warn when colors are enabled", () => {
            const spy = vi.spyOn(console, "warn").mockImplementation(() => {})
            terminal.warn("watch out")
            expect(spy).toHaveBeenCalledOnce()
        })

        it("should be suppressed when quiet is true and colors are enabled", () => {
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

        it("should output via console.error when colors are enabled", () => {
            const spy = vi.spyOn(console, "error").mockImplementation(() => {})
            terminal.error("something broke")
            expect(spy).toHaveBeenCalledOnce()
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
