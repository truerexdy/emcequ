const maxQuestion = 2;
let questionNumber = 0;
const maxTime = 600;
let questionListObject;
let currentLanguage = "cpp"; // Default language

let selectedOption = 0;
let selectedOptionForQuestions = Array(maxQuestion).fill(null);

const rootElement = document.getElementById("root");
const contentElement = document.getElementById("content");

// Define available languages once at the top
const availableLanguages = [
    { code: "py", name: "C++" },
    { code: "py", name: "Python" },
    { code: "java", name: "Java" },
    { code: "c", name: "C" }
];

// Display the score card with results
function scoreCard() {
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

    console.log(`Total Score = ${totalPoints}`);
    console.log(`Total Correct answers = ${totalCorrect}`);
    const summary = document.createElement("div");
    summary.className = "score-summary";
    summary.innerHTML = `
        <h2>Test Completed</h2>
        <p>Contact your co-ordinator to record your result.</p>
        <p>Hands off the keyboard and mouse.</p>
    `;

    const restartButton = document.createElement("button");
    restartButton.className = "button";
    restartButton.innerText = "Restart Quiz";
    restartButton.addEventListener("click", startPage);

    contentElement.appendChild(summary);
    contentElement.appendChild(restartButton);
}

// Helper function to get language name from code
function getLanguageName(langCode) {
    const languages = {
        "cpp": "C++",
        "py": "Python",
        "java": "Java",
    };
    return languages[langCode] || langCode;
}

// Handle time up scenario
function timeUp() {
    alert("Time's up! Your answers will be submitted now.");
    scoreCard();
}

// Timer function
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

// Load a specific question
function loadQuestion(number) {
    if (!questionListObject || questionListObject.length === 0 || number > questionListObject.length) {
        return;
    }

    const question = questionListObject[number - 1];
    const questionTextElement = document.getElementById("questionText");
    questionTextElement.innerText = question.q_text;

    // Set options
    for (let i = 0; i < 4; i++) {
        const optionElement = document.getElementById(`option${i}`);
        if (i < question.options.length) {
            optionElement.innerText = question.options[i];
            optionElement.style.display = "block";
        } else {
            optionElement.style.display = "none";
        }
    }

    // Highlight previously selected option if any
    const savedOption = selectedOptionForQuestions[number - 1];
    if (savedOption !== null) {
        selectOption(savedOption);
    } else {
        // Reset selection
        const previousSelected = document.querySelector(".selectedOption");
        if (previousSelected) {
            previousSelected.className = "options";
        }
        selectedOption = null;
    }
    // Reset save button appearance
    const saveButtonElement = document.getElementById("saveButtonID");
    saveButtonElement.className = "saveButton";
}

// Go to previous question
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

// Submit all answers
function submitAnswers() {
    saveOption(questionNumber);
    scoreCard();
}

// Go to next question
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

// Select an option
function selectOption(ind) {
    // Clear previous selection
    const previousSelected = document.querySelector(".selectedOption");
    if (previousSelected) {
        previousSelected.className = "options";
    }

    selectedOption = ind;

    // Highlight new selection
    const currentElement = document.getElementById(`option${selectedOption}`);
    if (currentElement) {
        currentElement.className = "selectedOption";
    }

    const saveButtonElement = document.getElementById("saveButtonID");
    saveButtonElement.className = "saveButton";
}

// Save the selected option for the current question
function saveOption(num) {
    if (selectedOption !== null) {
        selectedOptionForQuestions[num-1] = selectedOption;
        // Only change the button appearance after actually saving an option
        const saveButtonElement = document.getElementById("saveButtonID");
        saveButtonElement.className = "savedButton";
    }
}

