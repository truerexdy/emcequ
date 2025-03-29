package main

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"

	_ "github.com/mattn/go-sqlite3"
)

// Database schema:
// CREATE TABLE IF NOT EXISTS teams(
//     team_id INTEGER PRIMARY KEY AUTOINCREMENT,
//     total_score INTEGER
// );

// Models
type Question struct {
	QText     string   `json:"q_text"`
	Options   []string `json:"options"`
	Answer    int64    `json:"answer"`
	MaxPoints int64    `json:"max_points"`
	QID       string   `json:"q_id"`
}

type QuestionPack struct {
	QSet    string   `json:"set_no"`
	Lang    string   `json:"lang"`
	QID     string   `json:"q_id"`
	Content Question `json:"content"`
}

// Request/Response structures
type QuestionRequest struct {
	SetNo string `json:"set_no"`
	Lang  string `json:"lang"`
	QID   string `json:"q_id"`
}

type ScoreUpdateRequest struct {
	TeamID int64 `json:"team_id"`
	Points int64 `json:"points"`
}

type ScoreResponse struct {
	TeamID int64 `json:"team_id"`
	Score  int64 `json:"score"`
}

type TeamResponse struct {
	TeamID int64 `json:"team_id"`
}

// Configuration
const (
	QuestionSetDir = "question_sets/"
	DatabasePath   = "db/teams.sql"
	ServerPort     = "8080"
)

// Database operations
func connectDB() (*sql.DB, error) {
	db, err := sql.Open("sqlite3", DatabasePath)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Test connection
	if err = db.Ping(); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return db, nil
}

func createTeam(db *sql.DB) (int64, error) {
	if db == nil {
		return -1, errors.New("database connection is nil")
	}

	result, err := db.Exec("INSERT INTO teams (total_score) VALUES (0)")
	if err != nil {
		return -1, fmt.Errorf("failed to insert team: %w", err)
	}

	lastInsertID, err := result.LastInsertId()
	if err != nil {
		return -1, fmt.Errorf("failed to get last insert ID: %w", err)
	}

	return lastInsertID, nil
}

func getScore(db *sql.DB, teamID int64) (int64, error) {
	if db == nil {
		return -1, errors.New("database connection is nil")
	}

	if teamID < 0 {
		return -1, errors.New("team ID must be non-negative")
	}

	var currentScore int64
	err := db.QueryRow("SELECT total_score FROM teams WHERE team_id = ?", teamID).Scan(&currentScore)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return -1, errors.New("team does not exist")
		}
		return -1, fmt.Errorf("database error: %w", err)
	}

	return currentScore, nil
}

func addScore(db *sql.DB, teamID int64, points int64) (int64, error) {
	if db == nil {
		return -1, errors.New("database connection is nil")
	}

	if teamID < 0 {
		return -1, errors.New("team ID must be non-negative")
	}

	if points < 1 {
		return -1, errors.New("points must be at least 1")
	}

	// Use transaction to ensure atomicity
	tx, err := db.Begin()
	if err != nil {
		return -1, fmt.Errorf("failed to begin transaction: %w", err)
	}

	defer func() {
		if err != nil {
			tx.Rollback()
		}
	}()

	// Get current score within transaction
	var currentScore int64
	err = tx.QueryRow("SELECT total_score FROM teams WHERE team_id = ?", teamID).Scan(&currentScore)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return -1, errors.New("team does not exist")
		}
		return -1, fmt.Errorf("database error: %w", err)
	}

	// Update score
	newScore := currentScore + points
	_, err = tx.Exec("UPDATE teams SET total_score = ? WHERE team_id = ?", newScore, teamID)
	if err != nil {
		return -1, fmt.Errorf("failed to update score: %w", err)
	}

	// Commit transaction
	if err = tx.Commit(); err != nil {
		return -1, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return newScore, nil
}

// Question operations
func getQuestion(qSet string, lang string, qID string) (Question, error) {
	var q Question

	if qSet == "" || lang == "" || qID == "" {
		return q, errors.New("question set, language, and question ID are required")
	}

	path := filepath.Join(QuestionSetDir, qSet, lang+".json")

	// Check if file exists
	if _, err := os.Stat(path); err != nil {
		if os.IsNotExist(err) {
			return q, fmt.Errorf("question set for language %s does not exist", lang)
		}
		return q, fmt.Errorf("error accessing question file: %w", err)
	}

	// Open and read file
	qFile, err := os.Open(path)
	if err != nil {
		return q, fmt.Errorf("could not open question file: %w", err)
	}
	defer qFile.Close()

	// Decode JSON
	var questions []Question
	jsonDecoder := json.NewDecoder(qFile)
	if err := jsonDecoder.Decode(&questions); err != nil {
		return q, fmt.Errorf("error decoding JSON: %w", err)
	}

	// Find matching question
	for _, currentQ := range questions {
		if currentQ.QID == qID {
			return currentQ, nil
		}
	}

	return q, fmt.Errorf("question with ID %s not found in set", qID)
}

