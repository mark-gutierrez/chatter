const { StatusCodes } = require("http-status-codes")

module.exports = function (error, request, reply) {
    // console.log(error.message)
    let customError = {
        statusCode: error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR,
        msg: error.message || "Something went wrong try again later",
    }

    if (error.code && error.code === "23505") {
        customError.msg = error.detail
        customError.statusCode = StatusCodes.BAD_REQUEST
    }

    if (error.code && error.code === "23514") {
        customError.msg = `${
            error.message.split("(").at(-1).split(")")[0]
        } field must not be empty`
        customError.statusCode = StatusCodes.BAD_REQUEST
    }

    return reply
        .status(customError.statusCode)
        .send({ message: customError.msg, code: customError.statusCode })
}
