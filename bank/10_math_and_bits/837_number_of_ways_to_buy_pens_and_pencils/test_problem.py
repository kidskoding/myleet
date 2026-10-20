from solution import ways_to_buy_pens_pencils


def test_ways_to_buy_pens_pencils_example_twenty():
    assert ways_to_buy_pens_pencils(20, 10, 5) == 9


def test_ways_to_buy_pens_pencils_example_too_expensive():
    assert ways_to_buy_pens_pencils(5, 10, 10) == 1


def test_ways_to_buy_pens_pencils_unit_prices():
    assert ways_to_buy_pens_pencils(1, 1, 1) == 3


def test_ways_to_buy_pens_pencils_only_pencils_affordable():
    assert ways_to_buy_pens_pencils(9, 10, 3) == 4


def test_ways_to_buy_pens_pencils_large_total():
    assert ways_to_buy_pens_pencils(1000000, 1, 1) == 1000001 * 1000002 // 2
