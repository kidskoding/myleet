from solution import StockSpanner


def test_stock_spanner_increasing_prices():
    spanner = StockSpanner()
    assert spanner.next(100) == 1
    assert spanner.next(80) == 1
    assert spanner.next(60) == 1
    assert spanner.next(70) == 2
    assert spanner.next(60) == 1
    assert spanner.next(75) == 4
    assert spanner.next(85) == 6


def test_stock_spanner_single_call():
    spanner = StockSpanner()
    assert spanner.next(50) == 1
