from solution import max_sub_array


def test_max_sub_array_normal():
    assert max_sub_array([-2, 1, -3, 4, -1, 2, 1, -5, 4]) == 6


def test_max_sub_array_all_negative():
    assert max_sub_array([-1]) == -1
