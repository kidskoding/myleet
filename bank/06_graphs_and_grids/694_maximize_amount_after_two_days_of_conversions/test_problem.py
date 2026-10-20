import pytest
from solution import max_amount


def test_max_amount_chain_both_days():
    got = max_amount(
        "EUR",
        [["EUR", "USD"], ["USD", "JPY"]],
        [2.0, 3.0],
        [["JPY", "USD"], ["USD", "CHF"], ["CHF", "EUR"]],
        [4.0, 5.0, 6.0],
    )
    assert got == pytest.approx(720.0)


def test_max_amount_inverse_rate_on_day_two():
    assert max_amount("NGN", [["NGN", "EUR"]], [9.0], [["NGN", "EUR"]], [6.0]) == pytest.approx(1.5)


def test_max_amount_no_conversion_needed():
    assert max_amount("USD", [["USD", "EUR"]], [1.0], [["EUR", "JPY"]], [10.0]) == pytest.approx(1.0)


def test_max_amount_start_missing_from_day_two_graph():
    assert max_amount("AAA", [["AAA", "BBB"]], [5.0], [["CCC", "DDD"]], [2.0]) == pytest.approx(1.0)


def test_max_amount_conversion_would_lose_money():
    assert max_amount("A", [["A", "B"]], [2.0], [["A", "B"]], [3.0]) == pytest.approx(1.0)
