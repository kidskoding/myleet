from solution import longest_ones


def test_longest_ones_single_element():
    assert longest_ones([1], 0) == 1


def test_longest_ones_normal():
    assert longest_ones([1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0], 2) == 6


def test_longest_ones_no_flips_allowed():
    assert longest_ones([1, 0, 1, 1, 0], 0) == 2


def test_longest_ones_all_ones():
    assert longest_ones([1, 1, 1], 2) == 3
