import { CmdoreError } from "../errors"

type Option<TName = string, TValue = unknown> = {
    name: TName
    description?: string
    alias?: string
    arity?: number
    required?: boolean
    defaultValue?: () => TValue
    validate?: (...values: string[]) => void | boolean | Promise<unknown>
    parse?: (...values: string[]) => TValue
    [property: string]: unknown
}

namespace Option {
    export const parse = async (
        option: Option,
        values: string[] | undefined
    ): Promise<unknown> => {
        if (values == null) {
            if (option.required) {
                throw new CmdoreError(`An option "${option.name}" is required.`)
            }
            return option.defaultValue?.()
        }
        if ((await option.validate?.(...values)) === false) {
            throw new CmdoreError(
                `An option "${option.name}" does not accept "${values.join(" ")}" as an argument.`
            )
        }
        if (option.parse) {
            return option.parse(...values)
        }
        return values
    }
}

export const defineOption = <TName extends string, TValue>(
    option: Option<TName, TValue>
): Option<TName, TValue> => option

export default Option
