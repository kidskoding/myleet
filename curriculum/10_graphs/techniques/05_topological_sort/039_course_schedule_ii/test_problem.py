from solution import find_order


def test_find_order_normal_case():
    assert find_order(2, [[1, 0]]) == [0, 1]


def test_find_order_cycle_returns_empty():
    assert find_order(2, [[1, 0], [0, 1]]) == []


def test_find_order_no_prerequisites():
    assert sorted(find_order(3, [])) == [0, 1, 2]
