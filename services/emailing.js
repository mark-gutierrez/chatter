const fp = require("fastify-plugin")

module.exports = fp(async function (fastify, opts) {
    const sgMail = require("@sendgrid/mail")
    sgMail.setApiKey(fastify.config.SENDGRID_API_KEY)

    async function emailing({
        to = "",
        from = "omg.wtf1358@gmail.com",
        subject = "",
        text = "",
        html = "",
    }) {
        try {
            await sgMail.send({ to, from, subject, text, html })
        } catch (error) {
            console.error(error)
            if (error.response) {
                console.error(error.response.body)
            }
        }
    }

    fastify.decorate("mail", emailing)
})
