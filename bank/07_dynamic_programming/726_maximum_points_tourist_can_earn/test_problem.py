from solution import max_score


def test_max_score_example_one_day():
    assert max_score(2, 1, [[2, 3]], [[0, 2], [1, 0]]) == 3


def test_max_score_example_stay_then_travel():
    assert max_score(3, 2, [[3, 4, 2], [2, 1, 2]], [[0, 2, 1], [2, 0, 4], [3, 2, 0]]) == 8


def test_max_score_single_city_always_stays():
    assert max_score(1, 3, [[5], [1], [2]], [[0]]) == 8


def test_max_score_travel_every_day():
    assert max_score(2, 2, [[1, 1], [1, 1]], [[0, 10], [10, 0]]) == 20


def test_max_score_travel_beats_stay_on_single_day():
    assert max_score(2, 1, [[1, 2]], [[0, 5], [0, 0]]) == 5
