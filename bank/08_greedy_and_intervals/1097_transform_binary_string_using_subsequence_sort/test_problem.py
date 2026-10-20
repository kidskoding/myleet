from solution import transform_str


def test_transform_str_example_one():
    assert transform_str("101", ["1?1", "0?1", "0?0"]) == [True, True, False]


def test_transform_str_example_two():
    assert transform_str("1100", ["0011", "11?1", "1?1?"]) == [True, False, True]


def test_transform_str_example_three():
    assert transform_str("1010", ["0011"]) == [True]


def test_transform_str_cannot_move_ones_left():
    assert transform_str("011", ["101", "110", "011"]) == [False, False, True]


def test_transform_str_single_char():
    assert transform_str("0", ["?", "1", "0"]) == [True, False, True]


def test_transform_str_all_question_marks():
    assert transform_str("0110", ["????"]) == [True]
