from solution import max_sum


def test_max_sum_example_one():
    assert max_sum([[6, 2, 1, 3], [4, 2, 1, 5], [9, 2, 8, 7], [4, 1, 2, 9]]) == 30


def test_max_sum_single_hourglass():
    assert max_sum([[1, 2, 3], [4, 5, 6], [7, 8, 9]]) == 35


def test_max_sum_all_zeros():
    assert max_sum([[0] * 3 for _ in range(3)]) == 0


def test_max_sum_ignores_middle_sides():
    assert max_sum([[0, 0, 0], [100, 1, 100], [0, 0, 0]]) == 1


def test_max_sum_rightmost_window():
    assert max_sum([[1, 1, 1, 1], [1, 1, 1, 1], [1, 1, 1, 9]]) == 15
