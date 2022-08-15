function reloadComponentById(id) {
  var container = document.getElementById(id);
  var content = container.innerHTML;
  container.innerHTML = content;
}

function changeStatus(text) {
  localStorage.setItem("status", text);
  document.getElementById("status").innerText = text;
}

document.getElementById("status").innerText = localStorage.getItem("status");
/**
 * Hides/Shows a component by id
 * @param {string} id the component's id
 * @param {*} status true to show, false to hide
 */
function displayComponentById(id, status) {
  document.getElementById(id).style.display = status ? "block" : "none";
  reloadComponentById(id);
}
function refresh() {
  const loggedIn = localStorage.getItem("logged_in") === "true";
  displayComponentById("login-content", !loggedIn);
  displayComponentById("welcome", loggedIn);
}

refresh();
/**
 * on login attempt
 * await result
 * if success, show welcome
 * else set back to login content
 */
async function userLogin(email, password) {
  const URL = "http://localhost:3001/api/user/login";

  return await fetch(URL, {
    method: "POST",
    mode: "cors",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: email,
      password: password,
    }),
  }).then((response) => response.json());
}

async function handleLogin() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const loginAttempt = await userLogin(email, password)
    .then((res) => res.user)
    .catch(null);

  if (loginAttempt) {
    if (loginAttempt._id) {
      //display based on user logged in
      chrome.storage.local.set({ user_id: loginAttempt.user_id }, (res) => {
        localStorage.setItem("logged_in", true);
      });
      changeStatus("Welcome back");
    }
  } else {
    changeStatus("something went wrong");
  }

  return loginAttempt;
}

async function handleSignout() {
  await chrome.storage.local.remove("user_id", (res) => {
    localStorage.setItem("logged_in", false);
    changeStatus("signed out");
  });
}

document.addEventListener("click", async (event) => {
  const button = event.target;
  if (button.id === "login") {
    await handleLogin().then(() => setTimeout(refresh, 100));
  }

  if (button.id === "signout") {
    await handleSignout().then(() => setTimeout(refresh, 100));
  }
});

// chrome.storage.local.get("user_id", (res) => {
//   console.log(res.user_id);
//   if (res.user_id) document.getElementById("content").style.display = "none";
//   else {
//     document.getElementById("content").style.display = "block";
//   }
// });
