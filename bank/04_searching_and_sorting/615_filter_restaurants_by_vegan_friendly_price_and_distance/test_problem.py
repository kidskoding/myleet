from solution import filter_restaurants

RESTAURANTS = [[1, 4, 1, 40, 10], [2, 8, 0, 50, 5], [3, 8, 1, 30, 4], [4, 10, 0, 10, 3], [5, 1, 1, 15, 1]]


def test_filter_restaurants_vegan_only():
    assert filter_restaurants(RESTAURANTS, 1, 50, 10) == [3, 1, 5]


def test_filter_restaurants_vegan_filter_off():
    assert filter_restaurants(RESTAURANTS, 0, 50, 10) == [4, 3, 2, 1, 5]


def test_filter_restaurants_tight_price_and_distance():
    assert filter_restaurants(RESTAURANTS, 0, 30, 3) == [4, 5]


def test_filter_restaurants_none_match():
    assert filter_restaurants(RESTAURANTS, 1, 5, 10) == []


def test_filter_restaurants_rating_tie_breaks_by_id():
    assert filter_restaurants([[1, 5, 1, 10, 10], [2, 5, 1, 10, 10]], 1, 10, 10) == [2, 1]