// Change language and reload questions
async function changeLanguage(event) {
    currentLanguage = event.target.value;

    // Reset the quiz state
    questionNumber = 0;
    selectedOptionForQuestions = Array(maxQuestion).fill(null);

    // Load questions in the new language
    await loadQuestionData();

    // Start from question 1
    questionNumber = 1;

    // Update the question number display
    const questionNumberElement = document.getElementById("questionNumber");
    if (questionNumberElement) {
        questionNumberElement.innerText = "1";
    }

    // Load the first question
    loadQuestion(1);

    // Reset the next button if it was in "Submit" state
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

// Load question UI
async function loadQuestionUI() {
    // Reset question number
    questionNumber = 0;

    // Load questions from API
    await loadQuestionData();

    // Clear content
    contentElement.innerHTML = "";
    contentElement.id = "questionPage";

    // **REMOVE THIS SECTION:**
    // // Create language selector
    // const languageSelectorContainer = document.createElement("div");
    // languageSelectorContainer.id = "languageSelectorContainer";

    // const languageLabel = document.createElement("label");
    // languageLabel.htmlFor = "languageSelector";
    // languageLabel.innerText = "Select Language: ";

    // const languageSelector = document.createElement("select");
    // languageSelector.id = "languageSelector";

    // availableLanguages.forEach(lang => {
    //     const option = document.createElement("option");
    //     option.value = lang.code;
    //     option.innerText = lang.name;
    //     if (lang.code === currentLanguage) {
    //         option.selected = true;
    //     }
    //     languageSelector.appendChild(option);
    // });

    // languageSelector.addEventListener("change", changeLanguage);

    // languageSelectorContainer.appendChild(languageLabel);
    // languageSelectorContainer.appendChild(languageSelector);
    // contentElement.appendChild(languageSelectorContainer);

    // Create top bar with navigation and timer
    const topBarElement = document.createElement("div");
    const previousButtonElement = document.createElement("button");
    const questionNumberElement = document.createElement("p");
    const timerElement = document.createElement("p");
    const nextButtonElement = document.createElement("button");

    topBarElement.id = "topBar";
    previousButtonElement.id = "previousButton";
    nextButtonElement.id = "nextButton";
    questionNumberElement.id = "questionNumber";
    timerElement.id = "timer";

    previousButtonElement.innerText = "Previous Question";
    nextButtonElement.innerText = "Next Question";
    questionNumberElement.innerText = "1"; // Start with question 1

    contentElement.appendChild(topBarElement);
    topBarElement.appendChild(previousButtonElement);
    topBarElement.appendChild(questionNumberElement);
    topBarElement.appendChild(timerElement);
    topBarElement.appendChild(nextButtonElement);

    previousButtonElement.addEventListener("click", loadPreviousQuestion);
    nextButtonElement.addEventListener("click", loadNextQuestion);

    // Create question text element
    const questionTextElement = document.createElement("p");
    questionTextElement.id = "questionText";
    contentElement.appendChild(questionTextElement);

    // Create options container
    const optionsContainer = document.createElement("div");
    optionsContainer.id = "optionsContainer";
    contentElement.appendChild(optionsContainer);

    // Create option buttons
    for (let i = 0; i < 4; i++) {
        let option = document.createElement("button");
        option.className = "options";
        option.type = "button";
        option.id = `option${i}`;

        // Use an anonymous function that captures the value of i
        option.addEventListener("click", () => {
            selectOption(i);
        });

        optionsContainer.appendChild(option);
    }

    // Create save button
    let saveButtonElement = document.createElement("button");
    saveButtonElement.id = "saveButtonID";
    saveButtonElement.className = "saveButton";
    saveButtonElement.type = "button";
    saveButtonElement.innerText = "Save";
    saveButtonElement.addEventListener("click", () => {
        saveOption(questionNumber);
    });
    contentElement.appendChild(saveButtonElement);

    // Start the timer
    clock();

    // Load first question and increment questionNumber
    questionNumber = 1;
    loadQuestion(1);
}

function startPage() {
    questionNumber = 0;
    selectedOptionForQuestions = Array(maxQuestion).fill(null);

    contentElement.innerHTML = "";
    contentElement.id = "startPage";

    // Create language selector for start page
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

// Initialize the application
startPage();