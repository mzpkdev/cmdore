export type CmdoreErrorOptions = {
    code?: string
    exitCode?: number
}

export class CmdoreError extends Error {
    readonly code: string
    readonly exitCode: number

    constructor(message?: string, options?: CmdoreErrorOptions) {
        super(message)
        this.name = "CmdoreError"
        this.code = options?.code ?? "cmdore.error"
        this.exitCode = options?.exitCode ?? 1
    }
}
