from solution import max_score_sightseeing_pair


def test_max_score_sightseeing_pair_example():
    assert max_score_sightseeing_pair([8, 1, 5, 2, 6]) == 11


def test_max_score_sightseeing_pair_two_spots():
    assert max_score_sightseeing_pair([1, 2]) == 2


def test_max_score_sightseeing_pair_all_equal():
    assert max_score_sightseeing_pair([1, 1, 1]) == 1


def test_max_score_sightseeing_pair_far_apart_wins():
    assert max_score_sightseeing_pair([10, 1, 1, 10]) == 17


def test_max_score_sightseeing_pair_increasing():
    assert max_score_sightseeing_pair([1, 3, 5]) == 7
