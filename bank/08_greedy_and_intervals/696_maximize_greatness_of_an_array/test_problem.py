from solution import maximize_greatness


def test_maximize_greatness_example_one():
    assert maximize_greatness([1, 3, 5, 2, 1, 3, 1]) == 4


def test_maximize_greatness_distinct():
    assert maximize_greatness([1, 2, 3, 4]) == 3


def test_maximize_greatness_all_equal():
    assert maximize_greatness([1, 1, 1]) == 0


def test_maximize_greatness_single():
    assert maximize_greatness([5]) == 0


def test_maximize_greatness_pairs():
    assert maximize_greatness([1, 1, 2, 2]) == 2
