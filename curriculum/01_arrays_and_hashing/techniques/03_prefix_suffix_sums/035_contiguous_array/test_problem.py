from solution import find_max_length


def test_find_max_length_pair():
    assert find_max_length([0, 1]) == 2


def test_find_max_length_odd_length():
    assert find_max_length([0, 1, 0]) == 2


def test_find_max_length_no_ones():
    assert find_max_length([0, 0, 0]) == 0


def test_find_max_length_longer():
    assert find_max_length([0, 1, 1, 0, 1, 1, 1, 0]) == 4
