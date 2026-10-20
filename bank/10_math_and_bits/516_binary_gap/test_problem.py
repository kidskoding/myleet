from solution import binary_gap


def test_binary_gap_example():
    assert binary_gap(22) == 2


def test_binary_gap_single_one_bit():
    assert binary_gap(8) == 0


def test_binary_gap_ones_at_ends():
    assert binary_gap(5) == 2


def test_binary_gap_one():
    assert binary_gap(1) == 0


def test_binary_gap_adjacent_ones():
    assert binary_gap(6) == 1


def test_binary_gap_wide():
    assert binary_gap(65) == 6
