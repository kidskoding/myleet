from solution import maximum_length


def test_maximum_length_example_one():
    assert maximum_length([1, 2, 1, 1, 3], 2) == 4


def test_maximum_length_no_changes_allowed():
    assert maximum_length([1, 2, 3, 4, 5, 1], 0) == 2


def test_maximum_length_single():
    assert maximum_length([7], 3) == 1


def test_maximum_length_skip_interruptions():
    assert maximum_length([4, 1, 4, 2, 4, 3, 4], 2) == 5


def test_maximum_length_one_change():
    assert maximum_length([2, 1, 1, 2, 2, 3, 1, 1, 3], 1) == 5


def test_maximum_length_large_input():
    assert maximum_length([i % 3 for i in range(3000)], 0) == 1000
