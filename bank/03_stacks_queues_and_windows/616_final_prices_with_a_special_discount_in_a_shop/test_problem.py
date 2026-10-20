from solution import final_prices


def test_final_prices_mixed():
    assert final_prices([8, 4, 6, 2, 3]) == [4, 2, 4, 2, 3]


def test_final_prices_increasing_no_discounts():
    assert final_prices([1, 2, 3, 4, 5]) == [1, 2, 3, 4, 5]


def test_final_prices_equal_price_counts():
    assert final_prices([10, 1, 1, 6]) == [9, 0, 1, 6]


def test_final_prices_single():
    assert final_prices([5]) == [5]


def test_final_prices_decreasing():
    assert final_prices([5, 4, 3]) == [1, 1, 3]
