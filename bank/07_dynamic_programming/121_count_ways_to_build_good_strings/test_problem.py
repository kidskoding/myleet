from solution import count_good_strings

MOD = 10**9 + 7


def test_count_good_strings_all_binary_strings_of_length_three():
    assert count_good_strings(3, 3, 1, 1) == 8


def test_count_good_strings_mixed_block_sizes():
    assert count_good_strings(2, 3, 1, 2) == 5


def test_count_good_strings_impossible_length():
    assert count_good_strings(1, 1, 2, 2) == 0


def test_count_good_strings_range_of_lengths():
    assert count_good_strings(1, 3, 1, 1) == 14
    assert count_good_strings(5, 5, 2, 3) == 2


def test_count_good_strings_takes_modulo():
    assert count_good_strings(1, 100, 1, 1) == (pow(2, 101, MOD) - 2) % MOD
