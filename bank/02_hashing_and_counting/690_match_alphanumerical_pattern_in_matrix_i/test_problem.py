from solution import find_pattern


def test_find_pattern_letters_only():
    assert find_pattern([[1, 2, 2], [2, 2, 3], [2, 3, 3]], ["ab", "bb"]) == [0, 0]


def test_find_pattern_with_digits():
    assert find_pattern([[1, 1, 2], [3, 3, 4], [6, 6, 6]], ["ab", "66"]) == [1, 1]


def test_find_pattern_no_match():
    assert find_pattern([[1, 2], [2, 1]], ["xx"]) == [-1, -1]


def test_find_pattern_distinct_letters_need_distinct_digits():
    assert find_pattern([[5, 5, 7]], ["ab"]) == [0, 1]


def test_find_pattern_prefers_smaller_row_then_column():
    assert find_pattern([[0, 9, 9], [9, 9, 0]], ["9"]) == [0, 1]


def test_find_pattern_whole_board():
    assert find_pattern([[4, 8], [8, 4]], ["xy", "yx"]) == [0, 0]
