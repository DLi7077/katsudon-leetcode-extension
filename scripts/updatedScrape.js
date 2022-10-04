function get(object, keyPath) {
  if (!object) return;
  const keyChain = keyPath.split(".");
  let curr = object;

  for (const key of keyChain) {
    if (!curr) return null;
    curr = curr[key];
  }

  return curr;
}

function getSolutionUpdated() {
  const solutionLanguageClass =
    "inline-flex items-center whitespace-nowrap text-xs rounded-full bg-blue-0 dark:bg-dark-blue-0 text-blue-s dark:text-dark-blue-s px-3 py-1 font-medium leading-4";
  const codeHTMLTag = "code";
  const statsClassname = "text-label-1 dark:text-dark-label-1 ml-2 font-medium";

  // runtime and memory
  const solutionStatsHTML = [
    ...document.getElementsByClassName(statsClassname),
  ];
  const solutionStats = solutionStatsHTML.map((statHTML) => statHTML.innerHTML);
  const [runtime, memory] = solutionStats;

  // solution language
  const languagesHTML = [
    ...document.getElementsByClassName(solutionLanguageClass),
  ];
  const solutionLanguage = languagesHTML[languagesHTML.length - 1].innerText;
  const solutionHTML = document.querySelector(codeHTMLTag);
  const codeLines = [...solutionHTML.childNodes];

  // solution code
  const solution = codeLines.reduce((accumulator, line) => {
    const lineElements = [...line.childNodes];
    lineElements.forEach((word) => {
      accumulator += word.innerText ?? "";
    });

    return accumulator;
  }, "");

  return {
    language: solutionLanguage,
    runtime: runtime,
    memory: memory,
    solution: solution,
  };
}

function getProblemUpdated() {
  const fatScript = JSON.parse(
    document.getElementById("__NEXT_DATA__").innerHTML
  );
  if (!fatScript) return null;

  const problemData = get(fatScript, "props.pageProps.dehydratedState.queries");
  const index = {
    title: 0,
    description: 7,
    tags: 9,
  };

  const problemInfo = get(problemData[index.title], "state.data.question");
  const problemDescription = get(
    problemData[index.description],
    "state.data.question.content"
  );
  const problemTags = get(
    problemData[index.tags],
    "state.data.question.topicTags"
  ).map((tag) => tag.name);

  return {
    id: problemInfo.questionId,
    title: problemInfo.title,
    difficulty: problemInfo.difficulty,
    description: problemDescription,
    tags: problemTags,
  };
}

function waitingResult() {
  const loading = document.getElementsByClassName(
    "animate-pulse flex w-full flex-col space-y-4"
  );
  return !!loading.length;
}

function solutionAccepted() {
  const accepted = document.getElementsByClassName(
    "text-green-s dark:text-dark-green-s flex items-center gap-2 text-[16px] font-medium leading-6"
  );
  return !!accepted.length;
}

async function sendToDatabase(problem, solution) {
  console.log(problem, solution);
  if (!problem || !solution) return null;

  chrome.storage.local.get("user_id", async (userId) => {
    const problemObject = {
      problem_id: problem.id,
      problem_title: problem.title,
      problem_difficulty: problem.difficulty,
      problem_description: problem.description,
      problem_tags: problem.tags,
    };

    const solutionObject = {
      user_id: userId,
      solution_language: solution.language,
      solution_code: solution.solution,
      runtime_ms: parseInt(solution.runtime.split(" ")[0]),
      memory_usage_mb: parseFloat(solution.memory.split(" ")[0]),
    };
    const submissionObject = {
      ...userId,
      ...problemObject,
      ...solutionObject,
    };

    fetch("https://katsudon-server-v2.herokuapp.com/api/solution/create", {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(submissionObject),
    })
      .then((response) => response.json())
      .then((res) => console.log(res));
  });
}

// Script
function clickedLegacySubmit(event) {
  const clickedClass = event.target.className;
  console.log(clickedClass);
  return (
    clickedClass === "css-1km43m6-BtnContent e5i1odf0" ||
    clickedClass === "submit__2ISl css-ieo3pr"
  );
}

let inSubmission = false;

document.addEventListener("click", async (event) => {
  if (inSubmission) return;
  const clickedContent = event.target.innerText;
  if (clickedContent === "Submit") {
    if (clickedLegacySubmit(event)) return;
    inSubmission = true;

    let awaitResult = setInterval(async () => {
      if (!waitingResult()) {
        clearInterval(awaitResult);
        inSubmission = false;

        setTimeout(async () => {
          if (solutionAccepted()) {
            try {
              const solution = getSolutionUpdated();
              const problem = getProblemUpdated();

              console.log(solution);
              console.log(problem);
              await sendToDatabase(problem, solution);
            } catch {
              console.log("failed to use updated scrape");
            }
          } else {
            console.log("submission failed for updated scrape");
          }
        }, 1000);
      }
    }, 200);
  }
});
