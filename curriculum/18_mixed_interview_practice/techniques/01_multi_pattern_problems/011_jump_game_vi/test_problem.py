from solution import max_result


def test_max_result_normal():
    assert max_result([1, -1, -2, 4, -7, 3], 2) == 7


def test_max_result_large_jumps():
    assert max_result([10, -5, -2, 4, 0, 3], 3) == 17


def test_max_result_all_negative_middle():
    assert max_result([1, -5, -20, 4, -1, 3, -6, -3], 2) == 0
