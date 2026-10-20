from solution import count_orders


def test_count_orders_one():
    assert count_orders(1) == 1


def test_count_orders_two():
    assert count_orders(2) == 6


def test_count_orders_three():
    assert count_orders(3) == 90


def test_count_orders_four():
    assert count_orders(4) == 2520


def test_count_orders_max_is_reduced_mod():
    assert count_orders(500) == 764678010
