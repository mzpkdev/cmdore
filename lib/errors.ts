export class CmdoreError extends Error {
    constructor(message?: string) {
        super(`Cmdore Error: ${message}`)
    }
}
