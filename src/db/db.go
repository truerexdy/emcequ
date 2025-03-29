package client

import (
	"database/sql"
	"errors"

	_ "github.com/mattn/go-sqlite3"
)

func db_connect(db_path string) (*sql.DB, error) {
	db, err := sql.Open("sqlite3", db_path)
	if err != nil {
		return nil, err
	}
	return db, nil
}

func create_team(db *sql.DB) (int64, error) {
	if db == nil {
		return -1, errors.New("db arguement is nil")
	}

	result, err := db.Exec("INSERT INTO teams (total_score) VALUES (0)")

	if err != nil {
		return -1, err
	}
	last_insert, err := result.LastInsertId()
	if err != nil {
		return -1, err
	}
	return last_insert, nil
}

func get_score(db *sql.DB, team_id int64) (int64, error) {
	if db == nil {
		return -1, errors.New("db arguement is nil")
	}
	var current_score int64
	err := db.QueryRow("SELECT total_score FROM teams WHERE team_id = ?", team_id).Scan(&current_score)
	if err != nil {
		if err == sql.ErrNoRows {
			return -1, errors.New("Team does not exist.")
		}
		return -1, err
	}
	return current_score, nil
}

func add_score(db *sql.DB, team_id int64, points int64) (int64, error) {
	if db == nil {
		return -1, errors.New("db arguement is nil")
	} else if points < 1 {
		return -1, errors.New("Point must be >=1")
	}
	current_score, err := get_score(db, team_id)
	if err != nil {
		return -1, err
	}
	_, err = db.Exec("UPDATE teams SET total_score = ? WHERE team_id = ?", current_score+points, team_id)
	if err != nil {
		if err == sql.ErrNoRows {
			return -1, errors.New("Team does not exist.")
		}
		return -1, err
	}
	return current_score + points, nil
}
