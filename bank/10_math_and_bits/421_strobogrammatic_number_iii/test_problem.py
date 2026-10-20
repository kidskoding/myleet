from solution import strobogrammatic_in_range


def test_strobogrammatic_in_range_two_digit():
    assert strobogrammatic_in_range("50", "100") == 3


def test_strobogrammatic_in_range_zero_only():
    assert strobogrammatic_in_range("0", "0") == 1


def test_strobogrammatic_in_range_none():
    assert strobogrammatic_in_range("2", "5") == 0


def test_strobogrammatic_in_range_up_to_thousand():
    assert strobogrammatic_in_range("0", "1000") == 19


def test_strobogrammatic_in_range_boundaries_inclusive():
    assert strobogrammatic_in_range("69", "69") == 1
    assert strobogrammatic_in_range("69", "96") == 3


def test_strobogrammatic_in_range_multi_length():
    assert strobogrammatic_in_range("100", "10000") == 32


def test_strobogrammatic_in_range_large():
    assert strobogrammatic_in_range("0", "1000000000000000") == 312499
