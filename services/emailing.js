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
            const res = await sgMail.send({ to, from, subject, text, html })
            console.log(res)
            console.log(`Test email sent successfully`)
        } catch (error) {
            console.error(error)
            if (error.response) {
                console.error(error.response.body)
            }
        }
    }

    fastify.decorate("mail", emailing)
})
