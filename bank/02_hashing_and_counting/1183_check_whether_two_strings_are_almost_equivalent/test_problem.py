from solution import check_almost_equivalent


def test_check_almost_equivalent_false():
    assert check_almost_equivalent("aaaa", "bccb") is False


def test_check_almost_equivalent_true():
    assert check_almost_equivalent("abcdeef", "abaaacc") is True


def test_check_almost_equivalent_example_three():
    assert check_almost_equivalent("cccddabba", "babababab") is True


def test_check_almost_equivalent_identical():
    assert check_almost_equivalent("abc", "abc") is True


def test_check_almost_equivalent_edge_gap():
    assert check_almost_equivalent("aaaa", "aaab") is True
