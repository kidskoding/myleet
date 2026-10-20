from solution import max_score


def test_max_score_example_one():
    assert max_score([[9, 5, 7, 3], [8, 9, 6, 1], [6, 7, 14, 3], [2, 5, 3, 1]]) == 9


def test_max_score_forced_negative():
    assert max_score([[4, 3, 2], [3, 2, 1]]) == -1


def test_max_score_two_by_two_increasing():
    assert max_score([[1, 2], [3, 4]]) == 3


def test_max_score_all_equal():
    assert max_score([[5, 5], [5, 5]]) == 0


def test_max_score_best_not_adjacent():
    assert max_score([[2, 9, 9], [9, 9, 1], [9, 9, 10]]) == 9
