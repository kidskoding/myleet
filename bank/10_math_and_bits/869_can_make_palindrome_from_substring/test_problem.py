from solution import can_make_pali_queries


def test_can_make_pali_queries_example():
    queries = [[3, 3, 0], [1, 2, 0], [0, 3, 1], [0, 3, 2], [0, 4, 1]]
    assert can_make_pali_queries("abcda", queries) == [True, False, False, True, True]


def test_can_make_pali_queries_short_string():
    assert can_make_pali_queries("lyb", [[0, 1, 0], [2, 2, 1]]) == [False, True]


def test_can_make_pali_queries_single_character():
    assert can_make_pali_queries("z", [[0, 0, 0]]) == [True]


def test_can_make_pali_queries_rearrangement_only():
    assert can_make_pali_queries("aabb", [[0, 3, 0], [0, 2, 0], [1, 3, 0]]) == [True, True, True]


def test_can_make_pali_queries_odd_letters_need_replacements():
    assert can_make_pali_queries("abcdef", [[0, 5, 2], [0, 5, 3], [0, 4, 2]]) == [False, True, True]
