from solution import max_sub_array_len


def test_max_sub_array_len_normal():
    assert max_sub_array_len([1, -1, 5, -2, 3], 3) == 4


def test_max_sub_array_len_negatives():
    assert max_sub_array_len([-2, -1, 2, 1], 1) == 2


def test_max_sub_array_len_no_match():
    assert max_sub_array_len([1, 2, 3], 10) == 0