// HTTP handlers
func homeHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}

	cwd, err := os.Getwd()
	if err != nil {
		http.Error(w, "Error getting current directory", http.StatusInternalServerError)
		log.Println("Error getting current directory:", err)
		return
	}

	publicDirBase := filepath.Join(cwd, "public", "client")
	http.FileServer(http.Dir(publicDirBase)).ServeHTTP(w, r)
}

func apiQuestionHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", http.MethodPost)
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req QuestionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	if req.SetNo == "" || req.Lang == "" || req.QID == "" {
		http.Error(w, "Missing required fields: set_no, lang, and q_id", http.StatusBadRequest)
		return
	}

	q, err := getQuestion(req.SetNo, req.Lang, req.QID)
	if err != nil {
		log.Printf("Error getting question: %v", err)
		http.Error(w, "Question not found", http.StatusNotFound)
		return
	}

	qp := QuestionPack{
		QSet:    req.SetNo,
		Lang:    req.Lang,
		QID:     req.QID,
		Content: q,
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(qp); err != nil {
		log.Printf("Error encoding response: %v", err)
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

func scoreHandler(w http.ResponseWriter, r *http.Request) {
	// Connect to database
	db, err := connectDB()
	if err != nil {
		log.Printf("Database connection error: %v", err)
		http.Error(w, "Database connection error", http.StatusInternalServerError)
		return
	}
	defer db.Close()

	// Handle different HTTP methods
	switch r.Method {
	case http.MethodGet:
		// Getting team score
		teamIDStr := r.URL.Query().Get("team_id")
		if teamIDStr == "" {
			http.Error(w, "Missing team_id parameter", http.StatusBadRequest)
			return
		}

		teamID, err := strconv.ParseInt(teamIDStr, 10, 64)
		if err != nil {
			http.Error(w, "Invalid team_id parameter", http.StatusBadRequest)
			return
		}

		if teamID < 0 {
			http.Error(w, "team_id must be non-negative", http.StatusBadRequest)
			return
		}

		score, err := getScore(db, teamID)
		if err != nil {
			log.Printf("Error getting team score: %v", err)
			if err.Error() == "team does not exist" {
				http.Error(w, "Team not found", http.StatusNotFound)
			} else {
				http.Error(w, "Failed to retrieve score", http.StatusInternalServerError)
			}
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(ScoreResponse{
			TeamID: teamID,
			Score:  score,
		})

	case http.MethodPost:
		// Updating team score
		var req ScoreUpdateRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}
		defer r.Body.Close()

		if req.TeamID < 0 || req.Points < 1 {
			http.Error(w, "Invalid request: team_id must be >= 0 and points must be >= 1", http.StatusBadRequest)
			return
		}

		newScore, err := addScore(db, req.TeamID, req.Points)
		if err != nil {
			log.Printf("Error updating score: %v", err)
			if err.Error() == "team does not exist" {
				http.Error(w, "Team not found", http.StatusNotFound)
			} else {
				http.Error(w, "Failed to update score", http.StatusInternalServerError)
			}
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(ScoreResponse{
			TeamID: req.TeamID,
			Score:  newScore,
		})

	default:
		w.Header().Set("Allow", "GET, POST")
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func createTeamHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", http.MethodPost)
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	db, err := connectDB()
	if err != nil {
		log.Printf("Database connection error: %v", err)
		http.Error(w, "Database connection error", http.StatusInternalServerError)
		return
	}
	defer db.Close()

	teamID, err := createTeam(db)
	if err != nil {
		log.Printf("Error creating team: %v", err)
		http.Error(w, "Failed to create team", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(TeamResponse{TeamID: teamID})
}

// Server setup
func setupRoutes() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("/", homeHandler)
	mux.HandleFunc("/api/", apiQuestionHandler)
	mux.HandleFunc("/api/score", scoreHandler)
	mux.HandleFunc("/api/score/create", createTeamHandler)

	return mux
}

func main() {
	log.Println("Starting quiz server...")

	// Ensure required directories exist
	if _, err := os.Stat(filepath.Dir(DatabasePath)); os.IsNotExist(err) {
		if err := os.MkdirAll(filepath.Dir(DatabasePath), 0755); err != nil {
			log.Fatalf("Failed to create database directory: %v", err)
		}
	}

	if _, err := os.Stat(QuestionSetDir); os.IsNotExist(err) {
		if err := os.MkdirAll(QuestionSetDir, 0755); err != nil {
			log.Fatalf("Failed to create question sets directory: %v", err)
		}
	}

	// Initialize database connection to verify it works
	db, err := connectDB()
	if err != nil {
		log.Fatalf("Database initialization error: %v", err)
	}
	db.Close()

	// Set up server
	router := setupRoutes()
	server := &http.Server{
		Addr:    ":" + ServerPort,
		Handler: router,
	}

	log.Printf("Server starting on port %s...", ServerPort)
	if err := server.ListenAndServe(); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}
