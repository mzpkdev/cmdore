import * as fs from "node:fs"
import * as path from "node:path"


export const parent = (pathname?: string): string | undefined => {
    if (pathname == null) {
        pathname = require.main
            ? require.main.filename
            : "/"
    }
    const updir = path.dirname(pathname)
    if (updir == pathname) {
        return undefined
    }
    if (fs.existsSync(path.join(updir, "./package.json"))) {
        return updir
    }
    return parent(updir)
}
