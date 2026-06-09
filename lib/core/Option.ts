import { CmdoreError } from "../errors"
import type { StandardSchemaV1 } from "./StandardSchema"

type Option = {
    name: string
    description?: string
    hint?: string
    alias?: string
    arity?: number
    required?: boolean
    defaultValue?: () => unknown
    schema?: StandardSchemaV1<unknown>
}

namespace Option {
    const raw = (option: Option, values: string[]): unknown => {
        if (option.arity === 0) {
            return true
        }
        if (option.arity === 1) {
            return values[0]
        }
        return values
    }

    export const parse = async (
        option: Option,
        values: string[] | undefined
    ): Promise<unknown> => {
        if (values == null) {
            if (option.required) {
                throw new CmdoreError(`An option "${option.name}" is required.`)
            }
            if (option.defaultValue) {
                return option.defaultValue()
            }
            return option.arity === 0 ? false : undefined
        }
        const input = raw(option, values)
        if (option.schema == null) {
            return input
        }
        const result = await option.schema["~standard"].validate(input)
        if (result.issues) {
            throw new CmdoreError(
                result.issues.map((issue) => issue.message).join("; ")
            )
        }
        return result.value
    }
}

export const defineOption = <
    const TOption extends Option &
        Record<Exclude<keyof TOption, keyof Option>, never>
>(
    option: TOption
): TOption => option

export default Option
