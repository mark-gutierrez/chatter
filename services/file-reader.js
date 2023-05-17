const path = require("node:path")
const fs = require("node:fs")
const fp = require("fastify-plugin")

module.exports = fp(function (fastify, opts, done) {
    fastify.decorate("file", async function (fileName) {
        let file
        try {
            file = await fs.promises.open(
                path.join(__dirname, "..", "files", `${fileName}`)
            )
            let staticFile = await file.readFile()
            return staticFile.toString()
        } catch (error) {
            throw new Error("File in file reader could not be read")
        } finally {
            file.close()
        }
    })

    done()
})
