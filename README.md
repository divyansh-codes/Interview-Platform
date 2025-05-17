<b>NOTE-</b> Few places still lack adequate Comments, a few feature implementations and Refinements. i'm actively working on them, Will be ready by Monday 19 May 25'.
<h1>Interview Platform</h1>
<h2>1. Application overview</h2>
<p>The Interview Platform application is a Online Video calling WebRTC based Interview Application.<br>
  The project currently is very raw and backend focused. The purpose of this Project is to show my Capabilities workign in JS with technologies like WebRTC, WebSockets, GraphQL, Rest etc along with multiple small JS APIs.<br>
  <b>This Application has 3 pages in total:</b>
  <ul>
    <li>Administrator:</li>
    <p>Administrator Page serves as the User & Interview Rooms Management page, Here, we can Create and Delete Users, Create, Delete Rooms and Can also Add or Remove members to the Interview Rooms.<br>
      (The users are uniquely Identified by their Usernames, which are customisable and are manually created in the administrator page)</p>
    <li>Login:</li>
    <p>Login page has a input field to enter your Username and a login btn, User just have to enter the username and will be logged in and all it's details like Name username, Interview meeting Rooms will be fetched from backend.<br>
    (A User can ONLY be created by the administrator of the application thru the Administrator page and The username is to be provided by the Company to the user thru mediums like Email or text etc)</p>
    <li>Dashboard:</li>
    <p>Dashboard page serves as the main page of the application, on this page the user must select the Interview Room he wants to join to, then can press the join interview page. After which the Chat, Video and Monaco Code editor will starts to work.</p>
  </ul>
  <b>The Application has 4 Roles that can be assigned to the Interviewer:</b>
  <ul>
    <li>Admin</li>
    <li>Interviewer</li>
    <li>Moderator</li>
    <li>Candidate</li>
  </ul>
  all 4 can join an interview meeting,<br>
  ONLY Candidate DOES NOT have access to the past records other three roles can fetch and see them by the btn in the bottom most of the page.<br>
  ONLY Admin has access to Administrator page.<br>
  Candidate receives a few Notifications and other roles don't also there is a 30second buffer before joining teh interview ONLY FOR CANDIDATE
</p>
<h2>2. Guide:</h2>
<p>You can use these credentials according to the role: </p>
<dl>
  <dt>Admin:</dt>
  <dd><b>Username:</b> test@admin</dd>
  <dt>Candidate:</dt>
  <dd><b>Username:</b> test@candidate</dd>
  <dd><b>NOTE-</b> There is a 30 Seconds Buffer ONLY for candidate when you Join Interview with Candidate you'll be receiving notifications at 0 and 15 seconds and will join the interview at 30 second after pressing the join btn.</dd>
  <dt>Moderator:</dt>
  <dd><b>Username:</b> test@moderator</dd>
  <dt>Interviewer:</dt>
  <dd><b>Username:</b> test@interviewer</dd>
</dl>
