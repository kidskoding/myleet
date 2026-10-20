from solution import StockPrice


def test_stock_price_tracks_current_and_extremes():
    stock = StockPrice()
    stock.update(1, 10)
    stock.update(2, 5)

    assert stock.current() == 5
    assert stock.maximum() == 10


def test_stock_price_corrects_a_record():
    stock = StockPrice()
    stock.update(1, 10)
    stock.update(2, 5)
    stock.update(1, 3)

    assert stock.maximum() == 5
    assert stock.minimum() == 3
