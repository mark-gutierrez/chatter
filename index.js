require("dotenv").config()
require("express-async-errors")

const path = require("node:path")
const fs = require("node:fs")
const { Buffer } = require("node:buffer")

const cors = require("cors")
const express = require("express")
const app = express()

const { Client } = require("pg")
const client = new Client(process.env.DATABASE_URL)

const { notFoundMiddleware, errorHandlerMiddleware } = require("./middleware")

app.use(express.static(path.join(__dirname, "public")))
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
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

app.post(/(login|registration)/, async (req, res) => {
    const { email, password } = req.body

    if (!email || !password) {
        return res.status(400).json({ msg: "Email or Password empty fields" })
    }

    return res.send(`${req.path}`)
})

app.get("/pg", async (req, res) => {
    try {
        const res = await client.query(
            "CREATE TABLE session(sessionguid UUID NOT NULL, created text NOT NULL, sessionlife integer NOT NULL)"
        )
        console.log(res.rows[0])
    } catch (err) {
        console.log(err.stack)
    }
    res.send("hello")
})

app.use(notFoundMiddleware)
app.use(errorHandlerMiddleware)

const port = process.env.PORT || 3000
const start = async () => {
    try {
        await client.connect()
        app.listen(port, () => {
            console.log(`listening on http://localhost:${port}`)
        })
    } catch (error) {
        console.error(error)
    }
}

start()
