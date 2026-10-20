from solution import find_circle_num


def test_find_circle_num_two_provinces():
    assert find_circle_num([[1, 1, 0], [1, 1, 0], [0, 0, 1]]) == 2


def test_find_circle_num_all_isolated():
    assert find_circle_num([[1, 0, 0], [0, 1, 0], [0, 0, 1]]) == 3
