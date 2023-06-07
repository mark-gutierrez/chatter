const { useState, useEffect, useRef, Component } = React

const email = document.getElementById("email").value
const forgot_password_uid = document.getElementById("forgot_password_uid").value
const user_uid = document.getElementById("user_uid").value

function ResetPassword() {
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [showPopUp, setShowPopUp] = useState(false)
    const [popUpMessage, setPopUpMessage] = useState("")

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

    async function handleResetPassword(e) {
        e.preventDefault()

        if (!isValidPassword(password, confirmPassword)) {
            setPopUpMessage(
                "Password must have minimum eight characters, at least one upper case letter, one lower case letter, one number and one special character"
            )
            showPopupHandler()
            return
        }

        const { data, error } = await postData("/reset-password", {
            forgot_password_uid,
            user_uid,
            password,
        })

        if (error) {
            setPopUpMessage(error)
            showPopupHandler()
            return
        }

        if (data) {
            setPopUpMessage("Successfully Updated Password")
            showPopupHandler()
            let num = 4
            setInterval(() => {
                setPopUpMessage(
                    `Successfully Updated Password Redirecting in ${num}...`
                )
                num -= 1
            }, 1000)
            setTimeout(() => {
                window.location.replace("/")
            }, 5000)
        }
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
        <div>
            <h1>Reset Password</h1>
            <h2>for {email}</h2>
            {showPopUp && <p>{popUpMessage}</p>}
            <form onSubmit={handleResetPassword}>
                <input
                    type="password"
                    name="password"
                    placeholder="New Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <input
                    type="password"
                    name="confirmPassword"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button type="submit" onClick={handleResetPassword}>
                    Reset Password
                </button>
            </form>
        </div>
    )
}

class App extends Component {
    render() {
        return (
            <div>
                <ResetPassword />
            </div>
        )
    }
}

const root = ReactDOM.createRoot(document.getElementById("root"))
root.render(<App />)
