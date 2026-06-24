import { CmdoreError } from "../errors"
import type { StandardSchemaV1 } from "./StandardSchema"

type Argument = {
    name: string
    description?: string
    required?: boolean
    variadic?: boolean
    defaultValue?: () => unknown
    schema?: StandardSchemaV1<unknown>
}

namespace Argument {
    const validate = async (
        argument: Argument,
        input: string | string[]
    ): Promise<unknown> => {
        if (argument.schema == null) {
            return input
        }
        const result = await argument.schema["~standard"].validate(input)
        if (result.issues) {
            throw new CmdoreError(
                result.issues.map((issue) => issue.message).join("; "),
                { exitCode: 2 }
            )
        }
        return result.value
    }

    export const parse = async (
        argument: Argument,
        value: string | undefined
    ): Promise<unknown> => {
        if (value == null) {
            if (argument.required) {
                throw new CmdoreError(
                    `An argument "${argument.name}" is required.`,
                    { exitCode: 2 }
                )
            }
            return argument.defaultValue?.()
        }
        return validate(argument, value)
    }

    export const parseVariadic = async (
        argument: Argument,
        values: string[]
    ): Promise<unknown> => {
        if (values.length === 0) {
            if (argument.required) {
                throw new CmdoreError(
                    `An argument "${argument.name}" is required.`,
                    { exitCode: 2 }
                )
            }
            if (argument.defaultValue) {
                return argument.defaultValue()
            }
            return []
        }
        return validate(argument, values)
    }
}

export const defineArgument = <
    const TArgument extends Argument &
        Record<Exclude<keyof TArgument, keyof Argument>, never>
>(
    argument: TArgument
): TArgument => argument

export default Argument
