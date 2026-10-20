import pytest
from solution import Cashier


def make_cashier() -> Cashier:
    return Cashier(3, 50, [1, 2, 3, 4, 5, 6, 7], [100, 200, 300, 400, 300, 200, 100])


def test_cashier_first_two_bills_full_price():
    cashier = make_cashier()
    assert cashier.get_bill([1, 2], [1, 2]) == pytest.approx(500.0)
    assert cashier.get_bill([3, 7], [10, 10]) == pytest.approx(4000.0)


def test_cashier_every_third_bill_discounted():
    cashier = make_cashier()
    cashier.get_bill([1, 2], [1, 2])
    cashier.get_bill([3, 7], [10, 10])
    assert cashier.get_bill([1, 2, 3, 4, 5, 6, 7], [1, 1, 1, 1, 1, 1, 1]) == pytest.approx(800.0)
    assert cashier.get_bill([4], [10]) == pytest.approx(4000.0)
    assert cashier.get_bill([7, 3], [10, 10]) == pytest.approx(4000.0)
    assert cashier.get_bill([7, 5, 3, 1, 6, 4, 2], [10, 10, 10, 9, 9, 9, 7]) == pytest.approx(7350.0)


def test_cashier_n_one_discounts_every_bill():
    cashier = Cashier(1, 10, [5], [40])
    assert cashier.get_bill([5], [2]) == pytest.approx(72.0)
    assert cashier.get_bill([5], [1]) == pytest.approx(36.0)


def test_cashier_zero_discount():
    cashier = Cashier(2, 0, [1, 2], [3, 4])
    assert cashier.get_bill([1], [1]) == pytest.approx(3.0)
    assert cashier.get_bill([2], [2]) == pytest.approx(8.0)


def test_cashier_full_discount_is_free():
    cashier = Cashier(2, 100, [9], [50])
    assert cashier.get_bill([9], [1]) == pytest.approx(50.0)
    assert cashier.get_bill([9], [3]) == pytest.approx(0.0)
