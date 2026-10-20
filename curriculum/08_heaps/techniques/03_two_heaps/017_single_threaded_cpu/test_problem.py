from solution import get_order


def test_get_order_normal():
    assert get_order([[1, 2], [2, 4], [3, 2], [4, 1]]) == [0, 2, 3, 1]


def test_get_order_all_same_arrival():
    assert get_order([[7, 10], [7, 12], [7, 5], [7, 4], [7, 2]]) == [4, 3, 2, 0, 1]
