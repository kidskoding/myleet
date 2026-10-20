from solution import min_length


def test_min_length_one_flip():
    assert min_length("000001", 1) == 2


def test_min_length_alternate_fully():
    assert min_length("0000", 2) == 1


def test_min_length_already_alternating():
    assert min_length("0101", 0) == 1


def test_min_length_single_char():
    assert min_length("1", 0) == 1


def test_min_length_split_long_run():
    assert min_length("000000", 1) == 3


def test_min_length_no_ops():
    assert min_length("00110011", 0) == 2


def test_min_length_alternating_needs_odd_pattern():
    assert min_length("1001", 2) == 1
