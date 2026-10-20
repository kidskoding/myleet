from solution import left_right_difference


def test_left_right_difference_normal():
    assert left_right_difference([10, 4, 8, 3]) == [15, 1, 11, 22]


def test_left_right_difference_single():
    assert left_right_difference([1]) == [0]
