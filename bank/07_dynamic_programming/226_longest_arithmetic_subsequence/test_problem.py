from solution import longest_arith_seq_length


def test_longest_arith_seq_length_whole_array():
    assert longest_arith_seq_length([3, 6, 9, 12]) == 4


def test_longest_arith_seq_length_skips_elements():
    assert longest_arith_seq_length([9, 4, 7, 2, 10]) == 3


def test_longest_arith_seq_length_negative_difference():
    assert longest_arith_seq_length([20, 1, 15, 3, 10, 5, 8]) == 4


def test_longest_arith_seq_length_two_elements():
    assert longest_arith_seq_length([1, 7]) == 2


def test_longest_arith_seq_length_zero_difference():
    assert longest_arith_seq_length([5, 5, 5, 5]) == 4


def test_longest_arith_seq_length_interleaved():
    assert longest_arith_seq_length([1, 5, 2, 9, 3, 13, 4]) == 4
