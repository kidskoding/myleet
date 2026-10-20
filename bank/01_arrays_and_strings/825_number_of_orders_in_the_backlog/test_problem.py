from solution import get_number_of_backlog_orders


def test_get_number_of_backlog_orders_example_small():
    assert get_number_of_backlog_orders([[10, 5, 0], [15, 2, 1], [25, 1, 1], [30, 4, 0]]) == 6


def test_get_number_of_backlog_orders_example_modulo():
    orders = [[7, 1000000000, 1], [15, 3, 0], [5, 999999995, 0], [5, 1, 1]]
    assert get_number_of_backlog_orders(orders) == 999999984


def test_get_number_of_backlog_orders_single_batch():
    assert get_number_of_backlog_orders([[3, 7, 1]]) == 7


def test_get_number_of_backlog_orders_exact_match():
    assert get_number_of_backlog_orders([[5, 3, 0], [5, 3, 1]]) == 0


def test_get_number_of_backlog_orders_no_overlap():
    assert get_number_of_backlog_orders([[4, 2, 0], [5, 3, 1]]) == 5


def test_get_number_of_backlog_orders_partial_fill():
    assert get_number_of_backlog_orders([[10, 5, 1], [12, 2, 0], [9, 1, 0]]) == 4
