from solution import max_distance


def test_max_distance_last_word_differs():
    assert max_distance(["leetcode", "leetcode", "codeforces"]) == 3


def test_max_distance_inner_pair():
    assert max_distance(["a", "b", "c", "a", "a"]) == 4


def test_max_distance_all_equal():
    assert max_distance(["z", "z", "z"]) == 0


def test_max_distance_single_word():
    assert max_distance(["a"]) == 0


def test_max_distance_two_different():
    assert max_distance(["a", "b"]) == 2


def test_max_distance_ends_equal_but_middle_differs():
    assert max_distance(["x", "x", "y", "x"]) == 3
