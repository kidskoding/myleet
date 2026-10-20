from solution import largest_path_value


def test_largest_path_value_normal_case():
    assert largest_path_value("abaca", [[0, 1], [0, 2], [2, 3], [3, 4]]) == 3


def test_largest_path_value_cycle_returns_negative_one():
    assert largest_path_value("a", [[0, 0]]) == -1
