from solution import max_number


def test_max_number_normal():
    assert max_number([3, 4, 6, 5], [9, 1, 2, 5, 8, 3], 5) == [9, 8, 6, 5, 3]


def test_max_number_uses_all_digits():
    assert max_number([6, 7], [6, 0, 4], 5) == [6, 7, 6, 0, 4]


def test_max_number_interleaves():
    assert max_number([3, 9], [8, 9], 3) == [9, 8, 9]
