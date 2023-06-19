const fp = require("fastify-plugin")

module.exports = fp(async function (fastify, opts) {
    const sgMail = require("@sendgrid/mail")
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)

    async function emailing({
        to = "",
        from = "omg.wtf1358@gmail.com",
        subject = "",
        text = "Do not send to anyone",
        user_uid = "",
    }) {
        const url =
            process.env.WEBSITE || `http://localhost:${process.env.PORT}`
        const html =
            subject === "Verify Chatter Account"
                ? `<p>Verify Chatter account click: <a href="${url}/verify-account/${user_uid}">Verify Account</a></p>`
                : `<p>To reset Chatter password click: <a href="${url}/?reset-password=${user_uid}">Reset Password</a></p>`

        try {
            await sgMail.send({ to, from, subject, text, html })
        } catch (error) {
            console.error(error)
            if (error.response) {
                console.error(error.response.body)
            }
        }
    }

    fastify.decorate("email", emailing)
})
