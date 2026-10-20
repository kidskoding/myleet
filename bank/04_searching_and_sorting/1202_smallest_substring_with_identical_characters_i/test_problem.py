from solution import min_length


def test_min_length_split_long_run():
    assert min_length("000001", 1) == 2


def test_min_length_full_alternation():
    assert min_length("0000", 2) == 1


def test_min_length_no_operations_needed():
    assert min_length("0101", 0) == 1


def test_min_length_no_operations_allowed():
    assert min_length("0011100", 0) == 3


def test_min_length_single_character():
    assert min_length("1", 0) == 1


def test_min_length_alternation_needs_too_many():
    assert min_length("0110", 1) == 2


def test_min_length_two_runs():
    assert min_length("000000111111", 2) == 3
