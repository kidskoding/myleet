from solution import intersection_size_two


def test_intersection_size_two_chain():
    assert intersection_size_two([[1, 3], [3, 7], [8, 9]]) == 5


def test_intersection_size_two_nested():
    assert intersection_size_two([[1, 3], [1, 4], [2, 5], [3, 5]]) == 3
