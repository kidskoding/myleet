from solution import shopping_offers


def test_shopping_offers_example_one():
    assert shopping_offers([2, 5], [[3, 0, 5], [1, 2, 10]], [3, 2]) == 14


def test_shopping_offers_example_two():
    assert shopping_offers([2, 3, 4], [[1, 1, 0, 4], [2, 2, 1, 9]], [1, 2, 1]) == 11


def test_shopping_offers_no_needs():
    assert shopping_offers([2, 5], [[1, 1, 1]], [0, 0]) == 0


def test_shopping_offers_offer_worse_than_list():
    assert shopping_offers([1, 1], [[1, 1, 5]], [2, 2]) == 4


def test_shopping_offers_cannot_overshoot():
    # The offer would give 2 of item 0, but only 1 is needed.
    assert shopping_offers([10], [[2, 1]], [1]) == 10


def test_shopping_offers_repeat_offer():
    assert shopping_offers([5, 5], [[1, 1, 3]], [3, 3]) == 9
