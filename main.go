package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
)

// Question struct as per the new response format
type Question struct {
	QText     string   `json:"q_text"`
	Options   []string `json:"options"`
	Answer    int      `json:"answer"` // Changed to int as per example
	MaxPoints int      `json:"max_points"`
	QID       string   `json:"q_id"`
}

// Response struct as per the specified format
type QuestionsResponse struct {
	Status    string     `json:"status"`
	Language  string     `json:"language"`
	Questions []Question `json:"questions"`
}

const questionsDir = "./questions" // Directory to store question set JSON files

func homeHandler(w http.ResponseWriter, r *http.Request) {
	cwd, err := os.Getwd()
	if err != nil {
		http.Error(w, "Error getting current directory", http.StatusInternalServerError)
		log.Println("Error getting current directory:", err)
		return
	}
	publicDirBase := filepath.Join(cwd, "public")
	fmt.Println("Serving ", publicDirBase)
	http.FileServer(http.Dir(publicDirBase)).ServeHTTP(w, r)
}

func questionsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.Header().Set("Allow", http.MethodGet)
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	lang := r.URL.Query().Get("lang")
	if lang == "" {
		http.Error(w, "Missing 'lang' query parameter", http.StatusBadRequest)
		return
	}

	filePath := filepath.Join(questionsDir, fmt.Sprintf("%s.json", lang))

	_, err := os.Stat(filePath)
	if os.IsNotExist(err) {
		http.Error(w, fmt.Sprintf("Question set for language '%s' not found", lang), http.StatusNotFound)
		return
	}

	file, err := os.Open(filePath)
	if err != nil {
		log.Printf("Error opening question set file: %v", err)
		http.Error(w, "Failed to open question set file", http.StatusInternalServerError)
		return
	}
	defer file.Close()

	var questions []Question
	decoder := json.NewDecoder(file)
	err = decoder.Decode(&questions)
	if err != nil {
		log.Printf("Error decoding question set JSON: %v", err)
		http.Error(w, "Failed to decode question set JSON", http.StatusInternalServerError)
		return
	}

	response := QuestionsResponse{
		Status:    "success",
		Language:  lang,
		Questions: questions,
	}

	w.Header().Set("Content-Type", "application/json")
	encoder := json.NewEncoder(w)
	err = encoder.Encode(response)
	if err != nil {
		log.Printf("Error encoding response to JSON: %v", err)
		http.Error(w, "Error encoding JSON response", http.StatusInternalServerError)
		return
	}
}

func main() {
	// Declaring the Mux
	mux := http.NewServeMux()

	// Mapping request directories to handler functions
	mux.HandleFunc("/", homeHandler)
	mux.HandleFunc("/api/questions", questionsHandler)

	//Port number must be changed to 80 for http and 443 for https before deploying
	port := "8080"
	log.Printf("Server starting on port %s...", port)

	// Creating a server and configuring port and mux
	server := &http.Server{
		Addr:    ":" + port,
		Handler: mux,
	}

	// Starting the server
	err := server.ListenAndServe()
	if err != nil {
		log.Fatal("ListenAndServe error: ", err)
	}
}
