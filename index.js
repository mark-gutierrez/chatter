const path = require("node:path")
const fs = require("node:fs")
const { Buffer } = require("node:buffer")

const cors = require("cors")
const express = require("express")
const app = express()
const port = process.env.PORT || 3000

app.use(express.static(path.join(__dirname, "public")))
app.use(cors())

app.get("/", async (req, res) => {
    let file
    try {
        file = await fs.promises.open("./public/login-registration.html")
        let staticFile = await file.readFile()
        res.send(staticFile.toString())
    } catch (error) {
        throw new Error()
    } finally {
        return file.close()
    }
})

app.use((err, req, res, next) => {
    console.error(err.stack)
    res.status(500).send("Something broke!")
})

app.listen(port, () => {
    console.log(`listening on http://localhost:${port}`)
})
