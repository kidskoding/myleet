from solution import min_falling_path_sum


def test_min_falling_path_sum_normal():
    assert min_falling_path_sum([[2, 1, 3], [6, 5, 4], [7, 8, 9]]) == 13


def test_min_falling_path_sum_negatives():
    assert min_falling_path_sum([[-19, 57], [-40, -5]]) == -59
