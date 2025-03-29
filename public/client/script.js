const maxQuestion = 10;
var questionNumber = 0;
const maxTime = 600;
var questionListObject;

var selectedOption = 0;
var selectedOptionForQuestions = []

let rootElement = document.getElementById("root");
let contentElement = document.getElementById("content");

function scoreCard(){
}

function timeUp(){
}

async function clock(){
    var timerElement = document.getElementById("timer");
    let minutes = Math.floor(maxTime/60);
    let seconds = maxTime%60;
    let time = maxTime;
    while(time>=0){
        timerElement.innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        time -= 1;
        minutes = Math.floor(time/60);
        seconds = time%60;
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    timeUp();
}

function loadQuestion(number){

}

function loadPreviousQuestion(){
    if(questionNumber <= 1){
        return;
    } else if(questionNumber >= maxQuestion){
        let nextButtonElement = document.getElementById("nextButton");
        nextButtonElement.innerText = "Next Question";
        nextButtonElement.removeEventListener();
        nextButtonElement.addEventListener("click", loadNextQuestion);
    }
    questionNumber -= 1;
    let questionNumberElement = document.getElementById("questionNumber");
    questionNumberElement.innerText = questionNumber.toString();
}

function submitAnswers(){

}


function loadNextQuestion(){
    if(questionNumber < maxQuestion){
        questionNumber += 1;
    }
    if(questionNumber >= maxQuestion){
        let nextButtonElement = document.getElementById("nextButton");
        nextButtonElement.innerText = "Submit";
        nextButtonElement.removeEventListener();
        nextButtonElement.addEventListener("click", submitAnswers);
    }
    let questionNumberElement = document.getElementById("questionNumber");
    questionNumberElement.innerText = questionNumber.toString();
    
}

function selectOption(ind){
    selectedOption = ind;
}

function saveOption(num){
    selectedOptionForQuestions[num-1] = selectOption;
}

function loadQuestionUI(){
    questionNumber += 1;
    contentElement.innerHTML = "";
    contentElement.id = "questionPage";

    let topBarElement = document.createElement("div");
    let previousButtonElement = document.createElement("button");
    let questionNumberElement = document.createElement("p");
    let timerElement = document.createElement("p");
    let nextButtonElement = document.createElement("button")

    topBarElement.id = "topBar";
    previousButtonElement.id = "previousButton";
    nextButtonElement.id = "nextButton";
    questionNumberElement.id = "questionNumber";
    timerElement.id = "timer";

    previousButtonElement.innerText = "Previous Question";
    nextButtonElement.innerText = "Next Button";
    questionNumberElement.innerText = questionNumber.toString();

    contentElement.appendChild(topBarElement);
    topBarElement.appendChild(previousButtonElement);
    topBarElement.appendChild(questionNumberElement);
    topBarElement.appendChild(timerElement);
    topBarElement.appendChild(nextButtonElement);

    previousButtonElement.addEventListener("click", loadPreviousQuestion);
    nextButtonElement.addEventListener("click", loadNextQuestion);

    clock();

    let questionTextElemet = document.createElement("p");
    let options = [];
    for(i=0; i<4; i++){
        options[i] = document.createElement("p");
        options[i].id = "options";
        options[i].innerText = `option ${i}`
        options[i].addEventListener("click", ()=>{
            selectOption(i);
        });
    }

    let saveButtonElement = document.createElement("button");
    saveButtonElement.innerText = "Save";
    saveButtonElement.addEventListener("click", saveOption);

    questionTextElemet.id = "questionText";
    questionTextElemet.innerText = "Question";

    contentElement.appendChild(questionTextElemet);
    for(i=0; i<4; i++){
        contentElement.appendChild(options[i]);
    }
    contentElement.appendChild(saveButtonElement);

}

function startPage(){
    contentElement.innerHTML = "";
    contentElement.id = "startPage";
    let startButtonElement = document.createElement("button");
    startButtonElement.className = "button";
    startButtonElement.type = "button";
    startButtonElement.name = "startButton";
    startButtonElement.value = "Start";
    startButtonElement.innerHTML = "Start"
    startButtonElement.addEventListener("click", loadQuestionUI);
    contentElement.appendChild(startButtonElement);
}

startPage();