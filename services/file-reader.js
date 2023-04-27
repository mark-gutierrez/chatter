const path = require("node:path")
const fs = require("node:fs")

module.exports = async function (fileName) {
    let file
    try {
        file = await fs.promises.open(
            path.join(__dirname, "..", "public", `${fileName}`)
        )
        let staticFile = await file.readFile()
        return staticFile.toString()
    } catch (error) {
        throw new Error()
    } finally {
        file.close()
    }
}
