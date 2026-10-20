from solution import max_taxi_earnings


def test_max_taxi_earnings_example_one():
    assert max_taxi_earnings(5, [[2, 5, 4], [1, 5, 1]]) == 7


def test_max_taxi_earnings_example_two():
    rides = [[1, 6, 1], [3, 10, 2], [10, 12, 3], [11, 12, 2], [12, 15, 2], [13, 18, 1]]
    assert max_taxi_earnings(20, rides) == 20


def test_max_taxi_earnings_back_to_back_rides():
    assert max_taxi_earnings(10, [[1, 5, 0], [5, 10, 0]]) == 9


def test_max_taxi_earnings_big_tip_beats_long_ride():
    assert max_taxi_earnings(10, [[1, 10, 0], [2, 3, 100]]) == 101


def test_max_taxi_earnings_single_ride():
    assert max_taxi_earnings(2, [[1, 2, 0]]) == 1
