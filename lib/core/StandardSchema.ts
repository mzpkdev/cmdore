/**
 * The Standard Schema interface, vendored into cmdore.
 *
 * cmdore stays dependency-free, so rather than depending on the
 * `@standard-schema/spec` package the interface is copy-pasted here as the
 * spec recommends. Any validation library that implements the `~standard`
 * contract (Zod, Valibot, ArkType, …) is usable as an option/argument schema
 * without an adapter.
 *
 * @see https://standardschema.dev
 */
export interface StandardSchemaV1<Output = unknown, Input = unknown> {
    readonly "~standard": StandardSchemaV1.Props<Output, Input>
}

export namespace StandardSchemaV1 {
    export type Props<Output = unknown, Input = unknown> = {
        readonly version: 1
        readonly vendor: string
        readonly validate: (
            value: unknown
        ) => Result<Output> | Promise<Result<Output>>
        readonly types?: Types<Input, Output>
    }

    export type Result<Output> = SuccessResult<Output> | FailureResult

    export type SuccessResult<Output> = {
        readonly value: Output
        readonly issues?: undefined
    }

    export type FailureResult = {
        readonly issues: readonly Issue[]
    }

    export type Issue = {
        readonly message: string
    }

    export type Types<Input = unknown, Output = unknown> = {
        readonly input: Input
        readonly output: Output
    }

    export type InferInput<Schema extends StandardSchemaV1> = NonNullable<
        Schema["~standard"]["types"]
    >["input"]

    export type InferOutput<Schema extends StandardSchemaV1> = NonNullable<
        Schema["~standard"]["types"]
    >["output"]
}

export type { StandardSchemaV1 as default }
