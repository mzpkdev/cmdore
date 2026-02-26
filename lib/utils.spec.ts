import { describe, it, expect } from "vitest"
import { isIterable, isAsyncIterable } from "./utils"


describe("isIterable", () => {
    it("should return true for arrays", () => {
        expect(isIterable([1, 2, 3])).toStrictEqual(true)
    })

    it("should return false for strings (primitives fail typeof object check)", () => {
        expect(isIterable("hello")).toStrictEqual(false)
    })

    it("should return true for Sets", () => {
        expect(isIterable(new Set([1, 2]))).toStrictEqual(true)
    })

    it("should return true for Maps", () => {
        expect(isIterable(new Map())).toStrictEqual(true)
    })

    it("should return true for custom iterables", () => {
        const obj = { [Symbol.iterator]: function* () { yield 1 } }
        expect(isIterable(obj)).toStrictEqual(true)
    })

    it("should return false for null", () => {
        expect(isIterable(null)).toStrictEqual(false)
    })

    it("should return false for undefined", () => {
        expect(isIterable(undefined)).toStrictEqual(false)
    })

    it("should return false for plain objects", () => {
        expect(isIterable({ a: 1 })).toStrictEqual(false)
    })

    it("should return false for numbers", () => {
        expect(isIterable(42)).toStrictEqual(false)
    })

    it("should return false when Symbol.iterator is not a function", () => {
        const obj = { [Symbol.iterator]: "not a function" }
        expect(isIterable(obj)).toStrictEqual(false)
    })
})


describe("isAsyncIterable", () => {
    it("should return true for async generator objects", () => {
        async function* gen() { yield 1 }
        expect(isAsyncIterable(gen())).toStrictEqual(true)
    })

    it("should return true for custom async iterables", () => {
        const obj = { [Symbol.asyncIterator]: async function* () { yield 1 } }
        expect(isAsyncIterable(obj)).toStrictEqual(true)
    })

    it("should return false for regular arrays", () => {
        expect(isAsyncIterable([1, 2, 3])).toStrictEqual(false)
    })

    it("should return false for null", () => {
        expect(isAsyncIterable(null)).toStrictEqual(false)
    })

    it("should return false for undefined", () => {
        expect(isAsyncIterable(undefined)).toStrictEqual(false)
    })

    it("should return false for plain objects", () => {
        expect(isAsyncIterable({ a: 1 })).toStrictEqual(false)
    })

    it("should return false when Symbol.asyncIterator is not a function", () => {
        const obj = { [Symbol.asyncIterator]: 42 }
        expect(isAsyncIterable(obj)).toStrictEqual(false)
    })
})
