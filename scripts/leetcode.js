//Defintions for cleaner calls. Called on submission success.

//Retreives Question Title
const getQuestionTitle = () => {
  const questionTitle = document
    .getElementsByClassName("css-v3d350")[0]
    .innerText.split(". ");

  return {
    problem_id: parseInt(questionTitle[0]),
    problem_title: questionTitle[1],
  };
};


//Retreives Question Difficulty
const getDifficulty = () => {
  return document.getElementsByClassName("css-10o4wqw")[0].childNodes[0]
    .innerText;
};

//Retrieves the Description as html
const getDescription = () => {
  return document.getElementsByClassName(
    "content__u3I1 question-content__JfgR"
  )[0].innerHTML;
};

//Retrieves Question Tags
const getTags = () => {
  const tagsHTML = document.getElementsByClassName("tag__24Rd");
  let tags = [];

  //save space using traditional for loop
  for (const tag of tagsHTML) {
    tags.push(tag.innerText);
  }

  return tags;
};

//Retreives the solution's language
const getCodingLanguage = () => {
  return document.getElementsByClassName(
    "ant-select-selection-selected-value"
  )[0].innerText;
};

//Retrieves the Time and Space Complexity
const getTimeSpaceDetails = () => {
  const submissonStats = document.getElementsByClassName("info__2oQ9");
  const runtimeDetails = submissonStats[0].innerText;
  const memoryUsageDetails = submissonStats[1].innerText;

  const getMetrics = (details) => {
    const type_metric = details.split(",")[0];
    const metric = type_metric.split(":")[1];

    return metric.substring(0, metric.length - 3);
  };

  const runtime_in_milliseconds = parseFloat(getMetrics(runtimeDetails));
  const memory_in_megabytes = parseFloat(getMetrics(memoryUsageDetails));

  return {
    runtime_ms: runtime_in_milliseconds,
    memory_usage_mb: memory_in_megabytes,
  };
};

function getCurrentTabUrl() {
  var questionUrl = window.location.href;
  if (questionUrl.endsWith("/submissions/")) {
    questionUrl = questionUrl.substring(
      0,
      questionUrl.lastIndexOf("/submissions/") + 1
    );
  }
  return questionUrl;
}

//source : https://github.com/QasimWani/LeetHub/blob/main/scripts/leetcode.js
async function getSolution() {
  /* Get the submission details url from the submission page. */
  var submissionURL;
  const e = document.getElementsByClassName("status-column__3SUg");
  if (elementExists(e)) {
    // for normal problem submisson
    const submissionRef = e[1].innerHTML.split(" ")[1];
    submissionURL =
      "https://leetcode.com" + submissionRef.split("=")[1].slice(1, -1);
  } else {
    // for a submission in explore section
    const submissionRef = document.getElementById("result-state");
    submissionURL = submissionRef.href;
  }

  if (submissionURL != undefined) {
    return new Promise((resolve, reject) => {
      /* Request for the submission details page */
      const xhttp = new XMLHttpRequest();
      xhttp.open("GET", submissionURL, true);
      xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
          /* received submission details as html reponse. */
          var doc = new DOMParser().parseFromString(
            this.responseText,
            "text/html"
          );
          /* the response has a js object called pageData. */
          /* Pagedata has the details data with code about that submission */
          var scripts = doc.getElementsByTagName("script");
          for (var i = 0; i < scripts.length; i++) {
            var text = scripts[i].innerText;
            if (text.includes("pageData")) {
              /* Considering the pageData as text and extract the substring
            which has the full code */
              var firstIndex = text.indexOf("submissionCode");
              var lastIndex = text.indexOf("editCodeUrl");
              var slicedText = text.slice(firstIndex, lastIndex);
              /* slicedText has code as like as. (submissionCode: 'Details code'). */
              /* So finding the index of first and last single inverted coma. */
              var firstInverted = slicedText.indexOf("'");
              var lastInverted = slicedText.lastIndexOf("'");
              /* Extract only the code */
              var codeUnicoded = slicedText.slice(
                firstInverted + 1,
                lastInverted
              );
              /* The code has some unicode. Replacing all unicode with actual characters */
              var code = codeUnicoded.replace(
                /\\u[\dA-F]{4}/gi,
                function (match) {
                  return String.fromCharCode(
                    parseInt(match.replace(/\\u/g, ""), 16)
                  );
                }
              );
              resolve(code);
            }
          }
        }
      };

      xhttp.onerror = reject;
      xhttp.send();
    });
  }
}

//Bundles all previous functions
const getCodeSubmissionDetails = async () => {
  const questionTitleDetails = getQuestionTitle();
  const timeSpaceDetails = getTimeSpaceDetails();
  const solution = await getSolution();

  const submissionDetails = {
    ...questionTitleDetails,
    problem_url: getCurrentTabUrl(),
    problem_difficulty: getDifficulty(),
    problem_description: getDescription(),
    problem_tags: getTags(),
    solution_language: getCodingLanguage(),
    solution_code: solution,
    ...timeSpaceDetails,
  };

  console.log(submissionDetails);

  return submissionDetails;
};

async function sendToDatabase(solution_content) {
  const URL = "https://katsudon-server-v2.herokuapp.com/api/solution/create";

  chrome.storage.local.get("user_id", async (user_id) => {
    // console.log("sending", JSON.stringify({ ...user_id, ...solution_content }));
    await fetch(URL, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
      },
      //attach user_id with submission
      body: JSON.stringify({ ...user_id, ...solution_content }),
    })
      .then((response) => response.json())
      .then((res) => console.log(res));
  });
}

const elementExists = (element) => {
  return element && element.length > 0;
};

var submissionInProgress = false;

document.addEventListener("click", async (event) => {
  if (submissionInProgress) {
    console.log("already in progress");
  } else {
    const clickedElement = event.target;
    const buttonContent = clickedElement.innerText;

    if (buttonContent === "Submit" && !clickedElement.disabled) {
      console.log("submitted");
      submissionInProgress = true;

      var awaitResult = setInterval(async () => {
        //if detail redirect exists, then submission resolved.
        const detailRedirect = document.getElementsByClassName("detail__1Ye5");
        const submittedTooSoon = document.getElementsByClassName("error__qo2i");

        if (elementExists(detailRedirect) || elementExists(submittedTooSoon)) {
          clearInterval(awaitResult);
          submissionInProgress = false;

          const successDiv = document.getElementsByClassName("success__3Ai7");

          if (elementExists(successDiv)) {
            const submisson_details = await getCodeSubmissionDetails();
            await sendToDatabase(submisson_details);
          } else {
            console.log("Submission failed");
          }
        }
      }, 1000);
    }
  }
});
