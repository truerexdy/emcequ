const maxQuestion = 10;
let questionNumber = 0;
const maxTime = 600;
let questionListObject;
let currentLanguage = "cpp";
let teamId = null;
let selectedOption = 0;
let selectedOptionForQuestions = Array(maxQuestion).fill(null);

const rootElement = document.getElementById("root");
const contentElement = document.getElementById("content");


const availableLanguages = [
    { code: "py", name: "C++" },
    { code: "py", name: "Python" },
    { code: "java", name: "Java" },
    { code: "c", name: "C" }
];


async function scoreCard() {
    contentElement.innerHTML = "";
    contentElement.id = "scoreCardPage";

    const scoreCardHeader = document.createElement("h1");
    scoreCardHeader.innerText = "Quiz Results";
    contentElement.appendChild(scoreCardHeader);

    let totalCorrect = 0;
    let totalPoints = 0;
    let maxPossiblePoints = 0;

    const resultsContainer = document.createElement("div");
    resultsContainer.className = "results-container";

    for (let i = 0; i < questionListObject.length && i < maxQuestion; i++) {
        const question = questionListObject[i];
        const userAnswer = selectedOptionForQuestions[i];
        const isCorrect = userAnswer === question.answer;

        if (isCorrect) {
            totalCorrect++;
            totalPoints += question.max_points;
        }

        maxPossiblePoints += question.max_points;
    }   
    
    try {
        const response = await fetch('/score', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                TeamID: teamId,
                TotalScore: totalPoints
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        console.log('Score submitted successfully');
    } catch (error) {
        console.error('Error submitting score:', error);
    }

    const summary = document.createElement("div");
    summary.className = "score-summary";
    summary.innerHTML = `
        <h2>Test Completed</h2>
        <p>Team ID: ${teamId}</p>
        <p>Contact your co-ordinator to record your result.</p>
        <p>Hands off the keyboard and mouse.</p>
        <h2>Do NOT reload the page! If you don't wish to be disqualified.</h2>
    `;
    contentElement.appendChild(summary);
}


function getLanguageName(langCode) {
    const languages = {
        "cpp": "C++",
        "py": "Python",
        "java": "Java",
    };
    return languages[langCode] || langCode;
}


function timeUp() {
    alert("Time's up! Your answers will be submitted now.");
    scoreCard();
}


async function clock() {
    const timerElement = document.getElementById("timer");
    let minutes = Math.floor(maxTime/60);
    let seconds = maxTime%60;
    let time = maxTime;

    while(time >= 0) {
        timerElement.innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        if (time === 0) {
            timeUp();
            break;
        }

        time -= 1;
        minutes = Math.floor(time/60);
        seconds = time%60;
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}


function loadQuestion(number) {
    if (!questionListObject || questionListObject.length === 0 || number > questionListObject.length) {
        return;
    }

    const question = questionListObject[number - 1];
    const questionTextElement = document.getElementById("questionText");
    questionTextElement.innerText = question.q_text;

    
    for (let i = 0; i < 4; i++) {
        const optionElement = document.getElementById(`option${i}`);
        if (i < question.options.length) {
            optionElement.innerText = question.options[i];
            optionElement.style.display = "block";
        } else {
            optionElement.style.display = "none";
        }
    }

    
    const savedOption = selectedOptionForQuestions[number - 1];
    if (savedOption !== null) {
        selectOption(savedOption);
    } else {
        
        const previousSelected = document.querySelector(".selectedOption");
        if (previousSelected) {
            previousSelected.className = "options";
        }
        selectedOption = null;
    }
    
    const saveButtonElement = document.getElementById("saveButtonID");
    saveButtonElement.className = "saveButton";
}


function loadPreviousQuestion() {
    const saveButtonElement = document.getElementById("saveButtonID");
    saveButtonElement.className = "saveButton";


    if (questionNumber <= 1) {
        return;
    }

    saveOption(questionNumber);
    questionNumber -= 1;

    const questionNumberElement = document.getElementById("questionNumber");
    questionNumberElement.innerText = questionNumber.toString();

    const nextButtonElement = document.getElementById("nextButton");
    if (nextButtonElement.innerText === "Submit") {
        nextButtonElement.innerText = "Next Question";
        nextButtonElement.removeEventListener("click", submitAnswers);
        nextButtonElement.addEventListener("click", loadNextQuestion);
    }

    loadQuestion(questionNumber);
}


function submitAnswers() {
    saveOption(questionNumber);
    scoreCard();
}


function loadNextQuestion() {
    const saveButtonElement = document.getElementById("saveButtonID");
    saveButtonElement.className = "saveButton";

    const previousSelected = document.querySelector(".selectedOption");
    if (previousSelected) {
        previousSelected.className = "options";
    }
    saveOption(questionNumber);

    if (questionNumber < maxQuestion && questionNumber < questionListObject.length) {
        questionNumber += 1;
    }

    if (questionNumber >= maxQuestion || questionNumber >= questionListObject.length) {
        const nextButtonElement = document.getElementById("nextButton");
        nextButtonElement.innerText = "Submit";
        nextButtonElement.removeEventListener("click", loadNextQuestion);
        nextButtonElement.addEventListener("click", submitAnswers);
    }

    const questionNumberElement = document.getElementById("questionNumber");
    questionNumberElement.innerText = questionNumber.toString();

    loadQuestion(questionNumber);
}


function selectOption(ind) {
    
    const previousSelected = document.querySelector(".selectedOption");
    if (previousSelected) {
        previousSelected.className = "options";
    }

    selectedOption = ind;

    
    const currentElement = document.getElementById(`option${selectedOption}`);
    if (currentElement) {
        currentElement.className = "selectedOption";
    }

    const saveButtonElement = document.getElementById("saveButtonID");
    saveButtonElement.className = "saveButton";
}


function saveOption(num) {
    if (selectedOption !== null) {
        selectedOptionForQuestions[num-1] = selectedOption;
        
        const saveButtonElement = document.getElementById("saveButtonID");
        saveButtonElement.className = "savedButton";
    }
}


async function changeLanguage(event) {
    currentLanguage = event.target.value;

    
    questionNumber = 0;
    selectedOptionForQuestions = Array(maxQuestion).fill(null);

    
    await loadQuestionData();

    
    questionNumber = 1;

    
    const questionNumberElement = document.getElementById("questionNumber");
    if (questionNumberElement) {
        questionNumberElement.innerText = "1";
    }

    
    loadQuestion(1);

    
    const nextButtonElement = document.getElementById("nextButton");
    if (nextButtonElement && nextButtonElement.innerText === "Submit") {
        nextButtonElement.innerText = "Next Question";
        nextButtonElement.removeEventListener("click", submitAnswers);
        nextButtonElement.addEventListener("click", loadNextQuestion);
    }
}


async function loadQuestionData() {
    try {
        const response = await fetch(`/api/questions?lang=${currentLanguage}`);
        console.log("Fetch Response:", response);
        const data = await response.json();
        console.log("Parsed Data:", data);
        questionListObject = data.questions;
    } catch (error) {
        console.error("Error loading questions:", error);
    }
}


async function getTeamId() {
    try {
        console.log("Requesting team ID from server...");
        const response = await fetch('/score', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const responseText = await response.text();
        console.log("Raw response:", responseText);
        
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error("Failed to parse JSON response:", parseError);
            throw new Error("Invalid JSON response from server");
        }
        
        console.log("Parsed response data:", data);
        
        
        if (data && typeof data === 'object') {
            if ('TeamID' in data) {
                teamId = data.TeamID;
                console.log(`Team ID assigned: ${teamId}`);
                return teamId;
            } else {
                
                if ('teamID' in data) {
                    teamId = data.teamID;
                    console.log(`Team ID assigned (from teamID): ${teamId}`);
                    return teamId;
                } else if ('team_id' in data) {
                    teamId = data.team_id;
                    console.log(`Team ID assigned (from team_id): ${teamId}`);
                    return teamId;
                } else if ('teamId' in data) {
                    teamId = data.teamId;
                    console.log(`Team ID assigned (from teamId): ${teamId}`);
                    return teamId;
                }
            }
        }
        
        console.error("Could not find TeamID in response:", data);
        throw new Error("TeamID not found in response");
    } catch (error) {
        console.error('Error getting team ID:', error);
        return null;
    }
}


async function loadQuestionUI() {
    
    questionNumber = 0;

    
    try {
        await getTeamId();
        if (!teamId) {
            console.error("Failed to get a valid team ID");
            
            teamId = Math.floor(Math.random() * 10000) + 1;
            console.log(`Created fallback team ID: ${teamId}`);
        }
    } catch (error) {
        console.error("Error in team ID initialization:", error);
        
        teamId = Math.floor(Math.random() * 10000) + 1;
        console.log(`Created fallback team ID after error: ${teamId}`);
    }

    
    await loadQuestionData();

    
    contentElement.innerHTML = "";
    contentElement.id = "questionPage";
    
    
    const topBarElement = document.createElement("div");
    const previousButtonElement = document.createElement("button");
    const questionNumberElement = document.createElement("p");
    const timerElement = document.createElement("p");
    const teamIdElement = document.createElement("p"); 
    const nextButtonElement = document.createElement("button");

    topBarElement.id = "topBar";
    previousButtonElement.id = "previousButton";
    nextButtonElement.id = "nextButton";
    questionNumberElement.id = "questionNumber";
    timerElement.id = "timer";
    teamIdElement.id = "teamIdDisplay";

    previousButtonElement.innerText = "Previous Question";
    nextButtonElement.innerText = "Next Question";
    questionNumberElement.innerText = "1"; 
    teamIdElement.innerText = `Team ID: ${teamId}`; 

    contentElement.appendChild(topBarElement);
    topBarElement.appendChild(previousButtonElement);
    topBarElement.appendChild(questionNumberElement);
    topBarElement.appendChild(timerElement);
    topBarElement.appendChild(teamIdElement); 
    topBarElement.appendChild(nextButtonElement);

    previousButtonElement.addEventListener("click", loadPreviousQuestion);
    nextButtonElement.addEventListener("click", loadNextQuestion);

    
    const questionTextElement = document.createElement("p");
    questionTextElement.id = "questionText";
    contentElement.appendChild(questionTextElement);

    
    const optionsContainer = document.createElement("div");
    optionsContainer.id = "optionsContainer";
    contentElement.appendChild(optionsContainer);

    
    for (let i = 0; i < 4; i++) {
        let option = document.createElement("button");
        option.className = "options";
        option.type = "button";
        option.id = `option${i}`;

        
        option.addEventListener("click", () => {
            selectOption(i);
        });

        optionsContainer.appendChild(option);
    }

    
    let saveButtonElement = document.createElement("button");
    saveButtonElement.id = "saveButtonID";
    saveButtonElement.className = "saveButton";
    saveButtonElement.type = "button";
    saveButtonElement.innerText = "Save";
    saveButtonElement.addEventListener("click", () => {
        saveOption(questionNumber);
    });
    contentElement.appendChild(saveButtonElement);

    
    clock();

    
    questionNumber = 1;
    loadQuestion(1);
}


function startPage() {
    questionNumber = 0;
    selectedOptionForQuestions = Array(maxQuestion).fill(null);

    contentElement.innerHTML = "";
    contentElement.id = "startPage";

    
    const languageSelectorContainer = document.createElement("div");
    languageSelectorContainer.id = "startLanguageSelectorContainer";

    const languageLabel = document.createElement("label");
    languageLabel.htmlFor = "startLanguageSelector";
    languageLabel.innerText = "Select Quiz Language: ";

    const languageSelector = document.createElement("select");
    languageSelector.id = "startLanguageSelector";

    availableLanguages.forEach(lang => {
        const option = document.createElement("option");
        option.value = lang.code;
        option.innerText = lang.name;
        if (lang.code === currentLanguage) {
            option.selected = true;
        }
        languageSelector.appendChild(option);
    });

    languageSelector.addEventListener("change", (event) => {
        currentLanguage = event.target.value;
    });

    languageSelectorContainer.appendChild(languageLabel);
    languageSelectorContainer.appendChild(languageSelector);
    contentElement.appendChild(languageSelectorContainer);

    const startButtonElement = document.createElement("button");
    startButtonElement.className = "button";
    startButtonElement.id = "startButton";
    startButtonElement.innerText = "Start";
    startButtonElement.addEventListener("click", loadQuestionUI);
    contentElement.appendChild(startButtonElement);
}


startPage();