from solution import maximum_product


def test_maximum_product_small():
    assert maximum_product([0, 4], 5) == 20


def test_maximum_product_spreads_increments():
    assert maximum_product([6, 3, 3, 2], 2) == 216
