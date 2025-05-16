//This is the script file of landing/login page, this handles the login logic of the platform

console.log("Landingpage: script.js loaded!")

//This Class holds all the logic of authentication
class LoginHandler {

    //Constructor to initialize the login form event handler
    constructor(formSelector) {
        this.loginForm = document.querySelector(formSelector);
        this.init();
    }

    //Initialization function to initialize the submit logic for login form
    init() {
        this.loginForm.addEventListener('submit', async (evt) => {
            evt.preventDefault();
            const username = evt.target.username.value;

            const userDetails = await this.checkUsername(username);
            if (userDetails) {
                if(userDetails.role=="Admin"){
                    this.storeUserSession(userDetails);
                    window.location.href = '/admin';
                }else{
                    // console.log("Reached here", userDetails.role)
                    this.storeUserSession(userDetails);
                    window.location.href = '/dashboard';
                }
            } else {
                alert("User doesn't exist, Please check or Contact admin.")
            }
        });
    }

    //checkUsername function to check if the User exists in the UserDatabase
    async checkUsername(username) {
        //Graphql Request to check username
        try {
            let res = await fetch('/graphql', {
                method: 'POST',
                headers: {
                    "Content-Type": 'application/json'
                },
                body: JSON.stringify({
                    "query":
                        `query{
                            checkUsername(username:"${username}"){
                                exist
                                user{
                                    username
                                    name
                                    role
                                    inRooms
                                }
                            }
                        }`
                })
                
            });
            res = await res.json();
            if(res.errors){
                console.error("GraphQl Error while checking username: ",res.errors.message);
            }else{
                return res.data.checkUsername.exist ? res.data.checkUsername.user : null;
            }
        } catch (error) {
            console.error("Error fetching Username", error);
            return null;
        }
    }
    //setting Data into sessionStorage that is to be used by other pages
    storeUserSession(userDetails) {
        sessionStorage.setItem("username", userDetails.username);
        sessionStorage.setItem("name", userDetails.name);
        sessionStorage.setItem("role", userDetails.role);
        sessionStorage.setItem("inRooms", JSON.stringify(userDetails.inRooms));
    }
}
new LoginHandler('#loginForm');