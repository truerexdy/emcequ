package questions

type question struct {
	q_text     string   "json:q_text"
	options    []string "json:options"
	answer     int64    "json/answer"
	max_points int64    "json/max_points"
}

type question_pack struct {
	q_set   int64    "json/set_no"
	lang    string   "json/lang"
	q_id    int64    "json/q_id"
	content question "json/content"
}
