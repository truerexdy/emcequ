package questions

import (
	"encoding/json"
	"errors"
	"os"
)

type question struct {
	QText     string   `json:"q_text"`
	Options   []string `json:"options"`
	Answer    int64    `json:"answer"`
	MaxPoints int64    `json:"max_points"`
}

type question_pack struct {
	QSet    string   `json:"set_no"`
	Lang    string   `json:"lang"`
	QID     string   `json:"q_id"`
	Content question `json:"content"`
}

const question_set_dir string = "/question_sets/"

func get_question(q_set string, lang string, q_id string) (question, error) {
	var path string = question_set_dir + q_set + lang + q_id
	var q question
	_, err := os.Stat(path)
	if err != nil {
		if os.IsNotExist(err) {
			return q, errors.New("Question does not exist.")
		}
		return q, err
	}
	q_file, err := os.Open(path)
	if err != nil {
		return q, errors.New("Could not open file.")
	}
	defer q_file.Close()
	json_decoder := json.NewDecoder(q_file)
	err = json_decoder.Decode(&q)
	if err != nil {
		return q, err
	}
	return q, nil
}
