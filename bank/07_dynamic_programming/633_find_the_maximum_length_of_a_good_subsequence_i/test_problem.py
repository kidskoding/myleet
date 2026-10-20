from solution import maximum_length


def test_maximum_length_example_one():
    assert maximum_length([1, 2, 1, 1, 3], 2) == 4


def test_maximum_length_no_changes_allowed():
    assert maximum_length([1, 2, 3, 4, 5, 1], 0) == 2


def test_maximum_length_all_equal():
    assert maximum_length([5, 5, 5], 0) == 3


def test_maximum_length_generous_budget():
    assert maximum_length([1, 2, 3], 5) == 3


def test_maximum_length_single():
    assert maximum_length([1], 0) == 1


def test_maximum_length_one_change():
    assert maximum_length([1, 2, 1, 2, 1, 2, 3, 3], 1) == 5
