from solution import min_sub_array_len


def test_min_sub_array_len_empty():
    assert min_sub_array_len(7, []) == 0


def test_min_sub_array_len_single_meets_target():
    assert min_sub_array_len(4, [4]) == 1


def test_min_sub_array_len_normal():
    assert min_sub_array_len(7, [2, 3, 1, 2, 4, 3]) == 2


def test_min_sub_array_len_no_valid_subarray():
    assert min_sub_array_len(100, [1, 2, 3]) == 0
