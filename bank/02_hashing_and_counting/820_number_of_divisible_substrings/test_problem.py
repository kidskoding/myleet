from solution import count_divisible_substrings


def test_count_divisible_substrings_example_asdf():
    assert count_divisible_substrings("asdf") == 6


def test_count_divisible_substrings_example_bdh():
    assert count_divisible_substrings("bdh") == 4


def test_count_divisible_substrings_example_abcd():
    assert count_divisible_substrings("abcd") == 6


def test_count_divisible_substrings_single_letter():
    assert count_divisible_substrings("q") == 1


def test_count_divisible_substrings_same_value_letters():
    assert count_divisible_substrings("xyz") == 6


def test_count_divisible_substrings_mixed():
    assert count_divisible_substrings("azbycx") == 12
