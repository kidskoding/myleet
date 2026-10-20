from solution import max_envelopes


def test_max_envelopes_normal():
    assert max_envelopes([[5, 4], [6, 4], [6, 7], [2, 3]]) == 3


def test_max_envelopes_all_identical():
    assert max_envelopes([[1, 1], [1, 1], [1, 1]]) == 1
