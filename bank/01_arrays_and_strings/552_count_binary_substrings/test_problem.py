from solution import count_binary_substrings


def test_count_binary_substrings_repeating_blocks():
    assert count_binary_substrings("00110011") == 6


def test_count_binary_substrings_alternating():
    assert count_binary_substrings("10101") == 4


def test_count_binary_substrings_single_char():
    assert count_binary_substrings("0") == 0


def test_count_binary_substrings_one_boundary():
    assert count_binary_substrings("000111") == 3


def test_count_binary_substrings_growing_runs():
    assert count_binary_substrings("0110001111") == 6
