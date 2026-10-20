from solution import tallest_billboard


def test_tallest_billboard_one_rod_against_three():
    assert tallest_billboard([1, 2, 3, 6]) == 6


def test_tallest_billboard_leave_rod_out():
    assert tallest_billboard([1, 2, 3, 4, 5, 6]) == 10


def test_tallest_billboard_impossible():
    assert tallest_billboard([1, 2]) == 0


def test_tallest_billboard_single_rod():
    assert tallest_billboard([1]) == 0


def test_tallest_billboard_equal_pair():
    assert tallest_billboard([5, 5]) == 5


def test_tallest_billboard_four_ones():
    assert tallest_billboard([1, 1, 1, 1]) == 2
