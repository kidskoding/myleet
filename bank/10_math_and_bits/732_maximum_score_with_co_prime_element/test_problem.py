from solution import max_score


def test_max_score_change_to_new_prime():
    assert max_score([3, 4, 6], 5) == 4


def test_max_score_no_change_needed():
    assert max_score([1, 2, 3], 4) == 3


def test_max_score_change_other_to_one():
    assert max_score([2, 2], 1) == 1


def test_max_score_single_element_kept():
    assert max_score([7], 3) == 7


def test_max_score_single_element_replaced():
    assert max_score([2], 10) == 9


def test_max_score_all_ones():
    assert max_score([1, 1, 1], 1) == 1


def test_max_score_keep_large_value_change_rest():
    assert max_score([6, 10, 15], 1) == 13
