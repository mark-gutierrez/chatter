const { useState, useEffect, useRef, Component } = React

function Offline() {
    const [page, setPage] = useState("Login")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [testPassword, setTestPassword] = useState("")
    const [showPopUp, setShowPopUp] = useState(false)
    const [popUpMessage, setPopUpMessage] = useState("false")

    function showPopupHandler() {
        setShowPopUp(true)
    }

    useEffect(() => {
        const timer = setTimeout(() => {
            setShowPopUp(false)
        }, 7000)
        return () => clearTimeout(timer)
    }, [showPopUp])

    async function postData(url = "", data = {}) {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        })
        return response.json()
    }

    async function handleLogin(e) {
        e.preventDefault()

        if (email === "" || password === "") {
            setPopUpMessage("Email and Password must not be empty")
            showPopupHandler()
            return
        }

        const { data, message } = await postData("/login", {
            email: `${email.toLowerCase()}`,
            password,
        })

        if (message) {
            setPopUpMessage(message)
            showPopupHandler()
        }

        if (data) {
            window.location.replace("/")
        }
    }

    async function handleRegister(e) {
        e.preventDefault()

        if (!isEmail(email)) {
            setPopUpMessage("Invalid Email")
            showPopupHandler()
            return
        }
        if (!isValidPassword(password, testPassword)) {
            setPopUpMessage(
                "Password must have minimum eight characters, at least one upper case letter, one lower case letter, one number and one special character"
            )
            showPopupHandler()
            return
        }

        const { data, error, message } = await postData("/register", {
            email: `${email.toLowerCase()}`,
            password,
            username: `${email.split("@")[0]}`,
        })

        if (error) {
            setPopUpMessage(message || error)
            showPopupHandler()
        }

        if (data) {
            setPage("Login")
            setPopUpMessage(
                "Successful Regristration! Check Email to Verify Account"
            )
            showPopupHandler()
        }
    }

    async function handleForgotPassword(e) {
        e.preventDefault()

        if (!isEmail(email)) {
            setPopUpMessage("Invalid Email")
            showPopupHandler()
            return
        }

        const { data, error, message } = await postData("/forgot-password", {
            email: `${email.toLowerCase()}`,
            password,
        })

        if (error) {
            setPopUpMessage(message || error)
            showPopupHandler()
            return
        }

        if (data) {
            setPage("Login")
            setPopUpMessage("Email Successfully Sent")
            showPopupHandler()
        }
    }

    function isEmail(e_mail) {
        const regexp =
            /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        return regexp.test(String(e_mail).toLowerCase())
    }

    function isValidPassword(pass_word, test_password) {
        // It contains at least:
        // - 8 characters
        // - one digit.
        // - one upper case alphabet.
        // - one lower case alphabet.
        // - one special character which includes #?!@$ %^&*-.
        const regexp =
            /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$ %^&*-]).{8,}$/
        return regexp.test(String(pass_word)) && pass_word === test_password
    }

    return (
        <div className="content">
            <h1>{page}</h1>
            {showPopUp && <p className="popup">{popUpMessage}</p>}
            <form
                onSubmit={
                    page === "Login"
                        ? handleLogin
                        : page === "Register"
                        ? handleRegister
                        : handleForgotPassword
                }
            >
                <input
                    type="email"
                    name="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                {(page === "Login" || page === "Register") && (
                    <input
                        type="password"
                        name="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                )}
                {page === "Register" && (
                    <input
                        type="password"
                        name="confirm-password"
                        placeholder="Confirm Password"
                        value={testPassword}
                        onChange={(e) => setTestPassword(e.target.value)}
                    />
                )}
                <button
                    type="submit"
                    onClick={
                        page === "Login"
                            ? handleLogin
                            : page === "Register"
                            ? handleRegister
                            : handleForgotPassword
                    }
                >
                    {page}
                </button>
            </form>

            <button
                type="button"
                onClick={() => {
                    if (page === "Login") setPage("Register")
                    if (page === "Register" || page === "Reset Password")
                        setPage("Login")
                }}
            >
                {page === "Login"
                    ? "Don't have an account?"
                    : page === "Register"
                    ? "Already have an account?"
                    : "Return to Login"}
            </button>
            {page === "Login" && (
                <button
                    type="button"
                    onClick={() => {
                        setPage("Reset Password")
                    }}
                >
                    Forgot Password?
                </button>
            )}
        </div>
    )
}

class App extends Component {
    render() {
        return (
            <div>
                <Offline />
            </div>
        )
    }
}

const root = ReactDOM.createRoot(document.getElementById("root"))
root.render(<App />)
