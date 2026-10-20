from solution import plates_between_candles


def test_plates_between_candles_example_one():
    assert plates_between_candles("**|**|***|", [[2, 5], [5, 9]]) == [2, 3]


def test_plates_between_candles_example_two():
    s = "***|**|*****|**||**|*"
    queries = [[1, 17], [4, 5], [14, 17], [5, 11], [15, 16]]
    assert plates_between_candles(s, queries) == [9, 0, 0, 0, 0]


def test_plates_between_candles_single_plate():
    assert plates_between_candles("|*|", [[0, 2], [0, 1], [1, 1]]) == [1, 0, 0]


def test_plates_between_candles_no_candles():
    assert plates_between_candles("***", [[0, 2]]) == [0]


def test_plates_between_candles_only_candles():
    assert plates_between_candles("|||", [[0, 2], [1, 1]]) == [0, 0]
