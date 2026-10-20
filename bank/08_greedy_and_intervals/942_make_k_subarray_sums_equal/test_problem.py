from solution import make_sub_k_sum_equal


def test_make_sub_k_sum_equal_alternating_groups():
    assert make_sub_k_sum_equal([1, 4, 1, 3], 2) == 1


def test_make_sub_k_sum_equal_coprime_makes_all_equal():
    assert make_sub_k_sum_equal([2, 5, 5, 7], 3) == 5


def test_make_sub_k_sum_equal_k_equals_length():
    assert make_sub_k_sum_equal([9, 1, 4], 3) == 0


def test_make_sub_k_sum_equal_k_one():
    assert make_sub_k_sum_equal([1, 2, 3], 1) == 2


def test_make_sub_k_sum_equal_single_element():
    assert make_sub_k_sum_equal([10], 1) == 0


def test_make_sub_k_sum_equal_three_groups():
    assert make_sub_k_sum_equal([1, 5, 9, 3, 5, 6], 3) == 5
