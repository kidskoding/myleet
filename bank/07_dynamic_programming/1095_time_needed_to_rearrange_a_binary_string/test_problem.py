from solution import seconds_to_remove_occurrences


def test_seconds_to_remove_occurrences_example():
    assert seconds_to_remove_occurrences("0110101") == 4


def test_seconds_to_remove_occurrences_already_sorted():
    assert seconds_to_remove_occurrences("11100") == 0


def test_seconds_to_remove_occurrences_single_char():
    assert seconds_to_remove_occurrences("0") == 0
    assert seconds_to_remove_occurrences("1") == 0


def test_seconds_to_remove_occurrences_one_swap():
    assert seconds_to_remove_occurrences("01") == 1


def test_seconds_to_remove_occurrences_one_crosses_many_zeros():
    assert seconds_to_remove_occurrences("0001") == 3


def test_seconds_to_remove_occurrences_ones_block_each_other():
    assert seconds_to_remove_occurrences("0011") == 3
