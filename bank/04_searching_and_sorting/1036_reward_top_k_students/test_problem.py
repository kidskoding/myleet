from solution import top_students

POSITIVE = ["smart", "brilliant", "studious"]
NEGATIVE = ["not"]


def test_top_students_tie_broken_by_id():
    report = ["this student is studious", "the student is smart"]
    assert top_students(POSITIVE, NEGATIVE, report, [1, 2], 2) == [1, 2]


def test_top_students_negative_word_lowers_rank():
    report = ["this student is not studious", "the student is smart"]
    assert top_students(POSITIVE, NEGATIVE, report, [1, 2], 2) == [2, 1]


def test_top_students_k_smaller_than_n():
    report = ["smart", "brilliant brilliant", "nothing here"]
    assert top_students(POSITIVE, NEGATIVE, report, [10, 20, 30], 1) == [20]


def test_top_students_negative_scores():
    report = ["not not", "not", "plain"]
    assert top_students(POSITIVE, NEGATIVE, report, [3, 2, 1], 3) == [1, 2, 3]


def test_top_students_repeated_words_count_each_time():
    report = ["smart smart not", "studious"]
    assert top_students(POSITIVE, NEGATIVE, report, [7, 4], 2) == [7, 4]
