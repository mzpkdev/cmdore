import Program from "./core/Program"

export * from "./core/Argument"
export { default as Argument } from "./core/Argument"
export * from "./core/Command"
export { default as Command } from "./core/Command"
export * from "./core/Option"
export { default as Option } from "./core/Option"
export * from "./core/Program"
export { default as Program } from "./core/Program"
export * from "./errors"
export * from "./tools"

export default (): Program => {
    return new Program()
}
