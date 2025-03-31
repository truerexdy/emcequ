package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"

	_ "github.com/mattn/go-sqlite3"
)

var dbPath string = "./db/teams.db"
var db *sql.DB

type Question struct {
	QText     string   `json:"q_text"`
	Options   []string `json:"options"`
	Answer    int      `json:"answer"`
	MaxPoints int      `json:"max_points"`
	QID       string   `json:"q_id"`
}

type ScoreObject struct {
	TeamID     int64 `json:"TeamID"`
	TotalScore int   `json:"TotalScore"`
}

type QuestionsResponse struct {
	Status    string     `json:"status"`
	Language  string     `json:"language"`
	Questions []Question `json:"questions"`
}

const questionsDir = "./questions"

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

func ScoreHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	log.Printf("ScoreHandler called with method: %s", r.Method)

	if r.Method == http.MethodPost {
		// Handle POST request for updating scores
		var data ScoreObject
		decoder := json.NewDecoder(r.Body)
		err := decoder.Decode(&data)
		if err != nil {
			log.Printf("Invalid JSON body: %v", err)
			http.Error(w, "Invalid JSON body: "+err.Error(), http.StatusBadRequest)
			return
		}

		log.Printf("Received POST data - TeamID: %d, TotalScore: %d", data.TeamID, data.TotalScore)

		// Execute the update with proper parameter order
		result, err := db.Exec("UPDATE teams SET total_score = ? WHERE team_id = ?", data.TotalScore, data.TeamID)
		if err != nil {
			log.Printf("Error updating the db: %v", err)
			http.Error(w, "Database update error", http.StatusInternalServerError)
			return
		}

		// Check if any rows were affected
		rowsAffected, err := result.RowsAffected()
		if err != nil {
			log.Printf("Error getting rows affected: %v", err)
		} else {
			log.Printf("Rows affected by update: %d", rowsAffected)
			if rowsAffected == 0 {
				log.Printf("Warning: No rows were affected. Team ID may not exist: %d", data.TeamID)
				http.Error(w, "Team ID not found", http.StatusNotFound)
				return
			}
		}

		// Respond with success
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"message": "Score updated successfully",
		})

	} else if r.Method == http.MethodGet {
		// Handle GET request for creating a new team

		// Insert a new team with total_score = 0
		result, err := db.Exec("INSERT INTO teams (total_score) VALUES (0)")
		if err != nil {
			log.Printf("Error inserting new team: %v", err)
			http.Error(w, "Database insertion error", http.StatusInternalServerError)
			return
		}

		id, err := result.LastInsertId()
		if err != nil {
			log.Printf("Error getting last insert ID: %v", err)
			http.Error(w, "Failed to get ID", http.StatusInternalServerError)
			return
		}

		log.Printf("New team created with ID: %d", id)

		// Create the response object
		responseData := ScoreObject{
			TeamID:     id,
			TotalScore: 0,
		}

		// Log the response data we're sending
		responseBytes, _ := json.Marshal(responseData)
		log.Printf("Sending response: %s", string(responseBytes))

		// Set headers and write response
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)

		err = json.NewEncoder(w).Encode(responseData)
		if err != nil {
			log.Printf("Error encoding JSON response: %v", err)
			http.Error(w, "Error encoding response", http.StatusInternalServerError)
			return
		}
	} else {
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func main() {
	var err error
	db, err = sql.Open("sqlite3", dbPath)
	if err != nil {
		log.Fatalf("DB not connected.")
	}
	mux := http.NewServeMux()

	mux.HandleFunc("/", homeHandler)
	mux.HandleFunc("/api/questions", questionsHandler)
	mux.HandleFunc("/score", ScoreHandler)

	port := "8080"
	log.Printf("Server starting on port %s...", port)
	server := &http.Server{
		Addr:    ":" + port,
		Handler: mux,
	}

	err = server.ListenAndServe()
	if err != nil {
		log.Fatal("ListenAndServe error: ", err)
	}
}
